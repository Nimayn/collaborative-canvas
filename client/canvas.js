// client/canvas.js

class CanvasManager {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        
        // Dynamic sizing
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        window.addEventListener('resize', this.handleResize);

        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        
        this.isDrawing = false;
        this.pathHistory = []; // Local mirror of authoritative server state
    }

    handleResize = () => {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.redrawFullState(); // Redraw everything after resize
    }

    clearCanvas() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

   

    // The critical function for state initialization and undo/redo
    redrawFullState() {
        this.clearCanvas();
        // Re-draw every operation in the current, active history
        this.pathHistory.forEach(op => {
            if (op.isActive) {
                this.drawOperation(op);
            }
        });
    }

    // Draws one single complete stroke from the authoritative history
    drawOperation(op) {
        const { points, color, width } = op;
        if (!points || points.length < 2) return;

        this.ctx.beginPath();
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = width;
        
        this.ctx.moveTo(points[0].x, points[0].y);

        for (let i = 1; i < points.length; i++) {
            this.ctx.lineTo(points[i].x, points[i].y);
        }

        this.ctx.stroke();
        this.ctx.closePath();
    }
    
    // --- Local & Remote Real-time Drawing Functions ---

    // Starts a local stroke (Client-Side Prediction)
    startLocalPath(x, y, color, width) {
        this.isDrawing = true;
        this.ctx.beginPath();
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = width;
        this.ctx.moveTo(x, y);
    }

    // Continues the local stroke
    continueLocalPath(x, y) {
        if (!this.isDrawing) return;
        this.ctx.lineTo(x, y);
        this.ctx.stroke();
    }
    
    // Continues a stroke initiated by a REMOTE user (for low-latency visualization)
    continueRemotePath(x, y, color, width) {
        // To handle many remote strokes simultaneously, we need to save and restore context
        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = width;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        
        // NOTE: This simple version is only for incremental point updates.
        // A robust solution would track remote strokes by ID using a temporary dictionary 
        // to properly handle the moveTo/lineTo sequence for each remote user.
        // For now, we rely on the server sending the full stroke on path:end.
        
        this.ctx.lineTo(x, y);
        this.ctx.stroke();
        this.ctx.closePath();
        this.ctx.restore();
    }

    // Finalizes the local stroke
    endLocalPath() {
        this.isDrawing = false;
        this.ctx.closePath();
    }
}