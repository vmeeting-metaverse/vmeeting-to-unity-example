import { useCallback, useEffect, useState } from "react";
import { IUnityContextHook } from "react-unity-webgl/distribution/interfaces/unity-context-hook";
import { useVmeeting } from "../../providers/Vmeeting";
import { VmeetingAudiotorium, VmeetingRoom } from "./room";
import { VmeetingUser } from "./user";
import _ from "lodash";
import { DUMMY_JWT } from "../constants";

export const useVmeetingAuditorium = () => {
  const app = useVmeeting();
  const [auditorium, setAuditorium] = useState<VmeetingAudiotorium>();
  const [presenter, setPresenter] = useState<VmeetingUser>();

  const enterAuditorium = async (name: string) => {
    if (name === "") {
      return new Error("Name is needed");
    }
    if (!app?.me) {
      return new Error("Vmeeting App is not working well.");
    }
    const jwt = DUMMY_JWT;
    if (!jwt) {
      return new Error("App token is not set");
    }
    if (auditorium) {
      await exitAuditorium();
    }
    const audi = new VmeetingAudiotorium({ name: name });
    await audi.enter({ jwt: jwt, me: app.me });
    audi.subscribe("ON_CHANGE_PLATFORM_OCCUPIER", (occupier?: VmeetingUser) => {
      setPresenter(_.cloneDeep(occupier));
    });
    setAuditorium(audi);
    app.rooms.set(name, audi);
  };

  const exitAuditorium = async () => {
    if (!auditorium) {
      return;
    }
    await auditorium.exit();
    setAuditorium(undefined);
  };

  const getOnPlatform = useCallback(() => {
    if (!auditorium) {
      return new Error("Auditorium is not exist");
    }
    auditorium.getOnThePlatform();
  }, [auditorium]);

  const getOffPlatform = useCallback(() => {
    if (!auditorium) {
      return new Error("Auditorium is not exist");
    }
    auditorium.getOffThePlatform();
  }, [auditorium]);

  return {
    enterAuditorium,
    exitAuditorium,
    getOnPlatform,
    getOffPlatform,
    presenter,
    auditorium,
  };
};

export const useVmeetingConferenceRoom = () => {
  const app = useVmeeting();
  const [participants, setParticipants] = useState<Map<string, VmeetingUser>>(
    new Map()
  );
  const enterRoom = async (name: string) => {
    if (name === "") {
      return new Error("Name is needed");
    }
    if (!app?.me) {
      return new Error("Vmeeting App is not working well.");
    }
    const jwt = DUMMY_JWT;
    if (!jwt) {
      return new Error("App token is not set");
    }
    const room = new VmeetingRoom({ name: name });
    await room.enter({ jwt, me: app.me });
    room.subscribe("ON_PARTICIPANTS_CHANGED", (ps) => {
      setParticipants(_.cloneDeep(ps));
    });
    app.rooms.set(name, room);
  };

  const exitRoom = async (name: string) => {
    const room = app?.rooms.get(name);
    if (room) {
      await room.exit();
      app?.rooms.delete(name);
      setParticipants(new Map());
    }
  };

  return {
    enterRoom,
    exitRoom,
    participants,
  };
};

interface SpaceReturn {
  enterSpace: (name: string) => Promise<Error | void>;
  exitSpace: () => Promise<void>;
  presenter?: VmeetingUser;
  conferenceRoomParticipants: Map<string, VmeetingUser>;
}

export const useVmeetingSpace = (
  platformYN: boolean,
  unityContext: IUnityContextHook
): SpaceReturn => {
  const app = useVmeeting();
  const [spaceName, setSpaceName] = useState<string>();
  const { enterRoom, exitRoom, participants } = useVmeetingConferenceRoom();
  const { addEventListener, removeEventListener } = unityContext;
  const {
    getOnPlatform,
    getOffPlatform,
    enterAuditorium,
    exitAuditorium,
    presenter,
  } = useVmeetingAuditorium();

  useEffect(() => {
    if (spaceName && platformYN) {
      const StageEnter = (e: any) => {
        const isEntered = e;
        if (isEntered) {
          console.info(`get on platform: ${spaceName}-platform`);
          getOnPlatform();
        } else {
          console.info(`get off platform: ${spaceName}-platform`);
          getOffPlatform();
        }
      };
      addEventListener("StageEnter", StageEnter);
      return () => {
        removeEventListener("StageEnter", StageEnter);
      };
    }
  }, [app, spaceName, getOnPlatform, getOffPlatform]);

  useEffect(() => {
    if (spaceName) {
      const privateRoomEnter = (e: any) => {
        const data = JSON.parse(e);
        if (data.state === "ENTER") {
          console.info(`entered Room: ${spaceName}-${JSON.parse(e).id}`);
          enterRoom(`${spaceName}-${JSON.parse(e).id}`);
        } else {
          console.info(`exited Room: ${spaceName}-${JSON.parse(e).id}`);
          exitRoom(`${spaceName}-${JSON.parse(e).id}`);
        }
      };
      addEventListener("PrivateRoomEnter", privateRoomEnter);
      addEventListener("GroupZoneEnter", privateRoomEnter);
      return () => {
        removeEventListener("PrivateRoomEnter", privateRoomEnter);
        removeEventListener("GroupZoneEnter", privateRoomEnter);
      };
    }
  }, [app, spaceName]);

  if (platformYN) {
    return {
      async enterSpace(name: string) {
        if (name === "") {
          return new Error("Name is needed");
        }
        setSpaceName(name);
        await enterAuditorium(`${name}-platform`);
      },
      async exitSpace() {
        await exitAuditorium();
        app?.rooms.forEach(async (room, k) => {
          await room.exit();
          app.rooms.delete(k);
        });
        setSpaceName(undefined);
      },
      conferenceRoomParticipants: participants,
      presenter: presenter,
    };
  } else {
    return {
      async enterSpace(name) {
        if (name === "") {
          return new Error("Name is needed");
        }
        setSpaceName(name);
      },
      async exitSpace() {
        app?.rooms.forEach(async (room, k) => {
          await room.exit();
          app.rooms.delete(k);
        });
        setSpaceName(undefined);
      },
      conferenceRoomParticipants: participants,
    };
  }
};
