import React, { useState } from 'react';
import './App.css';
import LobbyView from './Views/LobbyView';
import RoomView from './Views/RoomView';

enum GameState { Lobby, Room, Game }

const App: React.FC = () => {
  const [state, setState] = useState<GameState>(GameState.Lobby);
  const [roomId, setRoomId] = useState<string>('');
  const [roomRole, setRoomRole] = useState<string>('');

  const onRoomJoin: (roomId: string, role: string) => void = (roomId, role) => {
    setState(GameState.Room);
    setRoomRole(role);
    setRoomId(roomId);
  }

  const renderView = () => {
    switch (state) {
      case GameState.Lobby:
        return <LobbyView onJoin={onRoomJoin} />;
      case GameState.Room:
        return <RoomView roomId={roomId} roomRole={roomRole} onLeave={leaveRoom} />;
    }
  }

  const leaveRoom = () => {
    setState(GameState.Lobby);
    setRoomRole('');
    setRoomId('');
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
