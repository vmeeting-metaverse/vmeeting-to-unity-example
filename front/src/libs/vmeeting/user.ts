/* eslint-disable @typescript-eslint/no-empty-function */
import { vmeetingAPI } from './api';
import { VmeetingTrackAudio, VmeetingTrackLocalAudio, VmeetingTrackLocalVideo, VmeetingTrackVideo } from './track';
import { JitsiMediaDevices, JitsiTrack } from './types';

export class VmeetingUser {
  id: string;
  vmeetingId: string;
  name?: string;
  audio?: VmeetingTrackAudio;
  video?: VmeetingTrackVideo;
  isMe: boolean;
  constructor({
    id,
    vmeetingId,
    name,
    audio,
    video,
    isMe = false,
  }: {
    id: string;
    vmeetingId: string;
    name?: string;
    audio?: VmeetingTrackAudio;
    video?: VmeetingTrackVideo;
    isMe?: boolean;
  }) {
    this.id = id;
    this.vmeetingId = vmeetingId;
    this.name = name;
    this.audio = audio;
    this.video = video;
    this.isMe = isMe;
  }
}

export type VmeetingMeEventListener = {
  ON_VIDEO_CHANGED: (oldVideo: VmeetingTrackLocalVideo, newVideo: VmeetingTrackLocalVideo) => void;
  ON_AUDIO_CHANGED: (oldAudio: VmeetingTrackLocalAudio, newAudio: VmeetingTrackLocalAudio) => void;
};

export type VmeetingMeEvent = keyof VmeetingMeEventListener;

export class VmeetingMe extends VmeetingUser {
  video?: VmeetingTrackLocalVideo;
  audio?: VmeetingTrackLocalAudio;
  devices: JitsiMediaDevices[];
  audioOutputDeviceId?: string;
  listeners: {
    [property in VmeetingMeEvent]: {
      origin: VmeetingMeEventListener[VmeetingMeEvent];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      listener: any;
    }[];
  };

  constructor({
    id,
    vmeetingId,
    name,
    audio,
    video,
  }: {
    id: string;
    vmeetingId: string;
    name?: string;
    audio?: VmeetingTrackLocalAudio;
    video?: VmeetingTrackLocalVideo;
  }) {
    super({ id, vmeetingId, name, isMe: true });
    this.audio = audio;
    this.video = video;
    this.devices = [];
    this.listeners = {
      ON_AUDIO_CHANGED: [],
      ON_VIDEO_CHANGED: [],
    };
  }

  // * return new video track
  changeVideoMode(mode: 'camera' | 'screen'): Promise<VmeetingTrackLocalVideo> {
    if (this.video && mode === this.video.mode) return Promise.reject('video mode is same with now');
    return vmeetingAPI._jitsi
      .createLocalTracks({
        devices: [mode === 'camera' ? 'video' : 'desktop'],
      })
      .then(async (tracks: JitsiTrack[]) => {
        const _video = tracks[0];
        const newVideo = new VmeetingTrackLocalVideo({ track: _video, mode });
        await this.video?._track.dispose();
        this.setVideo(newVideo);
        return Promise.resolve(this.video);
      })
      .catch(async (e: Error) => {
        if (mode === 'camera') {
          await this.video?._track.dispose();
        }
        this.setVideo(undefined);
        return Promise.reject(e);
      });
  }

  async getMediaDevices(): Promise<JitsiMediaDevices[]> {
    return new Promise((resolve, reject) => {
      if (vmeetingAPI._jitsi?.mediaDevices.isDeviceChangeAvailable('output')) {
        vmeetingAPI._jitsi.mediaDevices.enumerateDevices(async (devices: JitsiMediaDevices[]) => {
          this.devices = devices;
          resolve(devices);
        });
        return this.devices;
      }
      reject('error');
    });
  }

  async changeAudioOutputDevice(deviceId: string) {
    vmeetingAPI._jitsi.mediaDevices
      .setAudioOutputDevice(deviceId)
      .then(() => {
        this.audioOutputDeviceId = deviceId;
      })
      .catch((e: Error) => {
        console.log(e);
      });
  }

  subscribe<T extends VmeetingMeEvent>(subject: T, cb: VmeetingMeEventListener[T]) {
    let listener;
    switch (subject) {
      case 'ON_AUDIO_CHANGED':
        listener = cb;
        break;
      case 'ON_VIDEO_CHANGED':
        listener = cb;
        break;
      default:
        break;
    }
    this.listeners[subject].push({
      origin: cb,
      listener: listener,
    });
  }
  unsubscribe<T extends VmeetingMeEvent>(subject: T, cb: VmeetingMeEventListener[T]) {
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
  async setVideo(video?: VmeetingTrackLocalVideo) {
    const oldVideo = this.video;
    await Promise.all(
      this.listeners.ON_VIDEO_CHANGED.map(async (fn) => {
        await fn.listener(oldVideo, video);
      }),
    );
    await oldVideo?.deconstructor();
    this.video = video;
  }
  async setAudio(audio?: VmeetingTrackLocalAudio) {
    const oldAudio = this.audio;
    await Promise.all(
      this.listeners.ON_AUDIO_CHANGED.map(async (fn) => {
        await fn.listener(oldAudio, audio);
      }),
    );
    await oldAudio?.deconstructor();
    this.audio = audio;
  }
}
