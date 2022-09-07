/*
 * This Componenet make a Vmeeting Media View.
 * You must wrap this component with ConnectionProvider.
 */

import {
  CSSProperties,
  forwardRef,
  MouseEventHandler,
  useImperativeHandle,
  useRef,
} from "react";
import { defaultUserImage } from "../../../libs/constants";
import "./media.css";

interface Props {
  isVideoMuted: boolean;
  isAudioMuted: boolean;
  defaultImageSrc?: string;
  style?: CSSProperties;
  isLocal: boolean;
  onClick?: MouseEventHandler<HTMLDivElement>;
  useIcon?: boolean;
}

export interface Refs {
  audio: HTMLAudioElement | null;
  video: HTMLVideoElement | null;
}

const MediaDesign = forwardRef<Refs, Props>(
  (
    {
      isVideoMuted,
      isAudioMuted,
      defaultImageSrc = defaultUserImage,
      style,
      isLocal = false,
      onClick,
      useIcon = true,
    },
    ref
  ): JSX.Element => {
    const audioRef = useRef<HTMLAudioElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);

    useImperativeHandle(ref, () => ({
      audio: audioRef.current,
      video: videoRef.current,
    }));

    return (
      <div className="vmeeting_media__wrapper" style={style} onClick={onClick}>
        <audio ref={audioRef} autoPlay hidden={isAudioMuted} muted={isLocal} />
        <video
          className="vmeeting_media__image"
          ref={videoRef}
          autoPlay
          hidden={isVideoMuted}
        />
        <img
          src={defaultImageSrc}
          className="vmeeting_media__image"
          alt="default image"
          hidden={!isVideoMuted}
        />
        {useIcon && isAudioMuted && (
          <span style={{ position: "absolute", bottom: 10, right: 10 }}>
            <svg height="22" width="22" viewBox="0 0 22 22">
              <path
                fill-rule="evenodd"
                clip-rule="evenodd"
                d="M7.333 8.65V11a3.668 3.668 0 002.757 3.553.928.928 0 00-.007.114v1.757A5.501 5.501 0 015.5 11a.917.917 0 10-1.833 0c0 3.74 2.799 6.826 6.416 7.277v.973a.917.917 0 001.834 0v-.973a7.297 7.297 0 003.568-1.475l3.091 3.092a.932.932 0 101.318-1.318l-3.091-3.091.01-.013-1.311-1.311-.01.013-1.325-1.325.008-.014-1.395-1.395a1.24 1.24 0 01-.004.018l-3.61-3.609v-.023L7.334 5.993v.023l-3.909-3.91a.932.932 0 10-1.318 1.318L7.333 8.65zm1.834 1.834V11a1.833 1.833 0 002.291 1.776l-2.291-2.292zm3.682 3.683c-.29.17-.606.3-.94.386a.928.928 0 01.008.114v1.757a5.47 5.47 0 002.257-.932l-1.325-1.325zm1.818-3.476l-1.834-1.834V5.5a1.833 1.833 0 00-3.644-.287l-1.43-1.43A3.666 3.666 0 0114.667 5.5v5.19zm1.665 1.665l1.447 1.447c.357-.864.554-1.81.554-2.803a.917.917 0 10-1.833 0c0 .468-.058.922-.168 1.356z"
              ></path>
            </svg>
          </span>
        )}
      </div>
    );
  }
);

export default MediaDesign;
