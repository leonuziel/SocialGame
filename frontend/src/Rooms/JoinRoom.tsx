import React, { useEffect, useState } from 'react';
import socket from '../api/socket';

const JoinRoom: React.FC<{ onJoin: (roomId: string, role: string) => void }> = ({ onJoin }) => {
    const [room, setRoom] = useState<string>('');
    const [status, setStatus] = useState<string>('');


    useEffect(() => {
        // Listen for server confirmation of joining the room
        socket.on('joinedRoom', (data: { success: boolean, room: string, role: string, message: string }) => {
            if (data.success) {
                setStatus(`Successfully joined room: ${data.room}`);
                onJoin(data.room, data.role)
            } else {
                setStatus(data.message);
            }
        });

        // Cleanup listener on component unmount
        return () => {
            socket.off('joinedRoom');
        };
    }, []);

    const handleJoinRoom = () => {
        if (room) {
            socket.emit('joinRoom', room);
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