import { Client } from "../src";
import { Message } from "./shared";
import WebSocket from "ws";

const client = new Client("ws://localhost:8080");

client.message(Message, (msg) => {
    console.log("CLIENT MESSAGE GOT", msg);
});

client.on("connect", () => {
    console.log("Connected!");

    console.log("Sending sample message.");

    client.send(
        Message.encode({
            content: "My message contents.",
            id: 0,
            author: {
                username: "me",
            },
        })
    );
});

client.on("disconnect", () => {
    console.log("Damn, we got disconnected :(");
});
