const express = require('express');
const http = require('http');
const { WebSocketServer } = require('ws');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const userRoutes = require('./routes/UsersRoutes');
const Message = require('./models/Message');
const messageRoutes = require('./routes/MessagesRoutes');

dotenv.config();

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const PORT = process.env.PORT || 5000;

app.use(express.json());
const cors = require('cors');
app.use(cors());

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('MongoDB Connected'))
.catch((err) => console.error('MongoDB Error:', err));

app.use('/api', userRoutes);
app.use('/api', messageRoutes);

app.get('/', (req, res) => {
  res.json({ message: 'API is working' });
});

let allUsers = [];

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

  broadcastUserList();

  socket.on('message', async (data) => {
    let msg;
    try {
      msg = JSON.parse(data.toString());
    } catch {
      socket.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
      return;
    }

    if (msg.type === 'private') {
      const { toUserId, message } = msg.payload;

      if (!toUserId || !message) {
        socket.send(JSON.stringify({ type: 'error', message: 'Missing fields in private message' }));
        return;
      }

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
      } else {
        socket.send(JSON.stringify({ type: 'error', message: 'User not connected' }));
      }
    }
  });

  socket.on('close', () => {
    allUsers = allUsers.filter(user => user.socket !== socket);
    broadcastUserList();
  });
});

function broadcastUserList() {
  const users = allUsers.map(u => ({
    userId: u.userId,
    username: u.username,
  }));

  const payload = JSON.stringify({ type: 'users', payload: { users } });

  allUsers.forEach(user => {
    user.socket.send(payload);
  });
}

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});






// const express = require('express');
// const http = require('http');
// const { WebSocketServer } = require('ws');
// const jwt = require('jsonwebtoken');
// const dotenv = require('dotenv');
// const mongoose = require('mongoose');
// const userRoutes = require('./routes/UsersRoutes');
// const Message = require('./models/Message');
// dotenv.config();

// const app = express();
// const server = http.createServer(app); // HTTP + Express server
// const wss = new WebSocketServer({ server }); // WebSocket on same server

// const PORT = process.env.PORT || 5000;

// app.use(express.json());
// const cors = require('cors'); 
// app.use(cors());
// const messageRoutes = require('./routes/MessagesRoutes');
// // Connect to MongoDB
// mongoose.connect(process.env.MONGO_URI, {
//   useNewUrlParser: true,
//   useUnifiedTopology: true,
// })
// .then(() => console.log('✅ MongoDB Connected'))
// .catch((err) => console.error('❌ MongoDB Error:', err));

// // API routes
// app.use('/api', userRoutes);
// app.use('/api', messageRoutes);

// // Health check
// app.get('/', (req, res) => {
//   res.json({ message: '✅ API is working' });
// });

// // 🟡 WebSocket user list (store metadata)
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
//   } catch (err) {
//     socket.send(JSON.stringify({ type: 'error', message: 'Invalid token' }));
//     socket.close();
//     return;
//   }

//   const userId = decoded.userId || decoded._id;
//   const username = decoded.name || decoded.firstname || decoded.username || "Anonymous";

//   if (!userId) {
//     socket.send(JSON.stringify({ type: 'error', message: 'Missing userId in token' }));
//     socket.close();
//     return;
//   }

//   // Remove any previous socket for same user
//   allUsers = allUsers.filter(user => user.userId !== userId);
//   allUsers.push({ socket, username, userId });

//   console.log(`${username} connected`);

// //   socket.send(JSON.stringify({ type: 'info', message: `Welcome ${username}!` }));
//   broadcastUserList();

//   socket.on('message', async (data) => {
//   let msg;
//   try {
//     msg = JSON.parse(data.toString());
//   } catch (e) {
//     socket.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
//     return;
//   }

//   if (msg.type === 'private') {
//     const { toUserId, message } = msg.payload;

//     if (!toUserId || !message) {
//       socket.send(JSON.stringify({ type: 'error', message: 'Missing fields in private message' }));
//       return;
//     }

//     // Save to MongoDB 🟢
//     try {
//       const newMessage = new Message({
//         sender: userId,
//         receiver: toUserId,
//         content: message,
//         timestamp: new Date(),
//       });
//       await newMessage.save();
//     } catch (err) {
//       console.error('❌ Error saving message:', err);
//       socket.send(JSON.stringify({ type: 'error', message: 'Message saving failed' }));
//       return;
//     }

//     // Send to recipient if online
//     const receiver = allUsers.find(u => u.userId.toString() === toUserId);
//     if (receiver) {
//       receiver.socket.send(JSON.stringify({
//         type: 'private',
//         payload: { message, from: username, fromUserId: userId },
//       }));
//     } else {
//       socket.send(JSON.stringify({ type: 'error', message: 'User not connected' }));
//     }
//   }
// });

//   socket.on('close', () => {
//     console.log(`${username} disconnected`);
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
//   console.log(`🚀 Server (HTTP + WebSocket) running on port ${PORT}`);
// });
