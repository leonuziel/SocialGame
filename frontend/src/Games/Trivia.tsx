import React, { useEffect } from 'react';
import socket from '../api/socket';

interface TriviaGameViewProps {
    roomId: string;
    roomRole: string;
    onLeave?: () => void;
}
const TriviaGame: React.FC<TriviaGameViewProps> = ({ roomId, roomRole }) => {

    useEffect(() => {
        socket.emit('getQuestion', (question: string, options: string[]) => {
            console.log(`got question - ${question}`);
            console.table(options);
        });
    }, []);

    return (
        <div>Trivia Game
        </div>
    );
};

export default TriviaGame;
