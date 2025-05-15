  // const express = require('express');
  // const http = require('http');
  // const { WebSocketServer } = require('ws');
  // const jwt = require('jsonwebtoken');
  // const dotenv = require('dotenv');
  // const mongoose = require('mongoose');
  // const UploadRouter = require('./routes/upload')
  // const userRoutes = require('./routes/UsersRoutes');
  // const Message = require('./models/Message');
  // const messageRoutes = require('./routes/MessagesRoutes');

  // dotenv.config();

  // const app = express();
  // const server = http.createServer(app);
  // const wss = new WebSocketServer({ server });

  // const PORT = process.env.PORT || 5000;

  // app.use(express.json());
  // const cors = require('cors');
  // app.use(cors());

  // mongoose.connect(process.env.MONGO_URI, {
  //   useNewUrlParser: true,
  //   useUnifiedTopology: true,
  // })
  // .then(() => console.log('MongoDB Connected'))
  // .catch((err) => console.error('MongoDB Error:', err));

  // app.use('/api', userRoutes);
  // app.use('/api', messageRoutes);
  // app.use('/api',UploadRouter)
  // app.get('/', (req, res) => {
  //   res.json({ message: 'API is working' });
  // });

  // let allUsers = [];

  // wss.on('connection', (socket, req) => {
  //   const token = req.url?.split('token=')[1];

  //   if (!token) {
  //     socket.send(JSON.stringify({ type: 'error', message: 'No token provided' }));
  //     socket.close();
  //     return;
  //   }

  //   let decoded;
  //   try {
  //     decoded = jwt.verify(token, process.env.JWT_SECRET);
  //   } catch {
  //     socket.send(JSON.stringify({ type: 'error', message: 'Invalid token' }));
  //     socket.close();
  //     return;
  //   }

  //   const userId = decoded.userId || decoded._id;
  //   const username = decoded.name || decoded.firstname || decoded.username || 'Anonymous';

  //   if (!userId) {
  //     socket.send(JSON.stringify({ type: 'error', message: 'Missing userId in token' }));
  //     socket.close();
  //     return;
  //   }

  //   allUsers = allUsers.filter(user => user.userId !== userId);
  //   allUsers.push({ socket, username, userId });

  //   broadcastUserList();

  //   socket.on('message', async (data) => {
  //     let msg;
  //     try {
  //       msg = JSON.parse(data.toString());
  //     } catch {
  //       socket.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
  //       return;
  //     }

  //     if (msg.type === 'private') {
  //       const { toUserId, message } = msg.payload;

  //       if (!toUserId || !message) {
  //         socket.send(JSON.stringify({ type: 'error', message: 'Missing fields in private message' }));
  //         return;
  //       }

  //       try {
  //         const newMessage = new Message({
  //           sender: userId,
  //           receiver: toUserId,
  //           content: message,
  //           timestamp: new Date(),
  //         });
  //         await newMessage.save();
  //       } catch {
  //         socket.send(JSON.stringify({ type: 'error', message: 'Message saving failed' }));
  //         return;
  //       }

  //       const receiver = allUsers.find(u => u.userId.toString() === toUserId);
  //       if (receiver) {
  //         receiver.socket.send(JSON.stringify({
  //           type: 'private',
  //           payload: { message, from: username, fromUserId: userId },
  //         }));
  //       } else {
  //         socket.send(JSON.stringify({ type: 'error', message: 'User not connected' }));
  //       }
  //     }
  //   });

  //   socket.on('close', () => {
  //     allUsers = allUsers.filter(user => user.socket !== socket);
  //     broadcastUserList();
  //   });
  // });

  // function broadcastUserList() {
  //   const users = allUsers.map(u => ({
  //     userId: u.userId,
  //     username: u.username,
  //   }));

  //   const payload = JSON.stringify({ type: 'users', payload: { users } });

  //   allUsers.forEach(user => {
  //     user.socket.send(payload);
  //   });
  // }

  // server.listen(PORT, () => {
  //   console.log(`Server running on port ${PORT}`);
  // });












  const express = require('express');
const http = require('http');
const { WebSocketServer } = require('ws');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const cors = require('cors');

const UploadRouter = require('./routes/upload');
const userRoutes = require('./routes/UsersRoutes');
const messageRoutes = require('./routes/MessagesRoutes');
const Message = require('./models/Message');

dotenv.config();

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('MongoDB Connected'))
.catch((err) => console.error('MongoDB Error:', err));

app.use('/api', userRoutes);
app.use('/api', messageRoutes);
app.use('/api', UploadRouter);

app.get('/', (req, res) => {
  res.json({ message: 'API is working' });
});

let allUsers = [];
let rooms = {}; // { roomName: [userId1, userId2, ...] }

wss.on('connection', (socket, req) => {
  const token = req.url?.split('token=')[1];
  if (!token) {
    socket.send(JSON.stringify({ type: 'error', message: 'No token provided' }));
    socket.close();
    return;
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    socket.send(JSON.stringify({ type: 'error', message: 'Invalid token' }));
    socket.close();
    return;
  }

  const userId = decoded.userId || decoded._id;
  const username = decoded.name || decoded.firstname || decoded.username || 'Anonymous';

  if (!userId) {
    socket.send(JSON.stringify({ type: 'error', message: 'Missing userId in token' }));
    socket.close();
    return;
  }

  allUsers = allUsers.filter(user => user.userId !== userId);
  allUsers.push({ socket, username, userId });

  sendRoomsToAll();

  socket.on('message', async (data) => {
    let msg;
    try {
      msg = JSON.parse(data.toString());
    } catch {
      socket.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
      return;
    }

    if (msg.type === 'create-room') {
      const roomName = msg.payload?.roomName;
      if (!roomName) return;

      if (!rooms[roomName]) {
        rooms[roomName] = [];
      }

      sendRoomsToAll();
    }

    if (msg.type === 'join-room') {
      const { roomName } = msg.payload;
      if (!rooms[roomName]) rooms[roomName] = [];

      if (!rooms[roomName].includes(userId)) {
        rooms[roomName].push(userId);
      }

      socket.send(JSON.stringify({
        type: 'joined-room',
        payload: { roomName },
      }));
    }

    if (msg.type === 'room-message') {
      const { roomName, message } = msg.payload;
      if (!roomName || !message) return;

      const members = rooms[roomName] || [];

      for (const uid of members) {
        const user = allUsers.find(u => u.userId === uid);
        if (user && user.socket.readyState === 1) {
          user.socket.send(JSON.stringify({
            type: 'room-message',
            payload: {
              from: username,
              fromUserId: userId,
              roomName,
              message,
            },
          }));
        }
      }
    }

    if (msg.type === 'private') {
      const { toUserId, message } = msg.payload;
      if (!toUserId || !message) return;

      try {
        const newMessage = new Message({
          sender: userId,
          receiver: toUserId,
          content: message,
          timestamp: new Date(),
        });
        await newMessage.save();
      } catch {
        socket.send(JSON.stringify({ type: 'error', message: 'Message saving failed' }));
        return;
      }

      const receiver = allUsers.find(u => u.userId.toString() === toUserId);
      if (receiver) {
        receiver.socket.send(JSON.stringify({
          type: 'private',
          payload: { message, from: username, fromUserId: userId },
        }));
      }
    }
  });

  socket.on('close', () => {
    allUsers = allUsers.filter(user => user.socket !== socket);
    for (const room in rooms) {
      rooms[room] = rooms[room].filter(uid => uid !== userId);
    }
    sendRoomsToAll();
  });
});

function sendRoomsToAll() {
  const roomNames = Object.keys(rooms);
  const payload = JSON.stringify({
    type: 'rooms',
    payload: { rooms: roomNames },
  });

  for (const user of allUsers) {
    if (user.socket.readyState === 1) {
      user.socket.send(payload);
    }
  }
}

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
