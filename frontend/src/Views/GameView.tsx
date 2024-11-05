import React from 'react';
import JoinRoom from '../Rooms/JoinRoom';
import logo from '../logo.svg';

interface GameViewProps {
  roomId: string;
  roomRole: string;
  gameType: string
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
