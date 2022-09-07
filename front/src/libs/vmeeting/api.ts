import { initAPIOptions, uris } from './options';

export class VmeetingAPI {
  _jitsi: Window['JitsiMeetJS'];
  uris: string[];
  scripts: HTMLScriptElement[];

  constructor() {
    this._jitsi = undefined;
    this.uris = uris;
    this.scripts = [];
  }
  async init() {
    await Promise.all(
      this.uris.map((uri) => {
        const script = document.createElement('script');
        script.src = uri;
        document.body.appendChild(script);

        return new Promise((resolve, reject) => {
          const timer = setTimeout(() => {
            reject('fail');
          }, 3000);
          script.onload = () => {
            clearTimeout(timer);
            this.scripts.push(script);
            resolve('success');
          };
        });
      }),
    );
    this._jitsi = window.JitsiMeetJS;
    this._jitsi.init(initAPIOptions);
  }
  async deconstructor() {
    this.scripts.forEach((script) => {
      document.body.removeChild(script);
    });
  }
}

// * singleton object
export const vmeetingAPI = new VmeetingAPI();
