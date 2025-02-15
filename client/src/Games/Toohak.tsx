import React, { useState, useEffect } from 'react';
import socket from '../api/socket'; // Assuming this is your socket instance

interface ToohakGameViewProps {
    roomId: string;
    roomRole: string;
}

enum GameState {
    LoadingScreen,
    QuestionScreen,
    WaitingScreen,
    EndGameScreen
}

interface QuestionData { questionId: number, question: string, options: string[] }

const ToohakGame: React.FC<ToohakGameViewProps> = ({ roomId, roomRole }) => {
    const [gameState, setGameState] = useState<GameState>(GameState.LoadingScreen)
    const [questionData, setQuestionData] = useState<QuestionData>({ question: '', questionId: -1, options: [] });

    const handleLeave = () => { }
    useEffect(() => {
        // Handle incoming messages
        socket.on('question', (data: QuestionData) => {
            setGameState(GameState.QuestionScreen)
            setQuestionData(data); // Update state with received question data
        });

        socket.on('endGame', (data) => {
            console.log('endGameData')
            console.table(data)
            setGameState(GameState.EndGameScreen)
        })

        // Join the room on component mount
        socket.emit('joinGame', { roomId, role: roomRole }, () => {
            console.log('joined room?')
        });

        return () => {
            // Leave the room on component unmount
            socket.emit('leaveRoom', { roomId });
            socket.disconnect();
        };
    }, [roomId, roomRole]);

    const submitAnswer = (index: number) => {
        socket.emit('submitAnswer', questionData.questionId, index)
    }
    // ... Rest of the component logic using questionData ...

    const AdminStartWithQuestions = () => {
        socket.emit('startQuestions')
    };

    const renderScreen = () => {
        switch (gameState) {
            case GameState.LoadingScreen:
                return (
                    <div>
                        <div>Loading</div>
                        {roomRole === "Admin" && <button onClick={AdminStartWithQuestions}>Start</button>}
                    </div>
                )
            case GameState.WaitingScreen:
                return <div>Waiting Next Qestion</div>
            case GameState.QuestionScreen:
                return <div className="toohak-game-view">
                    {/* Display content based on questionData */}
                    {questionData ? (
                        <>
                            <h2>Question: {questionData.question}</h2>
                            {questionData.options.map(option => <div>option</div>)}
                            {/* ... Render answer options, timer, and score using questionData */}
                        </>
                    ) : (
                        <p>Waiting for question...</p>
                    )}

                    {/* Button to leave the game */}
                    <button onClick={handleLeave}>Leave Game</button>
                </div>

            case GameState.EndGameScreen:
                return <div className="toohak-end-game">
                    Game Ended
                </div>
            default:
                throw Error("Unrecognized State")
        }
    }

    return renderScreen()
};

export default ToohakGame;