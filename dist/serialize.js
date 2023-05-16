"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
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
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/serialize.ts
var serialize_exports = {};
__export(serialize_exports, {
  ByteObject: () => ByteObject,
  createObject: () => createObject,
  float: () => float,
  int: () => int,
  uint: () => uint
});
module.exports = __toCommonJS(serialize_exports);
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
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  ByteObject,
  createObject,
  float,
  int,
  uint
});
