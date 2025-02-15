import React, { useEffect, useState } from 'react';
import './App.css';
import LobbyView from './Views/LobbyView';
import RoomView from './Views/RoomView';
import GameView from './Views/GameView';
import { GameType } from './utils';
import ServerSocket from './api/socket';
import { Socket } from 'socket.io-client';

enum GameState { Lobby, Room, Game }

interface roomData {
  id: string
  gameType: GameType
  roleInRoom: string
  players: string[]
}

const App: React.FC = () => {
  const [socket, _] = useState<Socket>(ServerSocket)
  const [state, setState] = useState<GameState>(GameState.Lobby);
  const [roomData, setRoomData] = useState<roomData>({ id: '', gameType: GameType.None, roleInRoom: '', players: [] });


  const onRoomJoin: (roomId: string, gameType: GameType, role: string, players: string[]) => void = (roomId, gametype, role, players) => {
    setState(GameState.Room);
    setRoomData({ id: roomId, gameType: gametype, roleInRoom: role, players: players })
  }

  const renderView = () => {
    switch (state) {
      case GameState.Lobby:
        return <LobbyView onJoin={onRoomJoin} socket={socket} />;
      case GameState.Room:
        return <RoomView roomId={roomData.id} gameType={roomData.gameType} initialPlayers={roomData.players} roomRole={roomData.roleInRoom} onLeave={handleLeaveRoom} onGameStart={handleGameStart} />;
      case GameState.Game:
        return <GameView roomId={roomData.id} roomRole={roomData.roleInRoom} gameType={roomData.gameType} />;
      default:
        throw new Error('unrecognized game state');
    }
  }

  const handleLeaveRoom = () => {
    setState(GameState.Lobby);
    setRoomData({ id: '', gameType: GameType.None, roleInRoom: '', players: [] });
  }


  const handleGameStart = (type: GameType, players: string[], extraInfo: unknown) => {
    setRoomData((oldData) => {
      return { ...oldData, gameType: type, players: players };
    });
    setState(GameState.Game);
  }

  return (
    <div className="App">
      <header className="App-header">
        {renderView()}
      </header>
    </div>
  );
}

export default App;
