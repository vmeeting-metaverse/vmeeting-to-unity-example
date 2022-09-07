// * Load Unity using react-unity-webgl library

import { useEffect, useState, useCallback } from "react";

const DUMMY_USER_AVATAR_URL =
  "https://d1a370nemizbjq.cloudfront.net/827e8656-e155-4df5-b22a-c1d9def4969e.glb";
const DUMMY_USER_ID = "62ff311443aed2a5c3dfb6ac";
const DUMMY_USER_NAME = "DUMMY";

const EventManager = (props: any): JSX.Element => {
  const { sendMessage, addEventListener, removeEventListener } =
    props.unityContext;
  const [intervalId, setIntervalId] = useState<any>(undefined);

  const spawnCharacter = useCallback(async () => {
    const param = {
      userId: DUMMY_USER_ID,
      avatarUrl: DUMMY_USER_AVATAR_URL,
    };
    const param_string = JSON.stringify(param);
    const timer = setInterval(() => {
      sendMessage("MyNetworkManager", "comm_spawnAvatar", param_string);
    }, 2000);
    setIntervalId(timer);
    return () => clearInterval(timer);
  }, [sendMessage]);

  const retrySpawnOrNot = useCallback(
    async (result: any) => {
      const data = JSON.parse(result);

      if (data.id === DUMMY_USER_ID && data.state === "SUCCESS") {
        clearInterval(intervalId);
        sendMessage("MyNetworkManager", "comm_setDisplayName", DUMMY_USER_NAME);
      }
    },
    [sendMessage, intervalId]
  );

  useEffect(() => {
    addEventListener("Connected", spawnCharacter);
    addEventListener("SpawnResult", retrySpawnOrNot);
    return () => {
      removeEventListener("Connected", spawnCharacter);
      removeEventListener("SpawnResult", retrySpawnOrNot);
    };
  }, [addEventListener, removeEventListener, spawnCharacter, retrySpawnOrNot]);

  return <></>;
};

export default EventManager;
