/* eslint-disable @typescript-eslint/no-explicit-any */
import { VmeetingMe, VmeetingUser } from "./user";
import { JitsiConference, JitsiConnection, JitsiTrack } from "./types";
import _, { isArray } from "lodash";
import { vmeetingAPI } from "./api";
import { getConnectionOptions, roomOptions } from "./options";
import {
  VmeetingTrackLocalAudio,
  VmeetingTrackLocalVideo,
  VmeetingTrackRemoteAudio,
  VmeetingTrackRemoteVideo,
} from "./track";

export type VmeetingRoomEventListener = {
  ON_PARTICIPANTS_CHANGED: (participants: Map<string, VmeetingUser>) => void;
};

export type VmeetingRoomEvent = keyof VmeetingRoomEventListener;

export class VmeetingRoom {
  participants: Map<string, VmeetingUser>;
  name: string;
  listeners: {
    [property in VmeetingRoomEvent]: {
      origin: any;
      listener: any;
    }[];
  };
  _connection: JitsiConnection;
  _conference: JitsiConference;
  constructor({ name }: { name: string }) {
    this.participants = new Map();
    this.name = name;
    this.listeners = {
      ON_PARTICIPANTS_CHANGED: [],
    };
    this._connection = undefined;
    this._conference = undefined;
  }

  enter({ jwt, me }: { jwt: string; me: VmeetingMe }) {
    return new Promise((resolve, reject) => {
      // * 1. create connection.
      const connectionConfig = getConnectionOptions(this.name, jwt);
      const connection = new vmeetingAPI._jitsi.JitsiConnection(
        null,
        null,
        connectionConfig
      );

      // * 2. declare onConnectionSuccessMethod
      const onConnectionSuccess = () => {
        console.info("Connection Success!");
        const conference: JitsiConference = connection.initJitsiConference(
          this.name,
          roomOptions
        );
        this._conference = conference;

        // * 3. subscribe user event
        conference.on(
          window.JitsiMeetJS.events.conference.USER_LEFT,
          (id: string) => {
            const newParticipants = _.cloneDeep(this.participants);
            newParticipants.delete(id);
            this.setParticipants(newParticipants);
          }
        );
        conference.on(
          window.JitsiMeetJS.events.conference.USER_JOINED,
          (id: string) => {
            const newParticipants = _.cloneDeep(this.participants);
            newParticipants.set(
              id,
              new VmeetingUser({ id, isMe: id === conference.myUserId() })
            );
            this.setParticipants(newParticipants);
          }
        );
        conference.on(
          window.JitsiMeetJS.events.conference.TRACK_REMOVED,
          (track: JitsiTrack) => {
            if (track.isLocal()) return;
            const participantId = track.getParticipantId();
            const newParticipants = _.cloneDeep(this.participants);
            const participant = newParticipants.get(participantId);
            if (!participant) return;
            if (track.getType() === "video") {
              participant.video = undefined;
            } else if (track.getType() === "audio") {
              participant.audio = undefined;
            }
            this.setParticipants(newParticipants);
          }
        );
        conference.on(
          window.JitsiMeetJS.events.conference.TRACK_ADDED,
          (track: JitsiTrack) => {
            if (track.isLocal()) return;
            const participantId = track.getParticipantId();
            const newParticipants = _.cloneDeep(this.participants);
            const participant = newParticipants.get(participantId);
            if (!participant) return;
            if (track.getType() === "video") {
              participant.video = new VmeetingTrackRemoteVideo({ track });
            } else if (track.getType() === "audio") {
              participant.audio = new VmeetingTrackRemoteAudio({ track });
            }
            this.setParticipants(newParticipants);
          }
        );

        // * 4. join the room
        conference.join();

        // * 5. add local change subscription
        const onAudioChange = async (
          oldAudio: VmeetingTrackLocalAudio,
          newAudio: VmeetingTrackLocalAudio
        ) => {
          if (oldAudio) {
            await conference.removeTrack(oldAudio._track);
            await oldAudio.deconstructor();
          }
          conference.addTrack(newAudio._track);
        };
        me.subscribe("ON_AUDIO_CHANGED", onAudioChange);
        const onVideoChange = async (
          oldVideo: VmeetingTrackLocalVideo,
          newVideo: VmeetingTrackLocalVideo
        ) => {
          if (oldVideo) {
            await conference.removeTrack(oldVideo._track);
            await oldVideo.deconstructor();
          }
          conference.addTrack(newVideo._track);
        };
        me.subscribe("ON_VIDEO_CHANGED", onVideoChange);

        // * 6. add local track.
        if (me.audio?._track) {
          conference.addTrack(me.audio._track);
        }
        if (me.video?._track) {
          conference.addTrack(me.video._track);
        }

        const onConferenceLeft = () => {
          me.unsubscribe("ON_AUDIO_CHANGED", onAudioChange);
          me.unsubscribe("ON_VIDEO_CHANGED", onVideoChange);
        };

        conference.addEventListener(
          vmeetingAPI._jitsi.events.conference.CONFERENCE_LEFT,
          onConferenceLeft
        );

        // * 7. subscribe ondisconnected for removing subscription in me.
        const onDisconnected = () => {
          connection.removeEventListener(
            vmeetingAPI._jitsi.events.connection.CONNECTION_DISCONNECTED,
            onDisconnected
          );
          conference.removeEventListener(
            vmeetingAPI._jitsi.events.conference.CONFERENCE_LEFT,
            onConferenceLeft
          );
        };
        connection.addEventListener(
          vmeetingAPI._jitsi.events.connection.CONNECTION_DISCONNECTED,
          onDisconnected
        );

        // * 8. delete my event listener.
        connection.removeEventListener(
          vmeetingAPI._jitsi.events.connection.CONNECTION_ESTABLISHED,
          onConnectionSuccess
        );
        resolve("success");
      };

      const onConnectionFailed = () => {
        console.error("Connection Failed!");
        reject("Connection Failed!");
      };

      const disconnect = () => {
        console.log("disconnect!");
        connection.removeEventListener(
          vmeetingAPI._jitsi.events.connection.CONNECTION_ESTABLISHED,
          onConnectionSuccess
        );
        connection.removeEventListener(
          vmeetingAPI._jitsi.events.connection.CONNECTION_FAILED,
          onConnectionFailed
        );
        connection.removeEventListener(
          vmeetingAPI._jitsi.events.connection.CONNECTION_DISCONNECTED,
          disconnect
        );
      };

      connection.addEventListener(
        vmeetingAPI._jitsi.events.connection.CONNECTION_ESTABLISHED,
        onConnectionSuccess
      );
      connection.addEventListener(
        vmeetingAPI._jitsi.events.connection.CONNECTION_FAILED,
        onConnectionFailed
      );
      connection.addEventListener(
        vmeetingAPI._jitsi.events.connection.CONNECTION_DISCONNECTED,
        disconnect
      );
      connection.connect();
    });
  }

  async exit() {
    if (this._conference) await this._conference?.leave();
    if (this._connection) await this._connection?.disconnect();
    this._conference = undefined;
    this._connection = undefined;
  }

  subscribe<T extends VmeetingRoomEvent>(
    subject: T,
    cb: VmeetingRoomEventListener[T]
  ) {
    let listener;
    switch (subject) {
      case "ON_PARTICIPANTS_CHANGED":
        listener = (participants: Map<string, VmeetingUser>) => {
          cb(participants);
        };
        break;
      default:
        break;
    }
    this.listeners[subject]?.push({
      origin: cb,
      listener: listener,
    });
  }

  unsubscribe<T extends VmeetingRoomEvent>(
    subject: T,
    cb: VmeetingRoomEventListener[T]
  ) {
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
}

export type VmeetingAuditoriumEventListener = VmeetingRoomEventListener & {
  ON_CHANGE_PLATFORM_OCCUPIER: (occupier?: VmeetingUser) => void;
};

export type VmeetingAuditoriumEvent = keyof VmeetingAuditoriumEventListener;

export class VmeetingAudiotorium extends VmeetingRoom {
  occupier?: VmeetingUser;
  listeners: {
    [property in VmeetingAuditoriumEvent]: {
      origin: any;
      listener: any;
    }[];
  };

  constructor({ name }: { name: string }) {
    super({ name });
    this.listeners = {
      ON_PARTICIPANTS_CHANGED: [],
      ON_CHANGE_PLATFORM_OCCUPIER: [],
    };
    this.occupier = undefined;
  }

  subscribe<T extends VmeetingAuditoriumEvent>(
    subject: T,
    cb: VmeetingAuditoriumEventListener[T]
  ) {
    let listener;

    switch (subject) {
      case "ON_PARTICIPANTS_CHANGED":
        listener = (participants: any) => {
          cb(participants);
        };
        break;
      case "ON_CHANGE_PLATFORM_OCCUPIER":
        listener = (values: any) => {
          switch (values.tagName) {
            case "ON_OCCUPY_THE_PLATFORM":
              const participantId = values.value;
              let occupier: VmeetingUser | undefined;
              if (participantId === this._conference.myUserId()) {
                const videos = this._conference
                  .getLocalTracks()
                  .filter((t: JitsiTrack) => t.getType() === "video");
                const audios = this._conference
                  .getLocalTracks()
                  .filter((t: JitsiTrack) => t.getType() === "audio");
                occupier = new VmeetingUser({
                  id: participantId,
                  video:
                    (isArray(videos) &&
                      videos.length > 0 &&
                      new VmeetingTrackRemoteVideo({ track: videos[0] })) ||
                    undefined,
                  audio:
                    (isArray(audios) &&
                      audios.length > 0 &&
                      new VmeetingTrackRemoteAudio({ track: audios[0] })) ||
                    undefined,
                  isMe: true,
                });
              } else {
                const participants = this._conference.getParticipants();
                const pIdx = participants.findIndex(
                  (e: any) => e._id === participantId
                );
                if (pIdx > -1) {
                  const participant = participants[pIdx];
                  const videos = participant.getTracksByMediaType("video");
                  const audios = participant.getTracksByMediaType("audio");

                  occupier = new VmeetingUser({
                    id: participantId,
                    video:
                      (isArray(videos) &&
                        videos.length > 0 &&
                        new VmeetingTrackRemoteVideo({ track: videos[0] })) ||
                      undefined,
                    audio:
                      (isArray(audios) &&
                        audios.length > 0 &&
                        new VmeetingTrackRemoteAudio({ track: audios[0] })) ||
                      undefined,
                    isMe: false,
                  });
                }
              }

              if (!occupier) {
                console.log(`This participant is not exist, ${participantId}`);
                return;
              }

              this.setOccupier(occupier);
              break;
            case "ON_EMPTY_THE_PLATFORM":
              this.setOccupier(undefined);
              break;
          }
          cb(this.occupier as any);
        };

        this._conference.addCommandListener("ON_OCCUPY_THE_PLATFORM", listener);
        this._conference.addCommandListener("ON_EMPTY_THE_PLATFORM", listener);
        this.subscribe("ON_PARTICIPANTS_CHANGED", (participants) => {
          if (this.occupier) {
            const newOccupier = participants.get(this.occupier.id);
            if (
              newOccupier &&
              (newOccupier.audio?._track.getTrackId() !==
                this.occupier.audio?._track.getTrackId() ||
                newOccupier.video?._track.getTrackId() !==
                  this.occupier.video?._track.getTrackId())
            ) {
              this.setOccupier(newOccupier);
              cb(this.occupier as any);
            }
          }
        });

        break;
      default:
        break;
    }
    this.listeners[subject]?.push({
      origin: cb,
      listener: listener,
    });
  }

  unsubscribe<T extends VmeetingAuditoriumEvent>(
    subject: T,
    cb: VmeetingAuditoriumEventListener[T]
  ) {
    const idx = this.listeners[subject].findIndex((l) => {
      l.origin === cb;
    });
    if (idx > -1) {
      switch (subject) {
        case "ON_PARTICIPANTS_CHANGED":
          break;
        case "ON_CHANGE_PLATFORM_OCCUPIER":
          this._conference.removeCommandListener(
            "ON_OCCUPY_THE_PLATFORM",
            this.listeners[subject][idx]
          );
          this._conference.removeCommandListener(
            "ON_EMPTY_THE_PLATFORM",
            this.listeners[subject][idx]
          );
          break;
      }
      this.listeners = {
        ...this.listeners,
        [subject]: this.listeners[subject].filter((_, index) => index !== idx),
      };
    }
  }

  getOnThePlatform() {
    if (this.occupier) {
      return new Error("Platform is already occupied");
    }
    const participantId = this._conference.myUserId();
    this._conference.sendCommandOnce("ON_OCCUPY_THE_PLATFORM", {
      value: participantId,
    });
  }

  getOffThePlatform() {
    if (!this.occupier) {
      return new Error("Platform is already empty");
    }
    const participantId = this._conference.myUserId();
    if (this.occupier.id !== participantId) {
      return new Error("You are not an occupier");
    }
    this._conference.sendCommandOnce("ON_EMPTY_THE_PLATFORM", {
      value: participantId,
    });
  }

  setOccupier(occupier?: VmeetingUser) {
    this.occupier = occupier;
  }
}
