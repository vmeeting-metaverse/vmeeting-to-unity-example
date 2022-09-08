export const TARGET_VMEETING = process.env.REACT_APP_TARGET_VMEETING_DOMAIN;
export const TANENT = process.env.REACT_APP_TARGET_VMEETING_TANENT;

export const uris = [
  'https://code.jquery.com/jquery-3.5.1.min.js',
  `https://${TARGET_VMEETING}/libs/lib-jitsi-meet.min.js`,
];

export const initAPIOptions = {};

export const baseConnectionOptions = {
  hosts: {
    domain: TARGET_VMEETING,
    focus: `focus@auth.${TARGET_VMEETING}/focus`,
    muc: `muc.${TANENT}.${TARGET_VMEETING}`,
  },
  // * You must fill serviceUrl.
  // * (ex)
  // * serviceUrl: 'wss://vmeeting.io/xmpp-websocket?room=roomname&token=jwt'
};

export const getConnectionOptions = (roomname: string, token: string) => {
  return {
    ...baseConnectionOptions,
    serviceUrl: `wss://${TARGET_VMEETING}/xmpp-websocket?room=${roomname}&token=${token}`,
  };
};

// TODO: p2p일 경우 튕기는 버그있음.
export const roomOptions = {
  p2p: {
    enabled: false,
  },
  // based on : https://community.jitsi.org/t/delay-with-lib-jitsi-meet-js-replacetrack/111968/18
  videoQuality: {
    preferredCodec: 'VP9',
    maxBitratesVideo: {
      VP8: {
        low: 200000,
        standard: 500000,
        high: 1500000,
      },
      VP9: {
        low: 100000,
        standard: 300000,
        high: 1200000,
      },
    },
  },
};
