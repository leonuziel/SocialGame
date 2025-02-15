import React, { useState } from 'react';
import { GameType } from '../utils';
import { Socket } from 'socket.io-client';

const JoinRoom: React.FC<{ onJoin: (roomId: string, gameType: GameType, role: string, players: string[]) => void, socket: Socket }> = ({ onJoin, socket }) => {
    const [room, setRoom] = useState<string>('');
    const [status, setStatus] = useState<string>('');

    const handleJoinRoom = () => {
        if (room) {
            socket.emit('joinRoom', room, (success: boolean, room: string, gameType: GameType, players: string[], role: 'Admin' | 'member', message: string) => {
                if (success) {
                    setStatus(`Successfully joined room: ${room}`);
                    onJoin(room, gameType, role, players)
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