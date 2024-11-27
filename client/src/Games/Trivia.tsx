import React, { useEffect, useState } from 'react';
import socket from '../api/socket';
import './Trivia.css'


interface TriviaGameViewProps {
    roomId: string;
    roomRole: string;
    onLeave?: () => void;
}
const TriviaGame: React.FC<TriviaGameViewProps> = ({ roomId, roomRole }) => {
    const [isGameRunning, setIsGameRunning] = useState(true)
    const [question, setQuestion] = useState<{ question: string, options: string[] }>({ question: '', options: [] });
    const [selectedValue, setSelectedValue] = useState<number>(-1);
    const [state, setState] = useState<{ score: number, questionsLeft: number }>({ score: 0, questionsLeft: 0 });

    useEffect(() => {
        socket.on('endGame', (playerData: { score: number, questionsLeft: number }) => {
            setIsGameRunning(false)
            setState(playerData)
        })
        socket.emit('getQuestion', (question: string, options: string[], playerData: { score: number, questionsLeft: number }) => {
            setQuestion({ question, options });
            setState(playerData)
        });
    }, []);

    const submitAnswer = () => {
        console.log(`submitting ${selectedValue} - ${question.options[selectedValue]}`);
        socket.emit('submitAnswer', selectedValue, (isTrue: boolean, nextQuestion: { question: string, options: string[] }, playerData: { score: number, questionsLeft: number }) => {
            console.log(`answer is ` + isTrue);
            setQuestion(nextQuestion);
            setState(playerData)
        });
    };

    return (
        <div className="trivia-container">
            <h1 className="trivia-title">Trivia Game</h1>
            <h2 className="score">Score: {state.score}</h2>
            {isGameRunning && (
                <>
                    <h2 className="question">{question.question}</h2>
                    <p className="questions-left">Questions Left: {state.questionsLeft}</p>
                    <select className="answer-select" onChange={(e) => setSelectedValue(Number.parseInt(e.target.value))}>
                        <option value={-1}>Select an Answer</option>
                        {question.options.map((option, index) => (
                            <option key={option} value={index}>
                                {option}
                            </option>
                        ))}
                    </select>
                    <button className="submit-button" id="submitAnswerButton" onClick={submitAnswer}>
                        Submit Answer
                    </button>
                </>
            )}
            {!isGameRunning && <h2 className="game-ended">Game Has Ended</h2>}
        </div>
    )
};

export default TriviaGame;
