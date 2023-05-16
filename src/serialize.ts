import { be, bd } from "@justcoding123/byteencoder";
import type { ByteDecoder } from "@justcoding123/byteencoder";
import { z, ZodObject, ZodString, ZodNumber, ZodBoolean, ZodArray } from "zod";
import { makeid } from "./util";
import type Zod from "zod";

function convertValue(
    schema: Zod.AnyZodObject,
    value: any,
    options?: CreateObjectOptions
): { type: string } {
    if (typeof value === "number") {
        if ((schema as any) === CONSTANT_INT) return be.i32(value);
        else if ((schema as any) === CONSTANT_UINT) return be.u32(value);
        else return be.f32(value);
    }

    if (typeof value === "string") {
        return be.string(value, options?.stringEncoding ?? "utf16");
    }

    if (typeof value === "boolean") {
        return be.bool(value);
    }

    if (Array.isArray(value)) {
        const arrOut = [];

        for (const item of value) {
            arrOut.push(convertValue((schema._def as any).type as any, item));
        }

        return be.array(arrOut);
    }

    if (typeof value === "object" && value.constructor === Object) {
        const encoded: Record<string, any> = {};
        for (const [key, val] of Object.entries(value)) {
            encoded[key] = convertValue(schema.shape[key], val, options);
        }

        return be.struct(encoded);
    }

    throw new Error(
        `couldn't convert value of type '${typeof value}' (${
            value.name
        }). ${value}`
    );
}

function encoderFromSchema(
    object: Record<string, any>,
    schema: Zod.AnyZodObject,
    options?: CreateObjectOptions
) {
    const parsed = schema.parse(object);
    return convertValue(schema, parsed, options);
}

function convertSchema(
    schema: Zod.AnyZodObject,
    options?: CreateObjectOptions
): { type: string } {
    if (schema instanceof ZodString) {
        return bd.string();
    }

    if (schema instanceof ZodBoolean) {
        return bd.bool();
    }

    if (schema instanceof ZodNumber) {
        if ((schema as any) === CONSTANT_INT) return bd.i32();
        if ((schema as any) === CONSTANT_UINT) return bd.u32();
        return bd.f32();
    }

    if (schema instanceof ZodArray) {
        return bd.array(
            convertSchema((schema._def as any).type as any, options)
        );
    }

    if (schema instanceof ZodObject) {
        const decoder: Record<string, any> = {};

        for (const [key, val] of Object.entries(schema.shape)) {
            decoder[key] = convertSchema(val as any, options);
        }

        return bd.struct(decoder);
    }

    throw new Error(
        `couldn't convert zod type '${(schema as any)._def.typeName}'`
    );
}

function decoderFromSchema(
    schema: Zod.AnyZodObject,
    options?: CreateObjectOptions
): ByteDecoder {
    const dec = bd.new(convertSchema(schema, options));
    return dec;
}

type CreateObjectOptions = {
    stringEncoding: "utf8" | "utf16";
};

const CONSTANT_INT = z.number().int();
const CONSTANT_UINT = z.number().int().nonnegative();
const CONSTANT_FLOAT = z.number();

export const int = () => CONSTANT_INT;
export const uint = () => CONSTANT_UINT;
export const float = () => CONSTANT_FLOAT;

export class ByteObject<T extends Zod.AnyZodObject> {
    private _decoder: ByteDecoder;
    _type: z.input<T>;

    constructor(
        public id: string,
        private _schema: T,
        private _options?: CreateObjectOptions
    ) {
        this._decoder = decoderFromSchema(_schema);
        this._type = null as any;
    }

    encode(object: z.input<T>) {
        return {
            __type: "encoded-bytes-object" as const,
            __id: this.id,
            data: new Uint8Array(
                be.encode(
                    encoderFromSchema(object, this._schema, this._options)
                )
            ),
        };
    }

    decode(bytes: ArrayBufferLike) {
        return this._decoder.decode(bytes);
    }
}

export function createObject<T extends Zod.AnyZodObject>(
    id: string,
    schema: T,
    options?: CreateObjectOptions
) {
    // TODO: make sure z.input<T> equals z.output<T>
    return new ByteObject(id, schema, options);
}
