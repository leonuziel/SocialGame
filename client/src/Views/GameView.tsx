import React from 'react';
import { GameType } from '../utils';
import TriviaGame from '../Games/Trivia';

interface GameViewProps {
  roomId: string;
  roomRole: string;
  gameType: GameType;
  onLeave?: () => void;
}
const GameView: React.FC<GameViewProps> = ({ roomId, roomRole, gameType }) => {
  return (
    <div>
      <h1>Welcome to the Game {gameType} App</h1>
      <h2>You are {roomRole} in this game</h2>
      <h3>Enjoy</h3>
      <p>id:{roomId}</p>
      <TriviaGame roomId={roomId} roomRole={roomRole} />
    </div>
  );
};

export default GameView;
