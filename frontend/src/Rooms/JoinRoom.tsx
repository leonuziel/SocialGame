import React, { useEffect, useState } from 'react';
import socket from '../api/socket';

const JoinRoom: React.FC<{ onJoin: (roomId: string, role: string, players: string[]) => void }> = ({ onJoin }) => {
    const [room, setRoom] = useState<string>('');
    const [status, setStatus] = useState<string>('');

    const handleJoinRoom = () => {
        if (room) {
            socket.emit('joinRoom', room, (success: boolean, room: string, players: string[], role: 'Admin' | 'member', message: string) => {
                if (success) {
                    setStatus(`Successfully joined room: ${room}`);
                    onJoin(room, role, players)
                } else {
                    setStatus(message);
                }
            });
        } else {
            setStatus('Please enter a room name or ID.');
        }
    };
    return (
        <div>
            <h2>Join a Room</h2>
            <input
                type="text"
                placeholder="Enter room name or ID"
                value={room}
                onChange={(e) => setRoom(e.target.value)}
            />
            <button onClick={handleJoinRoom}>Join Room</button>
            <p>{status}</p>
        </div>
    );
};
export default JoinRoom;