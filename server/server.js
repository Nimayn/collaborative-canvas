// server/server.js - Updated and Fixed for Tool State and State Commitment

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

// Store temporary connection data (like user color and ID)
const onlineUsers = {};

io.on('connection', (socket) => {
    const userId = socket.id;
    console.log(`User connected: ${userId}`);

    // 1. Initial Handshake and User Status
    
    // Send the current canvas state to the new user.
    socket.emit('state:init', stateManager.getCanvasState());
    
    // Announce new user and assign a temporary color
    const userColor = '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0');
    onlineUsers[userId] = { id: userId, color: userColor };
    io.emit('user:update', onlineUsers); // Broadcast updated user list


    // 2. Drawing Path Start (Server-side commitment of stroke intent)
    socket.on('path:start', (op) => {
        // op includes: id (temp client ID), tool, color, width, points (first point)
        
        // CRITICAL: Create the authoritative operation object. The server MUST store this
        // immediately to maintain chronological order, even if points are incomplete.
        const fullOp = stateManager.createOperation(userId, op.tool, op);
        stateManager.addOperation(fullOp);
        
        // NOTE: We DO NOT broadcast the stroke yet. We wait for path:end 
        // to get the full, complete set of points before adding it to the authoritative view.
    });

    // 3. Drawing Path Continue (Real-time broadcasting for low latency visualization)
    socket.on('path:continue', (data) => {
        // data includes: id (temp client ID), x, y, tool, color, width
        
        // Broadcast the point data to everyone else for immediate, smooth rendering
        // NOTE: This relies on the client side handling the visual interpolation.
        socket.broadcast.emit('path:continue', data); 
    });

    // 4. Drawing Path End (Stroke finalized and broadcasted)
    socket.on('path:end', ({ id, points }) => {
        // id is the temporary client ID used in path:start
        
        // 1. Update the authoritative operation in history with final points
        // This is the moment the stroke becomes permanent and complete.
        const committedOp = stateManager.updateOperationPoints(id, points);
        
        if (committedOp) {
            // 2. CRITICAL: Broadcast the COMPLETED stroke to all clients
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
        io.emit('user:update', onlineUsers); // Broadcast updated user list
    });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));