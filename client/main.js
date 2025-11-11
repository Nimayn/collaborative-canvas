// client/main.js

// --- Utility: Throttle Function (Crucial for network performance) ---
const throttle = (func, limit) => {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    }
};
const THROTTLE_LIMIT = 50; 


document.addEventListener('DOMContentLoaded', () => {
    const socket = io();
    // Initialize Managers (assuming CanvasManager and CursorManager are loaded)
    const canvasManager = new CanvasManager('drawingCanvas');
    const cursorManager = new CursorManager('cursorCanvas');
    
    // Set socket ID globally for local/remote distinction
    window.socketId = socket.id;

    // --- State Variables ---
    let currentTool = 'brush'; // New state: 'brush' or 'eraser'
    let brushColor = document.getElementById('colorPicker').value;
    let brushWidth = parseInt(document.getElementById('widthSlider').value);
    
    let currentPoints = [];
    let currentPathId = null; 
    let currentPathStyle = {}; 

    // Elements
    const controlsEl = document.getElementById('controls');
    const canvasEl = canvasManager.canvas;
    const colorPickerEl = document.getElementById('colorPicker');
    const widthSliderEl = document.getElementById('widthSlider');
    
    // --- Draggable Controls State ---
    let isDragging = false;
    let offsetX, offsetY; 
    
    // --- UI Listeners and Logic ---

    // Function to update the brushColor state based on the selected tool
    const updateBrushStyle = () => {
        if (currentTool === 'eraser') {
            // NOTE: Must match the background color defined in client/style.css
            brushColor = '#f8f8f8'; 
        } else {
            brushColor = colorPickerEl.value;
        }
    };
    
    // Tool Selection
    const toolBtns = document.querySelectorAll('.tool-btn');
    toolBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Update state
            currentTool = btn.dataset.tool; 
            
            // Update UI
            toolBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // Update color logic
            updateBrushStyle();
            
            // You might visually disable the color picker for the eraser:
            colorPickerEl.disabled = (currentTool === 'eraser');
        });
    });

    colorPickerEl.addEventListener('input', (e) => {
        if (currentTool === 'brush') {
            brushColor = e.target.value;
        }
    });
    widthSliderEl.addEventListener('input', (e) => brushWidth = parseInt(e.target.value));
    
    document.getElementById('undoBtn').addEventListener('click', () => {
        socket.emit('undo:request');
    });
    
    // Helper to calculate canvas coordinates
    const getCanvasCoordinates = (e, canvasEl) => {
        const rect = canvasEl.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    };

    // Throttled function to broadcast path data and cursor position
    const throttledNetworkUpdate = throttle((x, y) => {
        // 1. Send Path Continue (for remote real-time drawing)
        if (canvasManager.isDrawing) {
             socket.emit('path:continue', {
                id: currentPathId,
                x,
                y,
                ...currentPathStyle // Includes tool, color, and width
            });
        }

        // 2. Send Cursor Move (for cursor indicator)
        socket.emit('cursor:move', { x, y });

    }, THROTTLE_LIMIT);


    // ##########################################
    // ### DRAGGABLE CONTROLS IMPLEMENTATION ###
    // ##########################################

    controlsEl.addEventListener('pointerdown', (e) => {
        // Prevent dragging if the user clicked on an interactive element
        if (e.target.closest('input, button')) return; 

        isDragging = true;
        controlsEl.setPointerCapture(e.pointerId);
        
        offsetX = e.clientX - controlsEl.offsetLeft;
        offsetY = e.clientY - controlsEl.offsetTop;
        
        e.stopPropagation(); 
    });

    document.addEventListener('pointermove', (e) => {
        if (!isDragging) return;
        
        let newLeft = e.clientX - offsetX;
        let newTop = e.clientY - offsetY;

        // Clamp values to keep the panel within the viewport
        newLeft = Math.max(0, Math.min(newLeft, window.innerWidth - controlsEl.offsetWidth));
        newTop = Math.max(0, Math.min(newTop, window.innerHeight - controlsEl.offsetHeight));
        
        controlsEl.style.left = `${newLeft}px`;
        controlsEl.style.top = `${newTop}px`;
    });

    document.addEventListener('pointerup', (e) => {
        if (isDragging) {
            isDragging = false;
            try {
                controlsEl.releasePointerCapture(e.pointerId);
            } catch (err) {}
        }
    });

    // ##########################################
    // ### END DRAGGABLE CONTROLS ###
    // ##########################################


    // --- Drawing Event Handlers (Pointer Events) ---
    
    canvasEl.addEventListener('pointerdown', (e) => {
        if (e.button !== 0 && e.pointerType === 'mouse') return; 

        canvasEl.setPointerCapture(e.pointerId);
        const { x, y } = getCanvasCoordinates(e, canvasEl);

        currentPathId = `client-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        // Style must reflect the active tool (brushColor handles eraser logic)
        currentPathStyle = { tool: currentTool, color: brushColor, width: brushWidth };
        
        // 1. Client-Side Prediction (Draw locally)
        canvasManager.startLocalPath(x, y, brushColor, brushWidth);
        currentPoints = [{ x, y }];

        // 2. Send Start Operation to Server 
        socket.emit('path:start', {
            id: currentPathId, 
            ...currentPathStyle,
            points: currentPoints,
        });
    });

    canvasEl.addEventListener('pointermove', (e) => {
        const { x, y } = getCanvasCoordinates(e, canvasEl);

        // 1. Local Drawing (High-frequency, immediate)
        if (canvasManager.isDrawing) {
            canvasManager.continueLocalPath(x, y);
            currentPoints.push({ x, y });
        }

        // 2. Network Update (Throttled)
        throttledNetworkUpdate(x, y);
    });

    const finishPointer = (e) => {
        if (!canvasManager.isDrawing) return;
        try { canvasEl.releasePointerCapture(e.pointerId); } catch (err) {}
        
        // 1. Finalize Local Drawing
        canvasManager.endLocalPath();

        // 2. Send Final Path Data (to complete server history object)
        socket.emit('path:end', { id: currentPathId, points: currentPoints });
        
        currentPoints = [];
        currentPathId = null;
        currentPathStyle = {};
    };

    canvasEl.addEventListener('pointerup', finishPointer);
    canvasEl.addEventListener('pointercancel', finishPointer);
    canvasEl.addEventListener('contextmenu', (e) => e.preventDefault());


    // --- WebSocket Event Handlers ---
    
    socket.on('state:init', (history) => {
        canvasManager.pathHistory = history;
        canvasManager.redrawFullState();
    });

    socket.on('state:operation', (newOp) => {
        canvasManager.pathHistory.push(newOp);
        
        if (newOp.userId !== window.socketId) {
            canvasManager.drawOperation(newOp); 
        } 
    });

    socket.on('path:continue', (data) => {
        // NOTE: If you implement remote path continuation in CanvasManager, call it here.
        // It's currently disabled as the server sends the full path on path:end.
        // canvasManager.continueRemotePath(data.x, data.y, data.color, data.width);
    });

    socket.on('state:undo', ({ undoneOperationId }) => {
        const op = canvasManager.pathHistory.find(o => o.id === undoneOperationId);
        if (op) op.isActive = false;
        canvasManager.redrawFullState();
    });
    
    socket.on('cursor:update', (pos) => {
        cursorManager.updateCursor(pos.userId, pos.x, pos.y, pos.color);
    });
    
    socket.on('user:update', (users) => {
        const userListEl = document.getElementById('userList');
        userListEl.innerHTML = 'Online: ';
        
        Object.values(users).forEach(user => {
            const span = document.createElement('span');
            span.style.color = user.color;
            span.textContent = ` ${user.id.substring(0, 4)} `;
            userListEl.appendChild(span);
        });
    });
});