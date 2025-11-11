// client/cursor-manager.js

class CursorManager {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        
        // Dynamic sizing
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        window.addEventListener('resize', this.handleResize);

        this.cursors = {}; // Store { userId: {x, y, color} }
        this.animationFrameId = null;

        this.startRenderingLoop();
    }
    
    handleResize = () => {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    // Update the position and color of a specific user's cursor
    updateCursor(userId, x, y, color) {
        if (userId === window.socketId) return; // Don't track own cursor

        this.cursors[userId] = { x, y, color };
    }

    // Remove a cursor when a user disconnects
    removeCursor(userId) {
        delete this.cursors[userId];
    }

    // The rendering loop, optimized with requestAnimationFrame
    renderCursors = () => {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        for (const userId in this.cursors) {
            const cursor = this.cursors[userId];
            
            // Draw a circle for the cursor
            this.ctx.beginPath();
            this.ctx.arc(cursor.x, cursor.y, 8, 0, Math.PI * 2); 
            this.ctx.fillStyle = cursor.color;
            this.ctx.fill();
            this.ctx.strokeStyle = '#fff';
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
            this.ctx.closePath();
            
            // Draw a small name tag (optional)
            this.ctx.fillStyle = '#000';
            this.ctx.fillText(userId.substring(0, 4), cursor.x + 10, cursor.y - 10);
        }

        this.animationFrameId = requestAnimationFrame(this.renderCursors);
    }
    
    startRenderingLoop() {
        if (!this.animationFrameId) {
            this.animationFrameId = requestAnimationFrame(this.renderCursors);
        }
    }
}