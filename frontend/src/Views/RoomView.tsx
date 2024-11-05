import React, { useEffect, useState } from 'react';
import socket from '../api/socket';

interface RoomViewProps {
    roomId: string;
    roomRole: string;
    onLeave: () => void;
    onGameStart: (type: string, players: string[], extraInfo: unknown) => void;
}

const RoomView: React.FC<RoomViewProps> = ({ roomId, roomRole, onLeave, onGameStart }) => {
    const [playersList, setPlayersList] = useState<string[]>([]);
    const [selectedPlayer, setSelectedPlayer] = useState<string>('');

    useEffect(() => {
        // Listen for player list updates
        socket.on('playerListUpdated', (players: string[]) => {
            setPlayersList(players);
        });

        socket.on('gameStarted', ({ type, players, extraInfo }: { type: string, players: string[], extraInfo: unknown }) => {
            onGameStart(type, players, extraInfo);
        });

        socket.on('kicked', (kickedRoomId) => {
            if (kickedRoomId == roomId) {
                onLeave();
            }
        });

        // Cleanup listener on component unmount
        return () => {
            socket.off('playerListUpdated');
        };
    }, []);

    const handleKickPlayer = () => {
        if (roomId && selectedPlayer) {
            socket.emit('kickPlayer', { roomId, player: selectedPlayer });
        }
    };

    const handleStartGame = () => {
        if (roomId) {
            socket.emit('startGame', roomId);
        }
    };

    return (
        <div>
            <h2>Welcome to Room {roomId}!</h2>
            <p>You have successfully joined the room as {roomRole}.</p>

            <h2>Players in Room:</h2>
            <ul>
                {playersList.map(player => (
                    <li key={player}>{player}</li>
                ))}
            </ul>

            {roomRole === 'Admin' && (
                <div>
                    <h3>Admin Controls:</h3>
                    <button onClick={handleStartGame}>Start Game</button>

                    <div style={{ marginTop: '8px' }}>
                        <select
                            value={selectedPlayer}
                            onChange={(e) => setSelectedPlayer(e.target.value)}
                        >
                            <option value="">Select a player to kick</option>
                            {playersList.map(playerId => (
                                <option key={playerId} value={playerId}>
                                    {playerId}
                                </option>
                            ))}
                        </select>
                        <button onClick={handleKickPlayer} disabled={!selectedPlayer}>
                            Kick Player
                        </button>
                    </div>
                </div>
            )}

            <div>
                <button onClick={() => { socket.emit('leaveRoom', roomId); onLeave(); }}>
                    Leave Room
                </button>
            </div>
        </div>
    );
};

export default RoomView;
