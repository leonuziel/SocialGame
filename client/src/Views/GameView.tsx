import React from 'react';
import { GameType } from '../utils';
import TriviaGame from '../Games/Trivia';
import ToohakGame from '../Games/Toohak';

interface GameViewProps {
  roomId: string;
  roomRole: string;
  gameType: GameType;
  onLeave?: () => void;
}
const GameView: React.FC<GameViewProps> = ({ roomId, roomRole, gameType }) => {
  const renderGame = () => {
    switch (gameType) {
      case GameType.Trivia:
        return <TriviaGame roomId={roomId} roomRole={roomRole} />
      case GameType.Toohak:
        return <ToohakGame roomId={roomId} roomRole={roomRole} />
      default:
        return null;
    }
  }
  return (
    <div>
      <h1>Welcome to the Game {gameType} App</h1>
      <h2>You are {roomRole} in this game</h2>
      <h3>Enjoy</h3>
      <p>id:{roomId}</p>
      {renderGame()}
    </div>
  );
};

export default GameView;
