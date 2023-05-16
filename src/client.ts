import { ByteObject } from "./serialize";
import { makeid, concatTypedArrays, base64ToArrayBuffer } from "./util";
import WebSocket from "ws";
import { bd, be } from "@justcoding123/byteencoder";

interface WSMessage {
    object: ByteObject<any>;
    callback: (object: any) => void;
}

export class BaseClient {
    private _socket: WebSocket.WebSocket;
    private _callbacks: Map<string, ((...args: any) => void)[]>;
    private _messages: Map<string, WSMessage>;
    id: string;

    constructor(socket: WebSocket.WebSocket) {
        this._socket = socket;
        this._callbacks = new Map();
        this._messages = new Map();
        this.id = makeid(20);

        this._socket.addEventListener("open", () => {
            this._trigger("connect");
        });

        this._socket.addEventListener("close", () => {
            this._trigger("disconnect");
        });

        this._socket.addEventListener("message", (ev) => {
            let data = ev.data;
            if (typeof ev.data === "string")
                data = base64ToArrayBuffer(data as string);
            // Not binary, disconnect.
            else return socket.close();

            this._got_message(data as ArrayBuffer);
        });

        this._socket.addEventListener("close", () => {
            this._trigger("disconnect");
        });
    }

    private _trigger(eventName: "disconnect" | "connect", ...args: any[]) {
        for (const cb of this._callbacks.get(eventName) || []) cb(...args);
    }

    private _got_message(data: ArrayBuffer) {
        const decoder = bd.new(bd.string());
        let id: string;

        try {
            id = decoder.decode(data, false) as string;
        } catch {
            // Invalid message, disconnect.
            return this._socket.close();
        }

        if (!this._messages.has(id)) {
            // Invalid id, disconnect.
            return this._socket.close();
        }

        const obj: WSMessage = this._messages.get(id)!;
        obj.callback(obj.object.decode(data.slice(decoder.offset)));
    }

    send(object: {
        __type: "encoded-bytes-object";
        __id: string;
        data: Uint8Array;
    }) {
        if (object.__type !== "encoded-bytes-object")
            throw new Error(
                "You should only call 'send' with the return value of BytesObject.encode"
            );

        this._socket.send(
            Buffer.from(
                concatTypedArrays(
                    new Uint8Array(be.encode(be.string(object.__id))),
                    object.data
                )
            ).toString("base64")
        );
    }

    on(event: "disconnect" | "connect", callbck: () => void): this;
    on(event: string, callback: (...args: any) => void): this {
        if (!this._callbacks.get(event)) this._callbacks.set(event, []);
        this._callbacks.set(
            event,
            this._callbacks.get(event)!.concat(callback)
        );
        return this;
    }

    message<T extends ByteObject<any>>(
        event: T,
        callback: (data: T["_type"]) => void
    ): this {
        this._messages.set(event.id, {
            object: event,
            callback: callback,
        });
        return this;
    }
}

export class Client extends BaseClient {
    constructor(url: string, options?: WebSocket.ClientOptions) {
        super(new WebSocket(url, options));
    }
}
