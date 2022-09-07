import { useUnityContext } from 'react-unity-webgl';
import UnityPlayer from './components/UnityPlayer';
import ConferenceRoom from './components/Vmeeting/ConferenceRoom';
import LocalMedia from './components/Vmeeting/LocalMedia';
import { useVmeetingSpace } from './libs/vmeeting/hooks';

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

  return (
    <div className="App" style={{ width: '100%', height: '100%' }}>
      <UnityPlayer unityContext={unityCtx} />
      <div
        style={{
          position: 'absolute',
          top: '25px',
          left: '25px',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'white',
          padding: '10px',
        }}
      >
        <h3>Space 변경</h3>
        <div>
          <button
            onClick={() => {
              sendMessage('WarpManager', 'comm_WarpToLobby');
              exitSpace();
            }}
          >
            Lobby
          </button>
          <button
            onClick={() => {
              sendMessage('TeamManager', 'comm_setTeamId', 'conference');
              sendMessage('WarpManager', 'comm_WarpTo', 'conference');
              enterSpace('conference');
            }}
          >
            conferenceHall
          </button>
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
