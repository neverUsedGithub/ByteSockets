import {
  BaseClient
} from "./chunk-KNJUZW32.mjs";

// src/server.ts
import { WebSocketServer } from "ws";
var Server = class {
  constructor(options) {
    this._wss = new WebSocketServer(options);
    this._callbacks = /* @__PURE__ */ new Map();
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
  _trigger(eventName, ...args) {
    for (const cb of this._callbacks.get(eventName) || [])
      cb(...args);
  }
  on(event, callback) {
    if (!this._callbacks.has(event))
      this._callbacks.set(event, []);
    this._callbacks.set(
      event,
      this._callbacks.get(event).concat(callback)
    );
    return this;
  }
  close() {
    this._wss.close();
  }
};

export {
  Server
};
