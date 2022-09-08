import { useCallback, useEffect, useMemo, useState } from "react";
import { IUnityContextHook } from "react-unity-webgl/distribution/interfaces/unity-context-hook";
import { useVmeeting } from "../../providers/Vmeeting";
import { VmeetingConference, VmeetingConferenceEventListener } from "./room";
import { VmeetingUser } from "./user";

const vmConf = new VmeetingConference();

export const useVmeetingSpace = (unityContext: IUnityContextHook) => {
  const app = useVmeeting();
  const { addEventListener, removeEventListener } = unityContext;
  const [spaceName, setSpaceName] = useState<string>();
  const [roomName, setRoomName] = useState<string>();

  const [participants, setParticipants] = useState<Map<string, VmeetingUser>>(new Map());
  const [presenters, setPresenters] = useState<string[]>([]);
  const [rooms, setRooms] = useState<Map<string, string[]>>(new Map());

  const nowRoomParticipants = useMemo<Map<string, VmeetingUser>>(() => {
    const ps = new Map();
    if (roomName) {
      rooms.get(roomName)?.forEach((pId) => {
        const p = participants.get(pId);
        if (p) {
          ps.set(pId, p)
        }
      });
    }
    return ps;
  }, [rooms, roomName, participants]);

  const nowPresenters = useMemo<Map<string, VmeetingUser>>(() => {
    const ps = new Map();
    presenters.forEach((pId) => {
      const p = participants.get(pId);
      if (p) {
        ps.set(pId, p)
      }
    });
    return ps;
  }, [presenters, participants]);

  useEffect(() => {
    if (spaceName) {
      const jwt = localStorage.getItem('vm-jwt');
      if (!jwt) {
        setSpaceName(undefined);
        return;
      }
      if (!app?.me) {
        setSpaceName(undefined);
        return;
      }

      const onStage = (isEntered: boolean) => {
        console.log(isEntered);
        if (isEntered) {
          vmConf.enterPlatform();
        } else {
          vmConf.exitPlatform();
        }
      };
      addEventListener('StageEnter', onStage);
      const enterRoom = (e: string) => {
        const data = JSON.parse(e) as { state: 'ENTER' | 'EXIT'; id: string };
        const roomName = `${spaceName}-${data.id}`;
        if (data.state === 'ENTER') {
          vmConf.enterRoom(roomName);
          setRoomName(roomName)
        } else {
          vmConf.exitRoom(roomName);
          setRoomName(undefined);
        }
      };

      const onParticipantsChanged: VmeetingConferenceEventListener['ON_PARTICIPANTS_CHANGED'] = (participants) => setParticipants(participants);
      const onPresentersChanged: VmeetingConferenceEventListener['ON_PRESENTERS_CHANGED'] = (presenters) => setPresenters(presenters);
      const onRoomsChanged: VmeetingConferenceEventListener['ON_ROOMS_CHANGED'] = (rooms) => setRooms(rooms);

      addEventListener('PrivateRoomEnter', enterRoom);
      addEventListener('GroupZoneEnter', enterRoom);
      vmConf.subscribe('ON_PARTICIPANTS_CHANGED',onParticipantsChanged);
      vmConf.subscribe('ON_PRESENTERS_CHANGED', onPresentersChanged);
      vmConf.subscribe('ON_ROOMS_CHANGED', onRoomsChanged);
      vmConf.enter({ name: spaceName, jwt, me: app.me });
      app.conference = vmConf;
      return () => {
        removeEventListener('StageEnter', onStage);
        removeEventListener('PrivateRoomEnter', enterRoom);
        removeEventListener('GroupZoneEnter', enterRoom);
        vmConf.unsubscribe('ON_PARTICIPANTS_CHANGED',onParticipantsChanged);
        vmConf.unsubscribe('ON_PRESENTERS_CHANGED', onPresentersChanged);
        vmConf.unsubscribe('ON_ROOMS_CHANGED', onRoomsChanged);
        vmConf.exit();
        app.conference = undefined;
      };
    }
  }, [spaceName, app]);

  const enterSpace = useCallback(
    (name: string) => {
      const jwt = localStorage.getItem('vm-jwt');
      if (!jwt) return new Error('login is needed');
      if (!app?.me) return new Error('player is needed');
      if (spaceName) return new Error('already in space');
      if (name === '') return new Error('Name is needed');
      setSpaceName(name);
    },
    [spaceName, app],
  );

  const exitSpace = useCallback(() => {
    setSpaceName(undefined);
  }, []);

  return {
    participants,
    nowPresenters,
    nowRoomParticipants,
    enterSpace,
    exitSpace,
    enterRoom: useCallback((roomName: string) => vmConf.enterRoom(roomName), [spaceName, app]),
    exitRoom: useCallback((roomName: string) => vmConf.exitRoom(roomName), [spaceName, app]),
  };
};
