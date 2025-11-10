// client/cursor-manager.js

class CursorManager {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.cursors = {}; // Store { userId: {x, y, color} }
        this.colorMap = {}; // Map userId to a stable color
        this.animationFrameId = null;

        // Assign static colors to users for easy identification
        this.availableColors = ['#f00', '#00f', '#0c0', '#f90', '#90f'];

        this.startRenderingLoop();
    }

    // Assign a consistent color to a user
    getUserColor(userId) {
        if (!this.colorMap[userId]) {
            // Assign a color cyclically
            const index = Object.keys(this.colorMap).length % this.availableColors.length;
            this.colorMap[userId] = this.availableColors[index];
        }
        return this.colorMap[userId];
    }

    // Update the position of a specific user's cursor
    updateCursor(userId, x, y) {
        if (userId === window.socketId) return; // Don't track own cursor

        this.cursors[userId] = { 
            x, 
            y, 
            color: this.getUserColor(userId) 
        };
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
            this.ctx.beginPath();
            this.ctx.arc(cursor.x, cursor.y, 8, 0, Math.PI * 2); // 8px radius dot
            this.ctx.fillStyle = cursor.color;
            this.ctx.fill();
            this.ctx.strokeStyle = '#fff';
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
            this.ctx.closePath();
            
            // Optional: Draw User ID/Name label
        }

        this.animationFrameId = requestAnimationFrame(this.renderCursors);
    }
    
    startRenderingLoop() {
        if (!this.animationFrameId) {
            this.animationFrameId = requestAnimationFrame(this.renderCursors);
        }
    }
}
// window.socketId would need to be set in main.js after connecting