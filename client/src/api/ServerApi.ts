export abstract class ServerApi {
    protected static instance: ServerApi;

    public static getInstance(): ServerApi {
        throw new Error("tried to get an instance of an abstract class ServerApi");
        // if (!RoomManager.instance) {
        //     RoomManager.instance = new ServerApi();
        // }
        // return RoomManager.instance;
    }
    protected constructor() { }

    abstract registerEvent(message: string, data: { [k: string]: any }): void;

    abstract emitEvent(message: string, data: { [k: string]: any }): void;
}

export class SocketServerApi extends ServerApi {
    public static override getInstance() {
        if (!SocketServerApi.instance) {
            SocketServerApi.instance = new SocketServerApi();
        }
        return SocketServerApi.instance;
    }

    constructor() {
        super();
        console.log('created a Sockets Conection with the server');
    }

    registerEvent(message: string, data: { [k: string]: any; }): void {
        throw new Error("Method not implemented.");
    }
    emitEvent(message: string, data: { [k: string]: any; }): void {
        throw new Error("Method not implemented.");
    }

}

export class PollingServerApi extends ServerApi {
    public static override getInstance() {
        if (!PollingServerApi.instance) {
            PollingServerApi.instance = new PollingServerApi();
        }
        return PollingServerApi.instance;
    }

    constructor() {
        super();
        console.log('created a http Conection with the server');
    }

    registerEvent(message: string, data: { [k: string]: any; }): void {
        throw new Error("Method not implemented.");
    }
    emitEvent(message: string, data: { [k: string]: any; }): void {
        throw new Error("Method not implemented.");
    }

}