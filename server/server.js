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

// Store temporary connection data (like user color)
const onlineUsers = {};

io.on('connection', (socket) => {
    const userId = socket.id;
    console.log(`User connected: ${userId}`);

    // 1. Initial State: Send the current canvas state to the new user.
    socket.emit('state:init', stateManager.getCanvasState());
    
    // Announce new user and assign a temporary color
    onlineUsers[userId] = { id: userId, color: '#' + Math.floor(Math.random()*16777215).toString(16) };
    io.emit('user:update', onlineUsers);


    // 2. Drawing Path Start (Server-side commitment)
    socket.on('path:start', (op) => {
        // 1. Create the authoritative operation object
        const fullOp = stateManager.createOperation(userId, 'draw', op);
        stateManager.addOperation(fullOp);
        
        // 2. Broadcast the starting operation (used for client reconciliation)
        // NOTE: We don't broadcast the full stroke here; we wait for path:end.
    });

    // 3. Drawing Path Continue (Real-time broadcasting, NOT stored in history)
    socket.on('path:continue', (data) => {
        // data contains: { id (temp client ID), x, y, userId }
        // Broadcast the point data to everyone else for immediate, smooth rendering
        socket.broadcast.emit('path:continue', data); 
    });

    // 4. Drawing Path End (Stroke finalized and broadcasted)
    socket.on('path:end', ({ id, points }) => {
        // 1. Update the authoritative operation in history with final points
        const committedOp = stateManager.updateOperationPoints(id, points);
        
        if (committedOp) {
            // 2. Broadcast the COMPLETED stroke to all clients
            io.emit('state:operation', committedOp);
        }
    });


    // 5. Global Undo
    socket.on('undo:request', () => {
        const undoneOpId = stateManager.undoLastOperation();
        if (undoneOpId) {
            // Tell everyone to redraw based on the history without this operation
            io.emit('state:undo', { undoneOperationId: undoneOpId });
        }
    });

    // 6. User Indicators (Cursor)
    socket.on('cursor:move', (pos) => {
        socket.broadcast.emit('cursor:update', { userId, ...pos, color: onlineUsers[userId].color });
    });

    socket.on('disconnect', () => {
        console.log(`User disconnected: ${userId}`);
        delete onlineUsers[userId];
        io.emit('user:update', onlineUsers); // Update user list for clients
    });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));