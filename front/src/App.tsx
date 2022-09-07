import React, { useRef } from 'react';

import { useUnityContext } from 'react-unity-webgl';
import UnityPlayer from './components/UnityPlayer';
import ConferenceRoom from './components/Vmeeting/ConferenceRoom';
import LocalMedia from './components/Vmeeting/LocalMedia';
import { useVmeetingSpace } from './libs/vmeeting/hooks';

import { exampleImage } from "./libs/constants";

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
  const { sendMessage } = unityCtx;

  const { enterSpace, exitSpace, conferenceRoomParticipants } = useVmeetingSpace(true, unityCtx);

  const imgRef = useRef<any>();
  const onClickSend = () => {
    const canvas: any = document.createElement('canvas');
    canvas.width = imgRef.current.naturalWidth;
    canvas.height = imgRef.current.naturalHeight;

    canvas.getContext('2d').drawImage(imgRef.current, 0, 0);

    const dataURL = canvas.toDataURL();
    //console.log(dataURL);
    const base64 = getBase64StringFromDataURL(dataURL);
    //console.log(base64);

    const param = {
      id: "1",
      data: base64,
    };
    const param_string = JSON.stringify(param);
    sendMessage('CommManager', 'comm_setImage', param_string);
  }

  const getBase64StringFromDataURL = (dataURL: any) =>
    dataURL.replace('data:', '').replace(/^.+,/, '');
  
  return (
    <div className="App" style={{ width: '100%', height: '100%', display:'flex' }}>
      <div className='unity_ui'>
        <UnityPlayer unityContext={unityCtx} />
      </div>
      <div className='test_ui'>
        <div className='button_join'>
          Join
        </div>
        <div className='videos_container'>
          <div className='video_container'>
            <div className='local_video'>
              Local Video
            </div>
            <div className='button_default'>
              Send
            </div>
          </div>
          <div className='video_container'>
            <div className='remote_video'>
              Remote Video
            </div>
            <div className='button_default'>
              Send
            </div>
          </div>
        </div>
        <div className='videos_container'>
          <div className='video_container'>
            <img className='test_img' src={exampleImage} ref={imgRef}/>
            <div className='button_default' onClick={onClickSend}>
              Send
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
