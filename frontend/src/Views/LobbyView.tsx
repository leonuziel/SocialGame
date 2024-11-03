import React from 'react';
import JoinRoom from '../Rooms/JoinRoom';
import logo from '../logo.svg';

const LobbyView: React.FC<{ onJoin: (roomId: string,role:string) => void }> = ({ onJoin }) => {
  return (
    <div>
      <img src={logo} className="App-logo" alt="logo" />
      <h1>Welcome to the Room App</h1>
      <JoinRoom onJoin={onJoin} />
    </div>
  );
};

export default LobbyView;
