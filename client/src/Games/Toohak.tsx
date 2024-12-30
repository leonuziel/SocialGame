import React, { useState, useEffect } from 'react';
import socket from '../api/socket'; // Assuming this is your socket instance

interface ToohakGameViewProps {
    roomId: string;
    roomRole: string;
}

const ToohakGame: React.FC<ToohakGameViewProps> = ({ roomId, roomRole }) => {
    const [questionData, setQuestionData] = useState<any>(null); // Replace `any` with your actual question data type

    const handleLeave = () => { }
    useEffect(() => {
        // Handle incoming messages
        socket.on('question', (data) => {
            setQuestionData(data); // Update state with received question data
        });

        // Join the room on component mount
        socket.emit('joinRoom', { roomId, role: roomRole });

        return () => {
            // Leave the room on component unmount
            socket.emit('leaveRoom', { roomId });
            socket.disconnect();
        };
    }, [roomId, roomRole]);

    // ... Rest of the component logic using questionData ...

    return (
        <div className="toohak-game-view">
            {/* Display content based on questionData */}
            {questionData ? (
                <>
                    <h2>Question: {questionData.question}</h2>
                    {/* ... Render answer options, timer, and score using questionData */}
                </>
            ) : (
                <p>Waiting for question...</p>
            )}

            {/* Button to leave the game */}
            <button onClick={handleLeave}>Leave Game</button>
        </div>
    );
};

export default ToohakGame;