// * Load Unity using react-unity-webgl library

import { useEffect } from "react";
import { Unity } from "react-unity-webgl";
import "./unityPlayer.css";

const UnityPlayer = (props: any): JSX.Element => {
  return (
    <div className="unity_player__wrapper">
      {props.unityContext.unityProvider && (
        <Unity
          unityProvider={props.unityContext.unityProvider}
          className="unity_player__canvas"
          devicePixelRatio={window.devicePixelRatio}
          tabIndex={1}
        />
      )}
      {!props.unityContext.isLoaded && (
        <div className="unity_player__loading-bar">
          <div className="unity_player__progress-bar-empty">
            <div
              className="unity_player__progress-bar-full"
              style={{
                width: `${props.unityContext.loadingProgression * 100}%`,
              }}
            ></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UnityPlayer;
