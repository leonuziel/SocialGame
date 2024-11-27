import React, { useEffect, useState } from 'react';
import socket from '../api/socket';
import { GameType } from '../utils';
import './RoomView.css';

interface RoomViewProps {
    roomId: string;
    roomRole: string;
    initialPlayers: string[];
    onLeave: () => void;
    onGameStart: (type: GameType, players: string[], extraInfo: unknown) => void;
}

const RoomView: React.FC<RoomViewProps> = ({ roomId, roomRole, initialPlayers, onLeave, onGameStart }) => {
    const [playersList, setPlayersList] = useState<string[]>(initialPlayers);
    const [selectedPlayer, setSelectedPlayer] = useState<string>('');
    const [windowHeight, setWindowHeight] = useState<number>(window.innerHeight);

    // Update height on window resize
    useEffect(() => {
        const handleResize = () => {
            setWindowHeight(window.innerHeight - 500);
        };

        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    useEffect(() => {
        socket.on('playerListUpdated', (players: string[]) => {
            setPlayersList(players);
        });

        socket.on('gameStarted', ({ type, players, extraInfo }: { type: GameType, players: string[], extraInfo: unknown }) => {
            onGameStart(type, players, extraInfo);
        });

        socket.on('kicked', (kickedRoomId: string) => {
            if (kickedRoomId === roomId) {
                onLeave();
            }
        });

        // Cleanup listener on component unmount
        return () => {
            socket.off('playerListUpdated');
            socket.off('gameStarted');
            socket.off('kicked');
        };
    }, [onGameStart, onLeave, roomId]);

    const handleKickPlayer = () => {
        if (roomId && selectedPlayer) {
            socket.emit('kickPlayer', { roomId, player: selectedPlayer });
        }
    };

    const handleStartGame = () => {
        if (roomId) {
            socket.emit('startGame', roomId, (success: boolean, gameType: GameType, players: string[], extraInfo: unknown) => {
                if (success) onGameStart(gameType, players, extraInfo);
            });
        }
    };

    return (
        <div className="lobby" style={{ height: windowHeight }}>
            <h1>Welcome to the Lobby</h1>
            <div className="game-details">
                <h2>Game: {GameType.Trivia}</h2>
                <p>Rounds: {null}</p>
                <p>Special Rules: {null}</p>
            </div>
            <h2>Welcome to Room {roomId}!</h2>
            <p>You have successfully joined the room as {roomRole}.</p>

            <div className="players-list">
                <h2>Players:</h2>
                <ul>
                    {playersList.map(player => (
                        <li key={player}>
                            {player}
                        </li>
                    ))}
                </ul>
            </div>
            <button className="ready-button">I'm Ready!</button>

            <div className="leave-button-container">
                <button onClick={() => { socket.emit('leaveRoom', roomId); onLeave(); }} className="leave-button">
                    Leave Room
                </button>
            </div>

            {roomRole === 'Admin' && (
                <div className="admin-controls">
                    <h3>Admin Controls:</h3>
                    <button onClick={handleStartGame} className="admin-button">Start Game</button>

                    <div className="kick-player">
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
                        <button
                            onClick={handleKickPlayer}
                            disabled={!selectedPlayer}
                            className="admin-button"
                        >
                            Kick Player
                        </button>
                    </div>
                </div>
            )}
        </div >
    );
};

export default RoomView;
