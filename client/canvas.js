// client/canvas.js - Updated and Fixed for State Consistency

class CanvasManager {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        
        // Set initial size and handle resizing
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        window.addEventListener('resize', this.handleResize);

        // Core context settings (applies to all drawing by default)
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        
        this.isDrawing = false;
        this.pathHistory = []; // Local mirror of authoritative server state
    }

    handleResize = () => {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        // CRITICAL: Redraw full state after resize to restore content
        this.redrawFullState(); 
    }

    clearCanvas() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    // --- Core Rendering Functions (for history/authority) ---

    // The critical function for state initialization and undo/redo
    redrawFullState() {
        // 1. MUST CLEAR THE ENTIRE CANVAS FIRST TO PREVENT GHOST STROKES
        this.clearCanvas(); 

        // 2. Re-draw every operation in the current, active history
        this.pathHistory.forEach(op => {
            if (op.isActive) { 
                this.drawOperation(op);
            }
        });
    }

    // Draws one single complete stroke from the authoritative history (used by redrawFullState)
    drawOperation(op) {
        const { points, color, width, tool } = op;
        if (!points || points.length < 2) return;

        this.ctx.beginPath();
        
        // Apply tool-specific styles
        if (tool === 'eraser') {
            // Eraser uses the background color and a 'destination-out' composite operation
            this.ctx.strokeStyle = '#f8f8f8'; // Must match CSS background
            this.ctx.globalCompositeOperation = 'destination-out';
        } else {
            // Brush uses the stored color and a 'source-over' composite operation
            this.ctx.strokeStyle = color;
            this.ctx.globalCompositeOperation = 'source-over';
        }
        
        this.ctx.lineWidth = width;
        
        this.ctx.moveTo(points[0].x, points[0].y);

        for (let i = 1; i < points.length; i++) {
            this.ctx.lineTo(points[i].x, points[i].y);
        }

        this.ctx.stroke();
        this.ctx.closePath();
        
        // IMPORTANT: Reset composite operation to default after drawing one stroke
        this.ctx.globalCompositeOperation = 'source-over';
    }
    
    // --- Local Real-time Drawing Functions (Client Prediction) ---

    // Starts a local stroke (Client-Side Prediction)
    startLocalPath(x, y, color, width, tool) {
        this.isDrawing = true;
        this.ctx.beginPath();

        // Apply tool-specific settings for local prediction
        if (tool === 'eraser') {
            this.ctx.strokeStyle = '#f8f8f8'; // Match background
            this.ctx.globalCompositeOperation = 'destination-out';
        } else {
            this.ctx.strokeStyle = color;
            this.ctx.globalCompositeOperation = 'source-over';
        }

        this.ctx.lineWidth = width;
        this.ctx.moveTo(x, y);
    }

    // Continues the local stroke
    continueLocalPath(x, y) {
        if (!this.isDrawing) return;
        this.ctx.lineTo(x, y);
        this.ctx.stroke();
    }

    // Finalizes the local stroke
    endLocalPath() {
        this.isDrawing = false;
        this.ctx.closePath();
        // Reset composite operation after finishing the stroke
        this.ctx.globalCompositeOperation = 'source-over'; 
    }
    
    // NOTE: continueRemotePath is removed to simplify state management 
    // and enforce server authority.
}