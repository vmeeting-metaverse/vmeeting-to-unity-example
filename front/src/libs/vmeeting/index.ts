import { vmeetingAPI } from './api';
import { VmeetingRoom } from './room';
import { VmeetingTrackLocalAudio, VmeetingTrackLocalVideo } from './track';
import { JitsiTrack } from './types';
import { VmeetingMe } from './user';

export class Vmeeting {
  rooms: Map<string, VmeetingRoom>;
  me: VmeetingMe;
  jwt: string;
  constructor({ me, jwt }: { me: VmeetingMe; jwt: string }) {
    this.rooms = new Map();
    this.me = me;
    this.jwt = jwt;
  }

  async init() {
    return vmeetingAPI.init();
  }

  deconstructor() {
    vmeetingAPI.deconstructor();
  }

  // * return new audio track
  createAudio(deviceId?: string): Promise<VmeetingTrackLocalAudio> {
    return new Promise((resolve, reject) => {
      const onCreateLocalTrackSuccess = (tracks: JitsiTrack[]) => {
        const newAudio = new VmeetingTrackLocalAudio({ track: tracks[0] });
        resolve(newAudio);
      };
      vmeetingAPI._jitsi
        .createLocalTracks({ devices: ['audio'], micDeviceId: deviceId })
        .then(onCreateLocalTrackSuccess)
        .catch(() => {
          reject('Failed Create Local Track');
        });
    });
  }

  // * return new video track
  createVideo(deviceId?: string): Promise<VmeetingTrackLocalVideo> {
    return new Promise((resolve, reject) => {
      const onCreateLocalTrackSuccess = (tracks: JitsiTrack[]) => {
        const newVideo = new VmeetingTrackLocalVideo({ track: tracks[0], mode: 'camera' });
        resolve(newVideo);
      };
      vmeetingAPI._jitsi
        .createLocalTracks({ devices: ['video'], cameraDeviceId: deviceId })
        .then(onCreateLocalTrackSuccess)
        .catch(() => {
          reject('Failed Create Local Track');
        });
    });
  }
}
