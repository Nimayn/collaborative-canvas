// server/drawing-state.js

class GlobalDrawingState {
    constructor() {
        // The authoritative, chronological history of *completed* operations
        this.history = []; 
        this.opCounter = 0;
    }

    createOperation(userId, type, pathData) {
        // Server generates a unique, sequential ID
        const id = `op-${++this.opCounter}`;
        return {
            id,
            userId,
            type: 'draw', 
            tool: pathData.tool || 'brush', // brush, eraser, etc.
            color: pathData.color,
            width: pathData.width,
            points: pathData.points || [], // Store all points of the stroke
            isActive: true, // Used for undo/redo logic
            timestamp: Date.now()
        };
    }

    addOperation(op) {
        this.history.push(op);
    }

    getCanvasState() {
        // Only return active operations
        return this.history.filter(op => op.isActive);
    }

    undoLastOperation() {
        // Find the last ACTIVE operation
        for (let i = this.history.length - 1; i >= 0; i--) {
            if (this.history[i].isActive) {
                this.history[i].isActive = false; // Mark as undone
                return this.history[i].id; // Return the ID of the undone operation
            }
        }
        return null; // No operation to undo
    }
    // Redo would involve flipping the last inactive operation's 'isActive' back to true.
}

module.exports = { GlobalDrawingState };