import { createObject, int, float, uint } from "../src";
import { z } from "zod";

export const Message = createObject(
    "message",
    z.object({
        content: z.string(),
        id: int(),
        author: z.object({
            username: z.string(),
        }),
    }),
    { stringEncoding: "utf8" }
);
