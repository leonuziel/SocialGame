import React from 'react';
import JoinRoom from '../Rooms/JoinRoom';

const LobbyView: React.FC<{ onJoin: (roomId: string, role: string, players: string[]) => void }> = ({ onJoin }) => {
  return (
    <div>
      <h1>Welcome to the Room App</h1>
      <JoinRoom onJoin={onJoin} />
    </div>
  );
};

export default LobbyView;
