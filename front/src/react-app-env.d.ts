/// <reference types="react-scripts" />

declare namespace NodeJS {
  interface ProcessEnv {
    REACT_APP_TARGET_VMEETING_DOMAIN: string;
    REACT_APP_TARGET_VMEETING_TANENT: string;
  }
}

// For Jitsi-Lib API
interface Window {
  JitsiMeetJS: any;
  $: any;
}
