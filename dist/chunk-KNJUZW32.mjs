import {
  base64ToArrayBuffer,
  concatTypedArrays,
  makeid
} from "./chunk-26AWPMYL.mjs";

// src/client.ts
import WebSocket from "ws";
import { bd, be } from "@justcoding123/byteencoder";
var BaseClient = class {
  constructor(socket) {
    this._socket = socket;
    this._callbacks = /* @__PURE__ */ new Map();
    this._messages = /* @__PURE__ */ new Map();
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
        data = base64ToArrayBuffer(data);
      else
        return socket.close();
      this._got_message(data);
    });
    this._socket.addEventListener("close", () => {
      this._trigger("disconnect");
    });
  }
  _trigger(eventName, ...args) {
    for (const cb of this._callbacks.get(eventName) || [])
      cb(...args);
  }
  _got_message(data) {
    const decoder = bd.new(bd.string());
    let id;
    try {
      id = decoder.decode(data, false);
    } catch {
      return this._socket.close();
    }
    if (!this._messages.has(id)) {
      return this._socket.close();
    }
    const obj = this._messages.get(id);
    obj.callback(obj.object.decode(data.slice(decoder.offset)));
  }
  send(object) {
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
  on(event, callback) {
    if (!this._callbacks.get(event))
      this._callbacks.set(event, []);
    this._callbacks.set(
      event,
      this._callbacks.get(event).concat(callback)
    );
    return this;
  }
  message(event, callback) {
    this._messages.set(event.id, {
      object: event,
      callback
    });
    return this;
  }
};
var Client = class extends BaseClient {
  constructor(url, options) {
    super(new WebSocket(url, options));
  }
};

export {
  BaseClient,
  Client
};
