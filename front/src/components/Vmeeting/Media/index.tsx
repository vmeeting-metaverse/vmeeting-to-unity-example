/*
 * This Componenet make a Vmeeting Media View.
 * You must wrap this component with ConnectionProvider.
 */

import { CSSProperties, MouseEventHandler, useEffect, useRef, useState } from 'react';
import { VmeetingTrackAudio, VmeetingTrackVideo } from '../../../libs/vmeeting/track';
import MediaDesign, { Refs as MediaDesignRef } from '../MediaDesign';

interface Props {
  audioTrack?: VmeetingTrackAudio;
  videoTrack?: VmeetingTrackVideo;
  style?: CSSProperties;
  isLocal?: boolean;
  onClick?: MouseEventHandler<HTMLDivElement>;
  useIcon?: boolean;
}

const Media = ({ audioTrack, videoTrack, style, isLocal = false, onClick, useIcon }: Props) => {
  const mediaRef = useRef<MediaDesignRef>(null);
  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(true);
  const [isVideoMuted, setIsVideoMuted] = useState<boolean>(true);

  if (onClick) {
    style = { ...style, cursor: 'pointer' };
  }

  useEffect(() => {
    if (audioTrack && mediaRef.current?.audio) {
      const onMuteChanged = (isMuted: boolean) => {
        setIsAudioMuted(isMuted);
      };
      setIsAudioMuted(audioTrack.isMuted());
      audioTrack.attach(mediaRef.current.audio);
      audioTrack.subscribe('ON_MUTE_CHANGED', onMuteChanged);
      return () => {
        setIsAudioMuted(true);
        audioTrack.unsubscribe('ON_MUTE_CHANGED', onMuteChanged);
      };
    } else {
      setIsAudioMuted(true);
    }
  }, [audioTrack]);

  useEffect(() => {
    if (videoTrack && mediaRef.current?.video) {
      const onMuteChanged = (isMuted: boolean) => {
        setIsVideoMuted(isMuted);
      };
      setIsVideoMuted(videoTrack.isMuted());
      videoTrack.attach(mediaRef.current.video);
      videoTrack.subscribe('ON_MUTE_CHANGED', onMuteChanged);
      return () => {
        videoTrack.unsubscribe('ON_MUTE_CHANGED', onMuteChanged);
        setIsVideoMuted(true);
      };
    } else {
      setIsVideoMuted(true);
    }
  }, [videoTrack]);

  return (
    <MediaDesign
      onClick={onClick}
      ref={mediaRef}
      isAudioMuted={isAudioMuted}
      isVideoMuted={isVideoMuted}
      style={style}
      isLocal={isLocal}
      useIcon={useIcon}
    />
  );
};

export default Media;
