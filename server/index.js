// index.js - Server-side code for the Collaborative Canvas
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';

const app = express();
// Note: We use the createServer utility to integrate Express and Socket.IO
const httpServer = createServer(app);
const PORT = 3000;

// Initialize Socket.IO server
// Cors is important here to allow your frontend (which will run on a different port/origin) to connect.
const io = new Server(httpServer, {
    cors: {
        // Allowing all origins for simple development setup
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// A simple in-memory storage for the canvas history (all drawing events)
// In a production app, you might use a database like Redis or Firestore for persistence.
const canvasHistory = [];

io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    // 1. Send the existing canvas history to the newly connected client
    // This ensures the new user sees the current state of the drawing.
    socket.emit('canvasHistory', canvasHistory);

    // 2. Listen for a new drawing action from a client
    socket.on('drawing', (data) => {
        // Save the drawing event to the history
        canvasHistory.push(data);
        
        // 3. Broadcast the new drawing action to ALL other connected clients
        // 'broadcast.emit' sends the message to everyone EXCEPT the sender.
        socket.broadcast.emit('drawing', data);

        // Optional: Log the drawing data (can be noisy, useful for debugging)
        // console.log('Received drawing data:', data);
    });

    // Handle client disconnection
    socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.id}`);
    });
});

// Basic Express route to confirm the server is running
app.get('/', (req, res) => {
    res.send('Collaborative Canvas Server is running.');
});

// Start the server
httpServer.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
    console.log(`Access the status page at http://localhost:${PORT}`);
});