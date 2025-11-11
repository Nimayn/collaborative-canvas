// server/drawing-state.js

class GlobalDrawingState {
    constructor() {
        // The authoritative, chronological history of *completed* operations
        this.history = []; 
        this.opCounter = 0;
    }

    /**
     * Creates a new, unique operation object based on client data.
     * The server generates the definitive ID and adds metadata.
     */
    createOperation(userId, type, pathData) {
        // Server generates a unique, sequential ID
        const id = `op-${++this.opCounter}-${Date.now()}`;
        return {
            id,
            userId,
            type: type || 'draw', 
            tool: pathData.tool || 'brush',
            color: pathData.color || '#000000',
            width: pathData.width || 5,
            points: pathData.points || [], // Initial points from path:start
            isActive: true, // Used for undo/redo logic
            timestamp: Date.now()
        };
    }

    /**
     * Adds an operation to the history. Used when a stroke is started.
     */
    addOperation(op) {
        this.history.push(op);
    }

    /**
     * Updates an existing operation's points when the client sends path:end.
     * This makes the stroke authoritative and complete.
     */
    updateOperationPoints(id, finalPoints) {
        const op = this.history.find(o => o.id === id);
        if (op) {
            op.points = finalPoints;
            return op;
        }
        return null;
    }

    /**
     * Returns the full list of currently active drawing operations.
     */
    getCanvasState() {
        // Only return active operations for a clean canvas state
        return this.history.filter(op => op.isActive);
    }

    /**
     * Finds the last active operation and marks it as inactive (Undo).
     */
    undoLastOperation() {
        // Search backwards for the last ACTIVE operation
        for (let i = this.history.length - 1; i >= 0; i--) {
            if (this.history[i].isActive) {
                this.history[i].isActive = false; // Mark as undone
                return this.history[i].id; // Return the ID of the undone operation
            }
        }
        return null; // No operation to undo
    }
}

module.exports = { GlobalDrawingState };