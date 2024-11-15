"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.socketIdToSocket = void 0;
const _1 = require(".");
const socketIdToSocket = (socketId) => {
    const socket = _1.socketsServer.sockets.sockets.get(socketId);
    if (!socket) {
        throw new Error('trying to get nonexisting Socket');
    }
    return socket;
};
exports.socketIdToSocket = socketIdToSocket;
