const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*", // Change this to your client's origin
        methods: ["GET", "POST"],
        allowedHeaders: ["my-custom-header"],
        credentials: true
    }
});


app.use(cors());


let messages = {}; // This can be replaced with a database in a production app

const generateUniqueRoomId = () => {
    return `room-${Math.random().toString(36).substr(2, 9)}`;
  };


io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);

    socket.on("createRoom", (callback) => {
        const newRoomId = generateUniqueRoomId(); // Implement this function to generate a unique room ID
        callback(newRoomId);
      });


    socket.on('joinRoom', (roomId) => {
        socket.join(roomId);
        console.log(`Client ${socket.id} joined room ${roomId}`);
    });


    socket.on('getMessages', (roomId) => {
        const roomMessages = messages[roomId] || [];
        socket.emit('chatHistory', roomMessages);
    });

    socket.on('question', (data) => {
        const { roomId, msg } = data;
        messages[roomId] = messages[roomId] || [];
        messages[roomId].push({ role: 'asker', message: msg });
        io.to(roomId).emit('question', { roomId, msg });
        io.to(roomId).emit('chatHistory', messages[roomId]);
        io.emit('getRooms');
    });

    socket.on('response', (data) => {
        const { roomId, msg } = data;
        messages[roomId] = messages[roomId] || [];
        messages[roomId].push({ role: 'responder', message: msg });
        io.to(roomId).emit('response', { roomId, msg });
        io.to(roomId).emit('chatHistory', messages[roomId]);
        io.emit('getRooms');
    });

    socket.on('typing', (data) => {
        const { roomId } = data;
        socket.to(roomId).emit('typing');
    });

    socket.on('stopTyping', (data) => {
        const { roomId } = data;
        socket.to(roomId).emit('stopTyping');
    });

    socket.on('deleteRoom', (roomId) => {
        console.log(`Received deleteRoom event for room: ${roomId}`);
        if (messages[roomId]) {
          console.log(`Deleting room from server: ${roomId}`);
          io.to(roomId).emit('roomDeleted', { roomId });
          delete messages[roomId];
          io.emit('getRooms');
        } else {
          console.log(`Room not found: ${roomId}`);
        }
      });

    socket.on('getRooms', () => {
        const roomsList = Object.keys(messages).map((roomId) => ({
            id: roomId,
            latestMessage: messages[roomId][messages[roomId].length - 1]?.message || 'No messages yet'
        }));
        console.log('Sending rooms list:', roomsList);
        io.emit('roomsList', roomsList);
    });


    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});

// Start the server
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
