const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: 'http://localhost:3000' }
});

io.on('connection', (socket) => {
  console.log('Client connected');

  socket.on('frame', async (data) => {
    try {
      const response = await axios.post('http://localhost:5001/process', { image: data.image });
      io.emit('caption', { caption: response.data.caption });
    } catch (error) {
      console.error('Error processing frame:', error);
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

server.listen(5000, () => console.log('WebSocket server running on port 5000'));
