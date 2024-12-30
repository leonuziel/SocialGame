import React from 'react';
import JoinRoom from '../Rooms/JoinRoom';
import { GameType } from '../utils';

const LobbyView: React.FC<{ onJoin: (roomId: string, gameType:GameType, role: string, players: string[]) => void }> = ({ onJoin }) => {
  return (
    <div>
      <h1>Welcome to the Room App</h1>
      <JoinRoom onJoin={onJoin} />
    </div>
  );
};

export default LobbyView;
