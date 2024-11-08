import React from 'react';
import JoinRoom from '../Rooms/JoinRoom';
import logo from '../logo.svg';
import { GameType } from '../../../backend/src/Games/GameUtils';

interface GameViewProps {
  roomId: string;
  roomRole: string;
  gameType: GameType;
  onLeave?: () => void;
}
const GameView: React.FC<GameViewProps> = ({ roomId, roomRole, gameType }) => {
  return (
    <div>
      <img src={logo} className="App-logo" alt="logo" />
      <h1>Welcome to the Game {gameType} App</h1>
      <h2>You are {roomRole} in this game</h2>
      <h3>Enjoy</h3>
      <p>id:{roomId}</p>
    </div>
  );
};

export default GameView;
