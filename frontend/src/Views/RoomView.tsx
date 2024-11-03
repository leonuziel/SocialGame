import React, { useEffect, useState } from 'react';
import socket from '../api/socket';

const RoomView: React.FC<{ roomId: string, roomRole: string, onLeave: () => void }> = ({ roomId, roomRole, onLeave }) => {
    const [playersList, setPlayersList] = useState<any[]>([]);

    useEffect(() => {
        socket.on('playerListUpdated', (players: any[]) => {
            setPlayersList(players);
        });
        // Cleanup listener on component unmount
        return () => {
            socket.off('playerListUpdated');
        };
    }, []);
    return (
        <div>
            <h2>Welcome to the Room {roomId}!</h2>
            <p>You have successfully joined the room, as {roomRole}.</p>

            <h2>Players in Room:</h2>
            <ul>
                {playersList.map(player => { return <li>{player}</li> })}
            </ul>

            <div>
                <h3>Admin Controls:</h3>
                <button onClick={() => {
                    if (roomId) {
                        socket.emit('startGame', roomId);
                    }
                }}>Start Game</button>
                <select id="kickPlayerSelect" >
                    {playersList.map(player => { return <option>{player}</option> })}
                </select>
                <button onClick={() => {
                    const targetID: string = '0';//kickPlayerSelect.value;
                    if (roomId && targetID) {
                        socket.emit('kickPlayer', { roomID: roomId, targetID });
                    }
                }}>Kick Player</button>
            </div>

            <div>
                <button onClick={() => { socket.emit('leaveRoom', roomId); onLeave() }}>Leave Room</button>
            </div>
        </div>
    );
};

export default RoomView;
