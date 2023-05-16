import { Server } from "../src";
import { Message } from "./shared";

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 8080;

const server = new Server({
    port: PORT,
});

server.on("connection", (socket) => {
    console.log(`Welcome ${socket.id}!`);

    // when the socket sends this message
    socket.message(Message, (msg) => {
        console.log("Got chat message", msg);

        socket.send(
            Message.encode({
                content: "Hello there!",
                id: 1,
                author: {
                    username: "system",
                },
            })
        );
    });

    socket.on("disconnect", () => {
        console.log(`Goodbye ${socket.id}!`);
    });
});

server.on("ready", () => {
    console.log(`Listening on: ${PORT}`);
});
