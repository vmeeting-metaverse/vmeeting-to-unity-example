import jwtDecode from 'jwt-decode';
import { vmeetingAPI } from './api';
import { getConnectionOptions, roomOptions } from './options';
import {
  VmeetingTrackLocalAudio,
  VmeetingTrackLocalVideo,
  VmeetingTrackRemoteAudio,
  VmeetingTrackRemoteVideo,
} from './track';
import { JitsiConference, JitsiConnection, JitsiParticipant, JitsiTrack } from './types';
import { VmeetingMe, VmeetingUser } from './user';
import { Mutex } from 'async-mutex';

export type VmeetingConferenceEventListener = {
  ON_PARTICIPANTS_CHANGED: (participants: Map<string, VmeetingUser>) => void;
  ON_ROOMS_CHANGED: (rooms: Map<string, string[]>) => void;
  ON_PRESENTERS_CHANGED: (presenters: string[]) => void;
};

export type VmeetingConferenceEvent = keyof VmeetingConferenceEventListener;

let cnt = 0;

export class VmeetingConference {
  _conference: JitsiConference;
  _connection: JitsiConnection;

  participants: Map<string, VmeetingUser>;
  rooms: Map<string, string[]>;
  roomsMutex: Mutex;
  presenters: string[];
  presentersMutex: Mutex;
  roomname?: string;

  listeners: {
    [property in VmeetingConferenceEvent]: {
      origin: any;
      listener: any;
    }[];
  };

  constructor() {
    this.participants = new Map();
    this.rooms = new Map();
    this.roomsMutex = new Mutex();
    this.presenters = [];
    this.presentersMutex = new Mutex();

    this._conference = undefined;
    this._connection = undefined;

    this.listeners = {
      'ON_PARTICIPANTS_CHANGED': [],
      'ON_PRESENTERS_CHANGED': [],
      'ON_ROOMS_CHANGED': []
    }
  }

  async enter({ name, jwt, me }: { name: string; jwt: string; me: VmeetingMe }) {
    try {
      await new Promise((resolve, reject) => {
        // * 1. create connection
        const connectionConfig = getConnectionOptions(name, jwt);
        const connection = new vmeetingAPI._jitsi.JitsiConnection(null, null, connectionConfig);

        const onConnectionSuccess = () => {
          resolve('Connection Success!');
        };

        const onConnectionFailed = () => {
          reject('Connection Failed');
        };

        const onDisconnected = () => {
          reject('Disconnected!');
        };

        connection.addEventListener(vmeetingAPI._jitsi.events.connection.CONNECTION_ESTABLISHED, onConnectionSuccess);
        connection.addEventListener(vmeetingAPI._jitsi.events.connection.CONNECTION_FAILED, onConnectionFailed);
        connection.addEventListener(vmeetingAPI._jitsi.events.connection.CONNECTION_DISCONNECTED, onDisconnected);

        this._connection = connection;
        connection.connect();
      });
    } catch (e) {
      return e;
    }
    return new Promise((resolve) => {
      const conference: JitsiConference = this._connection.initJitsiConference(name, roomOptions);
      this._conference = conference;

      // set user display name to user.id
      conference.setDisplayName((jwtDecode(jwt) as { context: { user: { id: string } } }).context.user.id);

      const onOtherJoin = (pId: string, p: JitsiParticipant) => {
        const newPs = new Map<string, VmeetingUser>();
        this.participants.forEach((p, id) => {
            newPs.set(id, p);
        });
        newPs.set(pId, new VmeetingUser({ id: pId, vmeetingId: p._displayName, isMe: pId === conference.myUserId() }));
        this.setParticipants(newPs);
      };

      const onOtherLeft = (pId: string) => {
        const newPs = new Map<string, VmeetingUser>();
        this.participants.forEach((p, id) => {
          if (id !== pId) {
            newPs.set(id, p);
          }
        });
        this.setParticipants(newPs);
      };

      const onTrackAdded = (track: JitsiTrack) => {
        const pId = track.getParticipantId();
        const p = this.participants.get(pId);
        if (!p) return;
        const newP = new VmeetingUser({ id: p.id, vmeetingId: p.vmeetingId, audio: p.audio, video: p.video, isMe: false });
        switch (track.getType()) {
          case 'video':
            if (newP.video) 
              newP.video.deconstructor();
            newP.video = new VmeetingTrackRemoteVideo({ track });
            break;
          case 'audio':
            if (newP.audio)
              newP.audio.deconstructor();
            newP.audio = new VmeetingTrackRemoteAudio({ track });
            break;
          default:
            break;
        }
        const newPs = new Map<string, VmeetingUser>();
        this.participants.forEach((p, id) => {
          if (id === pId) {
            newPs.set(id, newP);
          } else {
            newPs.set(id, p);
          }
        });
        this.setParticipants(newPs);
      };

      const onTrackRemoved = (track: JitsiTrack) => {
        const pId = track.getParticipantId();
        const p = this.participants.get(pId);
        if (!p) return;
        const newP = new VmeetingUser({ id: p.id, vmeetingId: p.vmeetingId, audio: p.audio, video: p.video, isMe: false });
        switch (track.getType()) {
          case 'video':
            newP.video?.deconstructor();
            newP.video = undefined;
            break;
          case 'audio':
            newP.audio?.deconstructor();
            newP.audio = undefined;
            break;
          default:
            break;
        }
        const newPs = new Map<string, VmeetingUser>();
        this.participants.forEach((p, id) => {
          if (id === pId) {
            newPs.set(id, newP);
          } else {
            newPs.set(id, p);
          }
        });
        this.setParticipants(newPs);
      };

      const onEnterRoom = async ({ attributes: { name, pId } }: { attributes: { name: string; pId: string } }) => {
        if (pId === this._conference.myUserId()) return;
        const release = await this.roomsMutex.acquire();
        const newRooms = new Map<string, string[]>();
        this.rooms.forEach((room, roomname) => {
          if (roomname === name) {
            newRooms.set(roomname, [...room, pId]);
          } else {
            newRooms.set(roomname, [...room]);
          }
        });
        if (!newRooms.get(name)) {
          newRooms.set(name, [pId]);
        }
        this.setRooms(newRooms);
        release();
      };

      const onExitRoom = async ({ attributes: { name, pId } }: { attributes: { name: string; pId: string } }) => {
        if (pId === this._conference.myUserId()) return;
        const release = await this.roomsMutex.acquire();
        const room = this.rooms.get(name);
        if (room) {
          if (room.includes(pId)) {
            const newRooms = new Map<string, string[]>();
            this.rooms.forEach((room, roomname) => {
              if (roomname === name) {
                newRooms.set(roomname, room.filter((id) => id !== pId));
              } else {
                newRooms.set(roomname, [...room]);
              }
            })
            this.setRooms(newRooms);
          }
        }
        release();
      };

      const onEnterPlatform = async ({ attributes: { pId } }: { attributes: { pId: string } }) => {
        if (pId === this._conference.myUserId()) return;
        const release = await this.presentersMutex.acquire();
        if (!this.presenters.includes(pId)) {
          this.setPresenters([...this.presenters, pId]);
        }
        release();
      };

      const onExitPlatform = async ({ attributes: { pId } }: { attributes: { pId: string } }) => {
        if (pId === this._conference.myUserId()) return;
        const release = await this.presentersMutex.acquire();
        if (this.presenters.includes(pId)) {
          this.setPresenters(this.presenters.filter((id) => id !== pId));
        }
        release();
      };

      const onAudioChange = async (oldAudio: VmeetingTrackLocalAudio, newAudio: VmeetingTrackLocalAudio) => {
        if (oldAudio) {
          await conference.removeTrack(oldAudio._track);
        }
        conference.addTrack(newAudio._track);
      };

      const onVideoChange = async (oldVideo: VmeetingTrackLocalVideo, newVideo: VmeetingTrackLocalVideo) => {
        if (oldVideo) {
          await conference.removeTrack(oldVideo._track);
        }
        conference.addTrack(newVideo._track);
      };

      const onJoined = () => {
        console.log("JOINED");
        me.subscribe('ON_AUDIO_CHANGED', onAudioChange);
        me.subscribe('ON_VIDEO_CHANGED', onVideoChange);

        // * 5. add local track.
        if (me.audio?._track) {
          conference.addTrack(me.audio._track);
        }
        if (me.video?._track) {
          conference.addTrack(me.video._track);
        }
        resolve('Success Enter Conference');
      };

      const onLeft = () => {
        conference.off(vmeetingAPI._jitsi.events.conference.CONFERENCE_JOINED, onJoined);
        conference.off(vmeetingAPI._jitsi.events.conference.CONFERENCE_LEFT, onLeft);
        conference.off(window.JitsiMeetJS.events.conference.USER_JOINED, onOtherJoin);
        conference.off(window.JitsiMeetJS.events.conference.USER_LEFT, onOtherLeft);
        conference.off(window.JitsiMeetJS.events.conference.TRACK_ADDED, onTrackAdded);
        conference.off(window.JitsiMeetJS.events.conference.TRACK_REMOVED, onTrackRemoved);

        conference.removeCommandListener('ENTER_ROOM', onEnterRoom);
        conference.removeCommandListener('EXIT_ROOM', onExitRoom);
        conference.removeCommandListener('ENTER_PLATFORM', onEnterPlatform);
        conference.removeCommandListener('EXIT_PLATFORM', onExitPlatform);
      };

      conference.on(vmeetingAPI._jitsi.events.conference.CONFERENCE_JOINED, onJoined);
      conference.on(vmeetingAPI._jitsi.events.conference.CONFERENCE_LEFT, onLeft);
      conference.on(window.JitsiMeetJS.events.conference.USER_JOINED, onOtherJoin);
      conference.on(window.JitsiMeetJS.events.conference.USER_LEFT, onOtherLeft);
      conference.on(window.JitsiMeetJS.events.conference.TRACK_ADDED, onTrackAdded);
      conference.on(window.JitsiMeetJS.events.conference.TRACK_REMOVED, onTrackRemoved);

      conference.addCommandListener('ENTER_ROOM', onEnterRoom);
      conference.addCommandListener('EXIT_ROOM', onExitRoom);
      conference.addCommandListener('ENTER_PLATFORM', onEnterPlatform);
      conference.addCommandListener('EXIT_PLATFORM', onExitPlatform);

      conference.join();
    });
  }

  async exit() {
    if (this.roomname) {
      this.exitRoom(this.roomname);
    }
    if (this.presenters.includes(this._conference.myUserId())) {
      this.exitPlatform();
    }
    if (this._conference)
      await this._conference.leave();
    if (this._connection)
      await this._connection.disconnect();
    this._conference = undefined;
    this._connection = undefined;
    this.participants = new Map();
    this.presenters = [];
    this.rooms = new Map();
  }

  enterRoom(name: string) {
    this._conference.sendCommand('ENTER_ROOM', {
      value: cnt++,
      attributes: { name, pId: this._conference.myUserId() },
    });
    this.roomname = name;
  }

  exitRoom(name: string) {
    this._conference.sendCommand('EXIT_ROOM', {
      value: cnt++,
      attributes: { name, pId: this._conference.myUserId() },
    });
    this.roomname = undefined;
  }

  enterPlatform() {
    this._conference.sendCommand('ENTER_PLATFORM', {
      value: cnt++,
      attributes: { pId: this._conference.myUserId() },
    });
  }

  exitPlatform() {
    this._conference.sendCommand('EXIT_PLATFORM', {
      value: cnt++,
      attributes: { pId: this._conference.myUserId() },
    });
  }


  subscribe<T extends VmeetingConferenceEvent>(subject: T, cb: VmeetingConferenceEventListener[T]) {
    
    this.listeners[subject].push({
      origin: cb,
      listener: cb,
    });
  }

  unsubscribe<T extends VmeetingConferenceEvent>(subject: T, cb: VmeetingConferenceEventListener[T]) {
    const idx = this.listeners[subject].findIndex((l) => {
      l.origin === cb;
    });
    if (idx > -1) {
      this.listeners = {
        ...this.listeners,
        [subject]: this.listeners[subject].filter((_, index) => index !== idx),
      };
    }
  }

  setParticipants(participants: Map<string, VmeetingUser>) {
    this.participants = participants;
    this.listeners.ON_PARTICIPANTS_CHANGED.forEach((l) => {
      l.listener(participants);
    });
  }

  setPresenters(presenters: string[]) {
    this.presenters = presenters;
    this.listeners.ON_PRESENTERS_CHANGED.forEach((l) => {
      l.listener(presenters);
    });
  }

  setRooms(rooms: Map<string, string[]>) {
    this.rooms = rooms;
    this.listeners.ON_ROOMS_CHANGED.forEach((l) => {
      l.listener(rooms);
    })
  }
}