// backend/server.js
require('dotenv').config();
const http = require('http');
const app = require('./src/app');
const PORT = process.env.PORT || 5000;



// Create HTTP server
const server = http.createServer(app);

// Attach Socket.io
const io = require('socket.io')(server, {
  cors: {
    origin: [
      process.env.FRONTEND_URL || "http://localhost:3000",
    ],
    methods: ["GET", "POST"],
    credentials: true
  }
});
// Store io in app so routes can access it
app.set('io', io);

// Log connections (for debugging)
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  socket.on('registerUser', (userId) => {
    if (!userId) return;
    socket.join(`user:${String(userId)}`);
  });

  socket.on('joinRoom', (roomId) => {
    if (!roomId) return;
    socket.join(`room_${String(roomId)}`);
  });

  socket.on('leaveRoom', (roomId) => {
    if (!roomId) return;
    socket.leave(`room_${String(roomId)}`);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});