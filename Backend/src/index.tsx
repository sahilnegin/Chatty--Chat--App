
// harkirat's code

// import { WebSocketServer, WebSocket } from "ws";

// const wss = new WebSocketServer({ port: 8080 });

// interface User {
//     socket: WebSocket;
//     room: string;
// }

// let allSocket: User[] = [];

// wss.on("connection", (socket) => {
//     socket.on("message", (message) => {
//         let parsedMessage;
//         try {
//             parsedMessage = JSON.parse(message.toString());
//             console.log(parsedMessage)
//         } catch (err) {
//             console.log("INVALID ERROR", err);
//             return;
//         }

//         if (parsedMessage.type === "join") {
//             allSocket.push({
//                 socket,
//                 room: parsedMessage.payload.roomId
//             });
//         }
//         console.log("above chat ")
//         if (parsedMessage.type === "chat") {
//             let currentUserRoom = null;

//             for (let i = 0; i < allSocket.length; i++) {
//                 if (allSocket[i].socket === socket) {
//                     currentUserRoom = allSocket[i].room;
//                     break;
//                 }
//             }
//             console.log("below chat and above sending logic ")
//             if (currentUserRoom) {
//                 for (let i = 0; i < allSocket.length; i++) {
//                     if (allSocket[i].room === currentUserRoom && allSocket[i].socket !== socket) {
//                         allSocket[i].socket.send(parsedMessage.payload.message);
//                     }
//                 }
//             }
//         }
//     });

//     socket.on("close", () => {
//         allSocket = allSocket.filter((user) => user.socket !== socket);
//     });
// });


// import { WebSocketServer, WebSocket } from "ws";
// import jwt from 'jsonwebtoken'; // Make sure you have the 'jsonwebtoken' package installed

// const wss = new WebSocketServer({ port: 8080 });

// interface User {
//     socket: WebSocket;
//     room: string;
//     username: string; // Store the username (or any other user-related data you need)
// }

// let allSocket: User[] = [];

// // Handle incoming WebSocket connections
// wss.on("connection", (socket, req) => {
//     const token = req.url?.split('token=')[1];  // Extract JWT from URL

//     // If no token, close the connection
//     if (!token) {
//         socket.close();
//         return;
//     }

//     try {
//         // Verify the JWT
//         const decodedUser = jwt.verify(token, process.env.JWT_SECRET as string);  // Use your secret key from environment variables
//         console.log('User authenticated:', decodedUser);

//         // Add user to allSocket array
//         const username = decodedUser?.username; // assuming the JWT contains the username
//         if (!username) {
//             socket.close();
//             return;
//         }

//         // Listen for messages after the user is authenticated
//         socket.on("message", (message) => {
//             let parsedMessage;
//             try {
//                 parsedMessage = JSON.parse(message.toString());
//                 console.log(parsedMessage);
//             } catch (err) {
//                 console.log("INVALID ERROR", err);
//                 return;
//             }

//             // Handle join message to add user to room
//             if (parsedMessage.type === "join") {
//                 allSocket.push({
//                     socket,
//                     room: parsedMessage.payload.roomId,
//                     username: username,
//                 });
//             }

//             // Handle chat message and broadcast to others in the same room
//             if (parsedMessage.type === "chat") {
//                 let currentUserRoom = null;

//                 // Find the user's room from allSocket array
//                 for (let i = 0; i < allSocket.length; i++) {
//                     if (allSocket[i].socket === socket) {
//                         currentUserRoom = allSocket[i].room;
//                         break;
//                     }
//                 }

//                 // If the user is in a room, broadcast the message to all other users in that room
//                 if (currentUserRoom) {
//                     for (let i = 0; i < allSocket.length; i++) {
//                         if (allSocket[i].room === currentUserRoom && allSocket[i].socket !== socket) {
//                             allSocket[i].socket.send(JSON.stringify({
//                                 type: 'chat',
//                                 payload: { message: parsedMessage.payload.message, username }
//                             }));
//                         }
//                     }
//                 }
//             }
//         });

//     } catch (err) {
//         console.log('Invalid token');
//         socket.close(); // Close connection if the token is invalid
//     }

//     // Handle socket closure
//     socket.on("close", () => {
//         allSocket = allSocket.filter((user) => user.socket !== socket);
//     });
// });






import { WebSocketServer, WebSocket } from "ws";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config(); // Load .env vars like JWT_SECRET

interface User {
    socket: WebSocket;
    username: string;
    userId: string;
}

const wss = new WebSocketServer({ port: 8080 });

let allUsers: User[] = [];

wss.on("connection", (socket, req) => {
    const token = req.url?.split("token=")[1];

    if (!token) {
        socket.send(JSON.stringify({ type: "error", message: "No token provided" }));
        socket.close();
        return;
    }

    let decoded: any;

    try {
        decoded = jwt.verify(token, process.env.JWT_SECRET as string);
    } catch (err) {
        socket.send(JSON.stringify({ type: "error", message: "Invalid token" }));
        socket.close();
        return;
    }

    const { username, id: userId } = decoded;

    // Remove any existing socket with same userId
    allUsers = allUsers.filter(user => user.userId !== userId);

    allUsers.push({ socket, username, userId });

    console.log(`${username} connected`);

    // Notify others (optional)
    broadcastUserList();

    socket.send(JSON.stringify({ type: "info", message: `Welcome ${username}!` }));

    socket.on("message", (data) => {
        let msg;

        try {
            msg = JSON.parse(data.toString());
        } catch (e) {
            socket.send(JSON.stringify({ type: "error", message: "Invalid message format" }));
            return;
        }

        if (msg.type === "private") {
            const { toUsername, message } = msg.payload;
            const receiver = allUsers.find(u => u.username === toUsername);

            if (receiver) {
                receiver.socket.send(
                    JSON.stringify({
                        type: "private",
                        payload: {
                            message,
                            from: username
                        }
                    })
                );
            } else {
                socket.send(JSON.stringify({ type: "error", message: "User not found" }));
            }
        }
    });

    socket.on("close", () => {
        console.log(`${username} disconnected`);
        allUsers = allUsers.filter(user => user.socket !== socket);
        broadcastUserList();
    });
});

function broadcastUserList() {
    const usernames = allUsers.map(u => u.username);
    const payload = JSON.stringify({ type: "users", payload: { users: usernames } });

    allUsers.forEach(user => {
        user.socket.send(payload);
    });
}
