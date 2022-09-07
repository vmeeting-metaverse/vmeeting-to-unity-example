import { VmeetingUser } from '../../../libs/vmeeting/user';
import Media from '../Media';

interface Props {
  participants: Map<string, VmeetingUser>;
  onClickEach?: ({ id }: { id: string }) => void;
}

const ConferenceRoom = ({ participants, onClickEach }: Props) => {
  const renderParticipants = () => {
    const view: JSX.Element[] = [];
    participants.forEach((participant, id) => {
      if (participant.isMe) return;
      view.push(
        <Media
          key={id}
          audioTrack={participant.audio}
          videoTrack={participant.video}
          isLocal={false}
          onClick={onClickEach && (() => onClickEach({ id }))}
          style={{ margin: '0 10px' }}
        />,
      );
    });
    return view;
  };
  return <>{renderParticipants()}</>;
};

export default ConferenceRoom;
