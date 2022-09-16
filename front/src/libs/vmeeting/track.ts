import { vmeetingAPI } from './api';
import { JitsiTrack } from './types';
import { createVirtualBackgroundEffect } from '../VirtualBackground';

export type VmeetingTrackEventListener = {
  ON_MUTE_CHANGED: (isMuted: boolean) => void;
};

export type VmeetingTrackEvent = keyof VmeetingTrackEventListener;

export class VmeetingTrack {
  _track: JitsiTrack;
  attachedElement?: HTMLAudioElement | HTMLVideoElement;
  listeners: {
    [Property in VmeetingTrackEvent]: {
      origin: VmeetingTrackEventListener[VmeetingTrackEvent];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      listener: any;
    }[];
  };
  constructor({ track }: { track: JitsiTrack }) {
    this._track = track;
    this.attachedElement = undefined;
    this.listeners = {
      ON_MUTE_CHANGED: [],
    };
  }

  attach(htmlElement: HTMLAudioElement | HTMLVideoElement) {
    this._track.attach(htmlElement);
    this.attachedElement = htmlElement;
  }

  detach(htmlElement: HTMLAudioElement | HTMLVideoElement) {
    this._track.detach(htmlElement);
  }

  mute(): Error | void {
    return new Error('Not Implemented');
  }
  unmute(): Error | void {
    return new Error('Not Implemented');
  }
  isMuted(): boolean {
    return this._track.isMuted();
  }

  subscribe<T extends VmeetingTrackEvent>(subject: T, cb: VmeetingTrackEventListener[T]) {
    let listener;
    switch (subject) {
      case 'ON_MUTE_CHANGED':
        listener = (track: JitsiTrack) => {
          // * track.muted is for remote.
          // * track.isMuted() is for local.
          if (track.muted || track.isMuted()) {
            cb(true);
          } else {
            cb(false);
          }
        };
        this._track.on(vmeetingAPI._jitsi.events.track.TRACK_MUTE_CHANGED, listener);
        break;
      default:
        break;
    }
    this.listeners[subject]?.push({
      origin: cb,
      listener: listener,
    });
  }

  unsubscribe<T extends VmeetingTrackEvent>(subject: T, cb: VmeetingTrackEventListener[T]) {
    const idx = this.listeners[subject].findIndex((l) => {
      l.origin === cb;
    });
    if (idx > -1) {
      const listener = this.listeners[subject].at(idx)?.listener;
      switch (subject) {
        case 'ON_MUTE_CHANGED':
          this._track.off(vmeetingAPI._jitsi.events.track.TRACK_MUTE_CHANGED, listener);
          break;
        default:
          break;
      }
      this.listeners = {
        ...this.listeners,
        [subject]: this.listeners[subject].filter((_, index) => index !== idx),
      };
    }
  }

  async deconstructor() {
    await this._track.detach();
    await this._track.dispose();
  }
}

export class VmeetingTrackAudio extends VmeetingTrack {}

export class VmeetingTrackVideo extends VmeetingTrack {}

export class VmeetingTrackLocalAudio extends VmeetingTrackAudio {
  mute() {
    return this._track.mute();
  }

  unmute() {
    return this._track.unmute();
  }
}

export class VmeetingTrackRemoteAudio extends VmeetingTrackAudio {
  mute() {
    this._track.detach();
  }

  unmute() {
    if (this.attachedElement) {
      this._track.attach(this.attachedElement);
    }
  }
}

export class VmeetingTrackLocalVideo extends VmeetingTrackVideo {
  mode: 'camera' | 'screen';
  useBackground: boolean;

  constructor({ track, mode = 'camera' }: { track: JitsiTrack; mode?: 'camera' | 'screen' }) {
    super({ track });
    this.mode = mode;
    this.useBackground = false;
  }

  mute() {
    return this._track.mute();
  }

  unmute() {
    return this._track.unmute();
  }

  async useBackgroundEffect(useYN: boolean) {
    this.useBackground = useYN;

    if (useYN) {
      this._track.setEffect(await createVirtualBackgroundEffect());
    } else {
      this._track.setEffect(undefined);
    }
  }
}

export class VmeetingTrackRemoteVideo extends VmeetingTrackVideo {
  mute() {
    this._track.detach();
  }

  unmute() {
    if (this.attachedElement) {
      this._track.attach(this.attachedElement);
    }
  }
}
