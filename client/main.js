// client/main.js
// Assumes CanvasManager and CursorManager classes are defined/imported
document.addEventListener('DOMContentLoaded', () => {
    const socket = io();
    const canvasManager = new CanvasManager('drawingCanvas');
    // const cursorManager = new CursorManager('cursorCanvas'); // For user indicators
    
    let brushColor = document.getElementById('colorPicker').value;
    let brushWidth = parseInt(document.getElementById('widthSlider').value);
    let currentPoints = [];

    // --- UI Listeners ---
    document.getElementById('colorPicker').addEventListener('change', (e) => brushColor = e.target.value);
    document.getElementById('widthSlider').addEventListener('change', (e) => brushWidth = parseInt(e.target.value));
    
    document.getElementById('undoBtn').addEventListener('click', () => {
        socket.emit('undo:request');
    });

    // --- Drawing Event Handlers ---
    canvasManager.canvas.addEventListener('mousedown', (e) => {
        const { offsetX: x, offsetY: y } = e;
        
        // 1. Start Local Prediction/Drawing
        const pathId = Date.now().toString(); // Temporary client ID
        canvasManager.startLocalPath(x, y, brushColor, brushWidth, pathId);
        currentPoints = [{ x, y }];

        // 2. Send Start Operation to Server (only initial state/style)
        socket.emit('path:start', {
            id: pathId, 
            tool: 'brush', 
            color: brushColor, 
            width: brushWidth, 
            points: currentPoints 
        });
    });

    canvasManager.canvas.addEventListener('mousemove', (e) => {
        const { offsetX: x, offsetY: y } = e;
        
        // 1. Local Drawing
        if (canvasManager.isDrawing) {
            canvasManager.continueLocalPath(x, y);
            currentPoints.push({ x, y });
        }

        // 2. Send Cursor Updates (Throttled/Debounced - essential for performance)
        // ... (Implement a throttle function here)
        // socket.emit('cursor:move', { x, y }); 
    });

    canvasManager.canvas.addEventListener('mouseup', () => {
        // 1. Finalize Local Drawing
        canvasManager.endLocalPath();
        
        // 2. Send Final Path Data (Batching all points)
        // The server will use the points sent in the final 'path:start' event 
        // to construct the *full* authoritative history stroke. 
        // Sending a final 'path:end' is for robustness, but often just the final 
        // path data sent with 'path:start' is enough for the server state.
    });


    // --- WebSocket Event Handlers ---

    // Initial state: Clear canvas and draw everything from the server's history
    socket.on('state:init', (history) => {
        canvasManager.pathHistory = history;
        canvasManager.redrawFullState();
    });

    // New operation from a remote user (or reconciliation for local user)
    socket.on('state:operation', (newOp) => {
        // Add to history
        canvasManager.pathHistory.push(newOp);
        
        // CRITICAL: Draw only if it's a remote stroke 
        // (Local prediction already drew it, or the server ID matches the client temp ID)
        // For simplicity, we assume we just draw it again or check if it's new.
        if (newOp.userId !== socket.id) {
            canvasManager.drawOperation(newOp); 
        }
    });

    // Incremental points for remote drawing (for smooth, real-time feel)
    socket.on('path:continue', (data) => {
        // Draw the point immediately on a temporary context layer or the main canvas
        // This provides the "see them drawing as they draw" effect.
    });

    // Global Undo command from the server
    socket.on('state:undo', ({ undoneOperationId }) => {
        // 1. Remove/Mark Inactive the operation in the local history mirror
        const op = canvasManager.pathHistory.find(o => o.id === undoneOperationId);
        if (op) op.isActive = false;

        // 2. Clear and Redraw the canvas based on the modified history
        canvasManager.redrawFullState();
    });
});