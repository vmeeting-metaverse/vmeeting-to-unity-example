import { useEffect, useState } from "react";
import {
  VmeetingTrackLocalAudio,
  VmeetingTrackLocalVideo,
} from "../../../libs/vmeeting/track";
import { useVmeeting } from "../../../providers/Vmeeting";
import Media from "../Media";

import style from "./LocalMedia.module.scss";

import icons from "../../../images/icon";

const LocalMedia = () => {
  const [video, setVideo] = useState<VmeetingTrackLocalVideo>();
  const [audio, setAudio] = useState<VmeetingTrackLocalAudio>();

  const app = useVmeeting();
  useEffect(() => {
    if (app?.me) {
      const onAudioChange = (
        _: VmeetingTrackLocalAudio,
        audio: VmeetingTrackLocalAudio
      ) => setAudio(audio);
      const onVideoChange = (
        _: VmeetingTrackLocalVideo,
        video: VmeetingTrackLocalVideo
      ) => setVideo(video);
      const init = async () => {
        app.me.subscribe("ON_AUDIO_CHANGED", onAudioChange);
        app.me.subscribe("ON_VIDEO_CHANGED", onVideoChange);
        const devices = await app.me.getMediaDevices();
        if (!app.me.audio) {
          const mics = devices.filter((e) => e.kind === "audioinput");
          const defaultMic = mics.find((e: any) => e.deviceId === "default");
          if (defaultMic) {
            const micId = mics.find(
              (e: any) =>
                e.groupId === defaultMic.groupId && e.deviceId !== "default"
            )?.deviceId;
            const newAudio = await app.createAudio(micId);
            if (newAudio) {
              app.me.setAudio(newAudio);
            }
          } else {
            const newAudio = await app.createAudio();
            if (newAudio) {
              app.me.setAudio(newAudio);
            }
          }
        }
        if (!app.me.video) {
          const newVideo = await app.createVideo();
          if (newVideo) {
            app.me.setVideo(newVideo);
          }
        }
        const speakers = devices.filter((e) => e.kind === "audiooutput");
        const defaultSpeaker = speakers.find(
          (e: any) => e.deviceId === "default"
        );
        if (defaultSpeaker) {
          app.me.audioOutputDeviceId = speakers.find(
            (e: any) =>
              e.groupId === defaultSpeaker.groupId && e.deviceId !== "default"
          )?.deviceId;
        }
      };
      init();
      return () => {
        app.me.unsubscribe("ON_AUDIO_CHANGED", onAudioChange);
        app.me.unsubscribe("ON_VIDEO_CHANGED", onVideoChange);
      };
    }
  }, [app]);

  const [isAudioMuted, setIsAudioMuted] = useState(false);

  useEffect(() => {
    if (audio) {
      const onMuteChanged = (muted: boolean) => {
        setIsAudioMuted(muted);
      };
      audio.subscribe("ON_MUTE_CHANGED", onMuteChanged);
      return () => {
        audio.unsubscribe("ON_MUTE_CHANGED", onMuteChanged);
      };
    }
  }, [audio]);

  const [isVideoMuted, setIsVideoMuted] = useState(false);
  useEffect(() => {
    if (video) {
      const onMuteChanged = (muted: boolean) => {
        setIsVideoMuted(muted);
      };
      video.subscribe("ON_MUTE_CHANGED", onMuteChanged);
      return () => {
        video.unsubscribe("ON_MUTE_CHANGED", onMuteChanged);
      };
    }
  }, [video]);

  return (
    <div className={style.container}>
      <div className={style.controller}>
        <button
          className={`${style.button} ${
            audio && !isAudioMuted ? style.active : ""
          }`}
          onClick={() => {
            if (audio) {
              if (audio.isMuted()) {
                audio.unmute();
              } else {
                audio?.mute();
              }
            }
          }}
        >
          <img src={icons.micImg} />
        </button>
        <button
          className={`${style.button} ${
            video && !isVideoMuted ? style.active : ""
          }`}
          onClick={() => {
            if (video) {
              if (video.isMuted()) {
                video.unmute();
              } else {
                video?.mute();
              }
            }
          }}
        >
          <img src={icons.cameraImg} />
        </button>
        <button
          className={`${style.button} ${
            video?.mode === "screen" ? style.active : ""
          }`}
          onClick={() => {
            if (video?.mode === "screen") {
              app?.me.changeVideoMode("camera");
            } else {
              app?.me.changeVideoMode("screen");
            }
          }}
        >
          <img src={icons.screenShareImg} />
        </button>
      </div>
      <Media
        audioTrack={audio}
        videoTrack={video}
        isLocal={true}
        useIcon={false}
        style={{ width: "320px", height: "180px" }}
      />
    </div>
  );
};

export default LocalMedia;
