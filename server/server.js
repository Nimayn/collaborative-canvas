// server/server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const { GlobalDrawingState } = require('./drawing-state');

const app = express();
const httpServer = http.createServer(app);
const io = new Server(httpServer);
const stateManager = new GlobalDrawingState();

// Serve the client files
app.use(express.static(path.join(__dirname, '../client')));

// Handle Socket.io connections
io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);
    const userId = socket.id;

    // 1. Initial State: Send the current canvas state to the new user.
    socket.emit('state:init', stateManager.getCanvasState());

    // 2. Real-time Drawing (path:start, path:continue, path:end)
    socket.on('path:start', (op) => {
        // Add operation metadata (server is authoritative on ID and user)
        const fullOp = stateManager.createOperation(userId, 'draw', op);
        stateManager.addOperation(fullOp);
        
        // Broadcast the new operation to all clients (including sender for reconciliation)
        io.emit('state:operation', fullOp);
    });

    // Handle path:continue (no need to store in history, just broadcast)
    socket.on('path:continue', (data) => {
        // Broadcast point data to everyone else for smooth drawing
        socket.broadcast.emit('path:continue', data); 
    });

    // 3. Global Undo
    socket.on('undo:request', () => {
        const undoneOpId = stateManager.undoLastOperation();
        if (undoneOpId) {
            // Tell everyone a specific operation was removed from history
            io.emit('state:undo', { undoneOperationId: undoneOpId });
        }
    });

    // 4. User Indicators (Cursor)
    socket.on('cursor:move', (pos) => {
        socket.broadcast.emit('cursor:update', { userId, ...pos });
    });

    socket.on('disconnect', () => {
        console.log(`User disconnected: ${userId}`);
        // Cleanup user state/cursor
    });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));