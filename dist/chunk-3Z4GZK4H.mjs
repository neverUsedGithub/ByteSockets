// src/serialize.ts
import { be, bd } from "@justcoding123/byteencoder";
import { z, ZodObject, ZodString, ZodNumber, ZodBoolean, ZodArray } from "zod";
function convertValue(schema, value, options) {
  if (typeof value === "number") {
    if (schema === CONSTANT_INT)
      return be.i32(value);
    else if (schema === CONSTANT_UINT)
      return be.u32(value);
    else
      return be.f32(value);
  }
  if (typeof value === "string") {
    return be.string(value, (options == null ? void 0 : options.stringEncoding) ?? "utf16");
  }
  if (typeof value === "boolean") {
    return be.bool(value);
  }
  if (Array.isArray(value)) {
    const arrOut = [];
    for (const item of value) {
      arrOut.push(convertValue(schema._def.type, item));
    }
    return be.array(arrOut);
  }
  if (typeof value === "object" && value.constructor === Object) {
    const encoded = {};
    for (const [key, val] of Object.entries(value)) {
      encoded[key] = convertValue(schema.shape[key], val, options);
    }
    return be.struct(encoded);
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
  if (schema instanceof ZodString) {
    return bd.string();
  }
  if (schema instanceof ZodBoolean) {
    return bd.bool();
  }
  if (schema instanceof ZodNumber) {
    if (schema === CONSTANT_INT)
      return bd.i32();
    if (schema === CONSTANT_UINT)
      return bd.u32();
    return bd.f32();
  }
  if (schema instanceof ZodArray) {
    return bd.array(
      convertSchema(schema._def.type, options)
    );
  }
  if (schema instanceof ZodObject) {
    const decoder = {};
    for (const [key, val] of Object.entries(schema.shape)) {
      decoder[key] = convertSchema(val, options);
    }
    return bd.struct(decoder);
  }
  throw new Error(
    `couldn't convert zod type '${schema._def.typeName}'`
  );
}
function decoderFromSchema(schema, options) {
  const dec = bd.new(convertSchema(schema, options));
  return dec;
}
var CONSTANT_INT = z.number().int();
var CONSTANT_UINT = z.number().int().nonnegative();
var CONSTANT_FLOAT = z.number();
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
        be.encode(
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

export {
  int,
  uint,
  float,
  ByteObject,
  createObject
};
