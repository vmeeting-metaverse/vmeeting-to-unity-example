import React, { useRef, useState } from 'react';

import { useUnityContext } from 'react-unity-webgl';
import UnityPlayer from './components/UnityPlayer';
import ConferenceRoom from './components/Vmeeting/ConferenceRoom';
import LocalMedia from './components/Vmeeting/LocalMedia';
import { useVmeetingSpace } from './libs/vmeeting/hooks';

import { createFrameSender } from './libs/FrameSender';

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

  const { enterSpace, exitSpace, conferenceRoomParticipants } = useVmeetingSpace(true, unityCtx);

  const [roomName, setRoomName] = useState('');
  const onChangeRoomName = (e: any) => {
    setRoomName(e.target.value);
  };

  const onClickJoin = () => {
    console.log('Target Room Name: ', roomName);
  }

  const localVideoRef = useRef<any>();
  const remoteVideoRef = useRef<any>();

  let localVideoFrameSender: any = null;
  let remoteVideoFrameSender: any = null;

  const onClickSend = (id: any) => {
    if(id === "1"){
      if (!localVideoFrameSender){
        localVideoFrameSender = createFrameSender(localVideoRef, unityCtx, "1");
        localVideoFrameSender.startSend();
      }
    }
    else if (id === "2"){
      if (!remoteVideoFrameSender){
        remoteVideoFrameSender = createFrameSender(remoteVideoRef, unityCtx, "2");
        remoteVideoFrameSender.startSend();
      }
    }
    else {
      console.log("Invalid ID!");
    }
  }

  const onClickStop = (id: any) => {
    if(id === "1"){
      if (localVideoFrameSender){
        localVideoFrameSender.stopSend();
        localVideoFrameSender = null;
      }
    }
    else if (id === "2"){
      if (remoteVideoFrameSender){
        remoteVideoFrameSender.stopSend();
        remoteVideoFrameSender = null;
      }
    }
    else {
      console.log("Invalid ID!");
    }
  }
  
  return (
    <div className="App" style={{ width: '100%', height: '100%', display:'flex' }}>
      <div className='unity_ui'>
        <UnityPlayer unityContext={unityCtx} />
      </div>
      <div className='test_ui'>
        <div className="info">
          <input className="room_name_input" type="text" onChange={onChangeRoomName} />
          <div className='button_join' onClick={onClickJoin}>
            Join
          </div>
        </div>
        <div className='videos_container'>
          <div className='video_container'>
            <div className='video_title'> Local Video </div>
            <video className='video' ref={localVideoRef} src="/sample-15s.mp4" controls muted/>
            <div className='button_container'>
              <div className='button_default'onClick={() => onClickSend("1")}>
                Send
              </div>
              <div className='button_stop'onClick={() => onClickStop("1")}>
                Stop
              </div>
            </div>
          </div>
          <div className='video_container'>
            <div className='video_title'> Remote Video </div>
            <video className='video' ref={remoteVideoRef} src="/sample-15s.mp4" controls muted/>
            <div className='button_container'>
              <div className='button_default'onClick={() => onClickSend("2")}>
                Send
              </div>
              <div className='button_stop'onClick={() => onClickStop("2")}>
                Stop
              </div>
            </div>
          </div>
        </div>
      </div>
      <div
        style={{
          position: 'absolute',
          top: 20,
          right: 320,
          left: 320,
          overflowX: 'auto',
          textAlign: 'center',
          whiteSpace: 'nowrap',
        }}
      >
        <ConferenceRoom participants={conferenceRoomParticipants} />
      </div>
      <LocalMedia />
    </div>
  );
}

export default App;
