"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var src_exports = {};
__export(src_exports, {
  Client: () => Client,
  Server: () => Server,
  createObject: () => createObject,
  float: () => float,
  int: () => int,
  uint: () => uint
});
module.exports = __toCommonJS(src_exports);

// src/serialize.ts
var import_byteencoder = require("@justcoding123/byteencoder");
var import_zod = require("zod");
function convertValue(schema, value, options) {
  if (typeof value === "number") {
    if (schema === CONSTANT_INT)
      return import_byteencoder.be.i32(value);
    else if (schema === CONSTANT_UINT)
      return import_byteencoder.be.u32(value);
    else
      return import_byteencoder.be.f32(value);
  }
  if (typeof value === "string") {
    return import_byteencoder.be.string(value, (options == null ? void 0 : options.stringEncoding) ?? "utf16");
  }
  if (typeof value === "boolean") {
    return import_byteencoder.be.bool(value);
  }
  if (Array.isArray(value)) {
    const arrOut = [];
    for (const item of value) {
      arrOut.push(convertValue(schema._def.type, item));
    }
    return import_byteencoder.be.array(arrOut);
  }
  if (typeof value === "object" && value.constructor === Object) {
    const encoded = {};
    for (const [key, val] of Object.entries(value)) {
      encoded[key] = convertValue(schema.shape[key], val, options);
    }
    return import_byteencoder.be.struct(encoded);
  }
  throw new Error(
    `couldn't convert value of type '${typeof value}' (${value.name}). ${value}`
  );
}
function encoderFromSchema(object, schema, options) {
  const parsed = schema.parse(object);
  return convertValue(schema, parsed, options);
}
function convertSchema(schema, options) {
  if (schema instanceof import_zod.ZodString) {
    return import_byteencoder.bd.string();
  }
  if (schema instanceof import_zod.ZodBoolean) {
    return import_byteencoder.bd.bool();
  }
  if (schema instanceof import_zod.ZodNumber) {
    if (schema === CONSTANT_INT)
      return import_byteencoder.bd.i32();
    if (schema === CONSTANT_UINT)
      return import_byteencoder.bd.u32();
    return import_byteencoder.bd.f32();
  }
  if (schema instanceof import_zod.ZodArray) {
    return import_byteencoder.bd.array(
      convertSchema(schema._def.type, options)
    );
  }
  if (schema instanceof import_zod.ZodObject) {
    const decoder = {};
    for (const [key, val] of Object.entries(schema.shape)) {
      decoder[key] = convertSchema(val, options);
    }
    return import_byteencoder.bd.struct(decoder);
  }
  throw new Error(
    `couldn't convert zod type '${schema._def.typeName}'`
  );
}
function decoderFromSchema(schema, options) {
  const dec = import_byteencoder.bd.new(convertSchema(schema, options));
  return dec;
}
var CONSTANT_INT = import_zod.z.number().int();
var CONSTANT_UINT = import_zod.z.number().int().nonnegative();
var CONSTANT_FLOAT = import_zod.z.number();
var int = () => CONSTANT_INT;
var uint = () => CONSTANT_UINT;
var float = () => CONSTANT_FLOAT;
var ByteObject = class {
  constructor(id, _schema, _options) {
    this.id = id;
    this._schema = _schema;
    this._options = _options;
    this._decoder = decoderFromSchema(_schema);
    this._type = null;
  }
  encode(object) {
    return {
      __type: "encoded-bytes-object",
      __id: this.id,
      data: new Uint8Array(
        import_byteencoder.be.encode(
          encoderFromSchema(object, this._schema, this._options)
        )
      )
    };
  }
  decode(bytes) {
    return this._decoder.decode(bytes);
  }
};
function createObject(id, schema, options) {
  return new ByteObject(id, schema, options);
}

// src/util.ts
function makeid(length) {
  let result = "";
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const charactersLength = characters.length;
  let counter = 0;
  while (counter < length) {
    result += characters.charAt(
      Math.floor(Math.random() * charactersLength)
    );
    counter += 1;
  }
  return result;
}
function base64ToArrayBuffer(base64) {
  const binaryString = Buffer.from(base64, "base64").toString("ascii");
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}
function concatTypedArrays(a, b) {
  var c = new Uint8Array(a.length + b.length);
  c.set(a, 0);
  c.set(b, a.length);
  return c;
}

// src/client.ts
var import_ws = __toESM(require("ws"));
var import_byteencoder2 = require("@justcoding123/byteencoder");
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
    const decoder = import_byteencoder2.bd.new(import_byteencoder2.bd.string());
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
          new Uint8Array(import_byteencoder2.be.encode(import_byteencoder2.be.string(object.__id))),
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
    super(new import_ws.default(url, options));
  }
};

// src/server.ts
var import_ws2 = require("ws");
var Server = class {
  constructor(options) {
    this._wss = new import_ws2.WebSocketServer(options);
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
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  Client,
  Server,
  createObject,
  float,
  int,
  uint
});
