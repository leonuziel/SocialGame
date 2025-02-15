import React from 'react';
import JoinRoom from '../Rooms/JoinRoom';
import { GameType } from '../utils';
import { Socket } from 'socket.io-client';

const LobbyView: React.FC<{ onJoin: (roomId: string, gameType: GameType, role: string, players: string[]) => void, socket: Socket }> = ({ onJoin, socket }) => {
  return (
    <div>
      <h1>Welcome to the Room App</h1>
      <JoinRoom onJoin={onJoin} socket={socket} />
    </div>
  );
};

export default LobbyView;
