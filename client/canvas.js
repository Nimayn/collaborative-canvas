// client/canvas.js
// Lightweight CanvasManager for local drawing and replaying server history.
class CanvasManager {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');

        // Set canvas size to window size for full-screen drawing
        this._resizeCanvas();

        // Keep canvas responsive
        window.addEventListener('resize', () => {
            this._resizeCanvas();
            this.redrawFullState();
        });
        
        // Basic context settings
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        
        this.isDrawing = false;
        this.currentPathId = null; // Will be used for network operations later
        this._currentPoints = [];
        this._currentColor = '#000';
        this._currentWidth = 1;

        // Mirror of server history / local finalized ops
        this.pathHistory = [];
    }
    
    _resizeCanvas() {
        // Preserve current size then set to window size
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }
    
    // --- Core Local Drawing Functions ---
    
    // Accepts optional pathId (used by client/server to correlate temporary IDs)
    startLocalPath(x, y, color, width, pathId = null) {
        this.isDrawing = true;
        this.currentPathId = pathId || Date.now().toString();
        this._currentPoints = [{ x, y }];
        this._currentColor = color;
        this._currentWidth = width;

        this.ctx.beginPath();
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = width;
        this.ctx.moveTo(x, y);
    }

    continueLocalPath(x, y) {
        if (!this.isDrawing) return;
        this.ctx.lineTo(x, y);
        this.ctx.stroke();
        this._currentPoints.push({ x, y });
    }

    endLocalPath() {
        if (!this.isDrawing) return;
        this.isDrawing = false;
        this.ctx.closePath();

        // Finalize and add to local history
        const op = {
            id: this.currentPathId,
            tool: 'brush',
            color: this._currentColor,
            width: this._currentWidth,
            points: this._currentPoints.slice(),
            isActive: true,
        };
        this.pathHistory.push(op);

        // reset current track
        this.currentPathId = null;
        this._currentPoints = [];
    }
    
    // Draw a single operation (used for remote ops and replay)
    drawOperation(op) {
        if (!op || op.isActive === false) return;
        const pts = op.points || [];
        if (pts.length === 0) return;

        this.ctx.beginPath();
        this.ctx.strokeStyle = op.color || '#000';
        this.ctx.lineWidth = op.width || 1;
        this.ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) {
            this.ctx.lineTo(pts[i].x, pts[i].y);
        }
        this.ctx.stroke();
        this.ctx.closePath();
    }

    // Clear canvas and redraw all active strokes from history
    redrawFullState() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        for (const op of this.pathHistory) {
            if (op.isActive !== false) this.drawOperation(op);
        }
    }
}

// Expose globally for non-module usage (index.html uses plain scripts)
window.CanvasManager = CanvasManager;
// client/canvas.js
class CanvasManager {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.pathHistory = []; // Local mirror of the authoritative server state
        
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        this.isDrawing = false;
        this.currentPathId = null;
    }

    // --- Core Rendering Logic ---
    
    // Clear the main canvas
    clearCanvas() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    // This is the CRITICAL function for state initialization and undo/redo
    redrawFullState() {
        this.clearCanvas();
        // Re-draw every operation in the current history
        this.pathHistory.forEach(op => {
            if (op.isActive) {
                this.drawOperation(op);
            }
        });
    }

    drawOperation(op) {
        const { points, color, width } = op;
        if (!points || points.length < 1) return;

        this.ctx.beginPath();
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = width;
        
        // Move to the first point
        this.ctx.moveTo(points[0].x, points[0].y);

        // Draw lines to all subsequent points
        for (let i = 1; i < points.length; i++) {
            this.ctx.lineTo(points[i].x, points[i].y);
        }

        this.ctx.stroke();
    }
    
    // --- Real-time Drawing Functions ---
    // Used for smooth, client-side prediction and remote rendering

    startLocalPath(x, y, color, width, pathId) {
        this.isDrawing = true;
        this.currentPathId = pathId;

        this.ctx.beginPath();
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = width;
        this.ctx.moveTo(x, y);
    }

    continueLocalPath(x, y) {
        if (!this.isDrawing) return;
        this.ctx.lineTo(x, y);
        this.ctx.stroke();
    }

    endLocalPath() {
        this.isDrawing = false;
        this.currentPathId = null;
        this.ctx.closePath();
    }

    // ... (Methods for managing pathHistory array: set, add, remove by ID)
}