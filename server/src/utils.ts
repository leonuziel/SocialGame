import { Socket, Server } from "socket.io";
import { socketsServer } from ".";
import { RoomManagementClientToServerEvents, RoomManagementServerToClientEvents } from "./serverInterfaces";


export type clientToServerEvents = RoomManagementClientToServerEvents;
export type serverToClientEvents = RoomManagementServerToClientEvents;
export type interServerEvents = {};
export interface SocketData {
    name: string;
    age: number;
}

export type SocialGameSocket = Socket<clientToServerEvents, serverToClientEvents, interServerEvents, SocketData>;

export const socketIdToSocket: (socketId: string) => SocialGameSocket = (socketId: string) => {
    const socket = socketsServer.sockets.sockets.get(socketId);
    if (!socket) {
        throw new Error('trying to get nonexisting Socket');
    }
    return socket;
}