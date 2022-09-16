import { useEffect, useRef, useState } from 'react';

import { useUnityContext } from 'react-unity-webgl';
import UnityPlayer from './components/UnityPlayer';
import { useVmeetingSpace } from './libs/vmeeting/hooks';

import { createFrameSender } from './libs/FrameSender';
import { useVmeeting } from './providers/Vmeeting';
import { VmeetingTrackLocalVideo } from './libs/vmeeting/track';
import { DUMMY_JWT } from './libs/constants';

const ROOT = process.env.PUBLIC_URL;
const BUILD_URL = ROOT + '/Build';
const CONFIG_PREFIX = 'Client';
const CONFIG = {
  dataUrl: `${BUILD_URL}/${CONFIG_PREFIX}.data.unityweb`,
  loaderUrl: `${BUILD_URL}/${CONFIG_PREFIX}.loader.js`,
  frameworkUrl: `${BUILD_URL}/${CONFIG_PREFIX}.framework.js.unityweb`,
  codeUrl: `${BUILD_URL}/${CONFIG_PREFIX}.wasm.unityweb`,
};

function App() {
  const unityCtx = useUnityContext(CONFIG);
  const [video, setVideo] = useState<VmeetingTrackLocalVideo>();

  const app = useVmeeting();

  useEffect(() => {
    localStorage.setItem('vm-jwt', DUMMY_JWT);
  }, []);

  useEffect(() => {
    if (app?.me) {
      const onVideoChange = (
        _: VmeetingTrackLocalVideo,
        video: VmeetingTrackLocalVideo
      ) => setVideo(video);
      const init = async () => {
        app.me.subscribe("ON_VIDEO_CHANGED", onVideoChange);
        if (!app.me.video) {
          const newVideo = await app.createVideo();
          if (newVideo) {
            app.me.setVideo(newVideo);
          }
        }

      };
      init();
      return () => {
        app.me.unsubscribe("ON_VIDEO_CHANGED", onVideoChange);

      };
    }
  }, [app]);

  useEffect(() => {
    if (video) {
      video.attach(localVideoRef.current);
      enterSpace('test');
      return () => {
        exitSpace();
      }
    }
  }, [video]);

  const { enterSpace, exitSpace, nowRoomParticipants } = useVmeetingSpace(unityCtx);

  useEffect(() => {
    if (nowRoomParticipants.size > 0) {
      const p = nowRoomParticipants.values().next();
      if (p) {
        p.value.video?.attach(remoteVideoRef.current);
      }
    }
  }, [nowRoomParticipants]);

  const localVideoRef = useRef<any>();
  const remoteVideoRef = useRef<any>();

  let localVideoFrameSender: any = null;
  let remoteVideoFrameSender: any = null;

  const onClickSend = (id: any) => {
    if (id === "1") {
      if (!localVideoFrameSender) {
        localVideoFrameSender = createFrameSender(localVideoRef, unityCtx, "1");
        localVideoFrameSender.startSend();
      }
    }
    else if (id === "2") {
      if (!remoteVideoFrameSender) {
        remoteVideoFrameSender = createFrameSender(remoteVideoRef, unityCtx, "2");
        remoteVideoFrameSender.startSend();
      }
    }
    else {
      console.log("Invalid ID!");
    }
  }

  const onClickStop = (id: any) => {
    if (id === "1") {
      if (localVideoFrameSender) {
        localVideoFrameSender.stopSend();
        localVideoFrameSender = null;
      }
    }
    else if (id === "2") {
      if (remoteVideoFrameSender) {
        remoteVideoFrameSender.stopSend();
        remoteVideoFrameSender = null;
      }
    }
    else {
      console.log("Invalid ID!");
    }
  }

  return (
    <div className="App" style={{ width: '100%', height: '100%', display: 'flex' }}>
      <div className='unity_ui'>
        <UnityPlayer unityContext={unityCtx} />
      </div>
      <div className='test_ui'>
        <div className='videos_container'>
          <div className='video_container'>
            <div className='video_title'> Local Video </div>
            <video className='video' ref={localVideoRef} autoPlay />
            <div className='button_container'>
              <div className='button_default' onClick={() => onClickSend("1")}>
                Send
              </div>
              <div className='button_stop' onClick={() => onClickStop("1")}>
                Stop
              </div>
            </div>
          </div>
          <div className='video_container'>
            <div className='video_title'> Remote Video </div>
            <video className='video' ref={remoteVideoRef} autoPlay />
            <div className='button_container'>
              <div className='button_default' onClick={() => onClickSend("2")}>
                Send
              </div>
              <div className='button_stop' onClick={() => onClickStop("2")}>
                Stop
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
