import type { IncomingMessage } from "http";
import { BaseClient } from "./client";
import { WebSocketServer } from "ws";
import type WebSocket from "ws";

export class Server {
    private _wss: WebSocketServer;
    private _callbacks: Map<string, ((...args: any) => void)[]>;

    constructor(options?: WebSocket.ServerOptions) {
        this._wss = new WebSocketServer(options);
        this._callbacks = new Map();
        this._wss.on("connection", (socket, request) => {
            socket.binaryType = "arraybuffer";
            const bytesSock = new BaseClient(socket);

            this._trigger("connection", bytesSock, request);
        });

        this._wss.on("close", () => {
            this._trigger("close");
        });

        this._wss.on("listening", () => {
            this._trigger("ready");
        });
    }

    private _trigger(
        eventName: "connection" | "ready" | "close",
        ...args: any[]
    ) {
        for (const cb of this._callbacks.get(eventName) || []) cb(...args);
    }

    on(event: "ready" | "close", callback: () => void): this;
    on(
        event: "connection",
        callback: (socket: BaseClient, request: IncomingMessage) => void
    ): this;
    on(event: string, callback: (...args: any[]) => void): this {
        if (!this._callbacks.has(event)) this._callbacks.set(event, []);
        this._callbacks.set(
            event,
            this._callbacks.get(event)!.concat(callback)
        );
        return this;
    }

    close() {
        this._wss.close();
    }
}
