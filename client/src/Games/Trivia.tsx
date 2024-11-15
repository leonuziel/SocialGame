import React, { useEffect, useState } from 'react';
import socket from '../api/socket';

interface TriviaGameViewProps {
    roomId: string;
    roomRole: string;
    onLeave?: () => void;
}
const TriviaGame: React.FC<TriviaGameViewProps> = ({ roomId, roomRole }) => {
    const [question, setQuestion] = useState<{ question: string, options: string[] }>({ question: '', options: [] });
    const [selectedValue, setSelectedValue] = useState<number>(-1);

    useEffect(() => {
        socket.emit('getQuestion', (question: string, options: string[]) => {
            setQuestion({ question, options })
        });
    }, []);

    const submitAnswer = () => {
        console.log(`submitting ${selectedValue} - ${question.options[selectedValue]}`);
        socket.emit('submitAnswer', selectedValue, (isTrue: boolean) => {
            console.log(`answer is True`);
        });
    };

    return (
        <div>
            <h1>Trivia Game</h1>
            <h2>{question.question}</h2>
            <select
                value={selectedValue}
                onChange={(e) => setSelectedValue(Number.parseInt(e.target.value))}
            >
                <option value={-1}>Select a player to kick</option>
                {question.options.map((option, index) => (
                    <option key={option} value={index}>
                        {option}
                    </option>
                ))}
            </select>
            <button id="submitAnswerButton" onClick={submitAnswer}>Submit Answer</button>
        </div>
    );
};

export default TriviaGame;
