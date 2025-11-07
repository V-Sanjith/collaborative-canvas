import { v4 as uuidv4 } from 'uuid';

class DrawingState {
    constructor() {
        this.actions = [];
        this.undoneActions = [];
        this.maxHistorySize = 1000; // Prevent memory issues
        console.log('📊 DrawingState initialized');
    }

    // Add a new drawing action
    addAction(action) {
        const actionWithId = {
            id: uuidv4(),
            timestamp: Date.now(),
            ...action
        };

        this.actions.push(actionWithId);
        this.undoneActions = []; // Clear redo stack on new action
        
        // Limit history size to prevent memory issues
        if (this.actions.length > this.maxHistorySize) {
            const removed = this.actions.shift();
            console.log(`📦 History full, removed oldest action: ${removed.id}`);
        }

        console.log(`➕ Added action ${actionWithId.id} (${action.type}), total: ${this.actions.length}`);
        return actionWithId;
    }

    // Get all drawing actions
    getActions() {
        return [...this.actions]; // Return copy to prevent mutation
    }

    // Get actions since a specific timestamp (for sync)
    getActionsSince(timestamp) {
        return this.actions.filter(action => action.timestamp > timestamp);
    }

    // Undo the last action
    undo() {
        if (this.actions.length === 0) {
            console.log('↶ No actions to undo');
            return null;
        }

        const undoneAction = this.actions.pop();
        this.undoneActions.push(undoneAction);

        console.log(`↶ Undid action ${undoneAction.id}, remaining: ${this.actions.length}, undone: ${this.undoneActions.length}`);
        return undoneAction;
    }

    // Redo the last undone action
    redo() {
        if (this.undoneActions.length === 0) {
            console.log('↷ No actions to redo');
            return null;
        }

        const redoneAction = this.undoneActions.pop();
        this.actions.push(redoneAction);

        console.log(`↷ Redid action ${redoneAction.id}, total: ${this.actions.length}, remaining undone: ${this.undoneActions.length}`);
        return redoneAction;
    }

    // Clear all drawing actions
    clear() {
        const clearedCount = this.actions.length;
        this.actions = [];
        this.undoneActions = [];
        
        const clearAction = {
            type: 'clear',
            id: uuidv4(),
            timestamp: Date.now(),
            clearedCount
        };
        
        console.log(`🗑️ Cleared all ${clearedCount} actions`);
        return clearAction;
    }

    // Get the current canvas state as a snapshot
    getStateSnapshot() {
        return {
            actions: [...this.actions],
            undoneActions: [...this.undoneActions],
            lastActionId: this.actions.length > 0 ? this.actions[this.actions.length - 1].id : null,
            totalActions: this.actions.length,
            totalUndone: this.undoneActions.length
        };
    }

    // Replay actions to rebuild canvas state (for new users)
    replayActions(ctx, canvasWidth, canvasHeight) {
        // Clear canvas first
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);

        // Replay all actions
        this.actions.forEach(action => {
            this.replayAction(ctx, action);
        });
        
        console.log(`🎬 Replayed ${this.actions.length} actions`);
    }

    // Replay a single action
    replayAction(ctx, action) {
        if (action.type === 'clear') {
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
            return;
        }

        ctx.strokeStyle = action.tool === 'eraser' ? 'white' : action.color;
        ctx.lineWidth = action.brushSize || 5;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';

        if (action.type === 'start') {
            ctx.beginPath();
            ctx.moveTo(action.x, action.y);
        } else if (action.type === 'move') {
            ctx.beginPath();
            ctx.moveTo(action.startX, action.startY);
            ctx.lineTo(action.endX, action.endY);
            ctx.stroke();
        }
        // Note: 'end' type actions don't need replay as they're just path endings
    }

    // Get statistics about the drawing state
    getStats() {
        return {
            totalActions: this.actions.length,
            undoneActions: this.undoneActions.length,
            lastActionTime: this.actions.length > 0 ? this.actions[this.actions.length - 1].timestamp : null,
            memoryUsage: this.actions.length * 100, // Rough estimate in bytes
            canUndo: this.actions.length > 0,
            canRedo: this.undoneActions.length > 0
        };
    }

    // Find action by ID (useful for specific undo operations)
    findActionById(actionId) {
        return this.actions.find(action => action.id === actionId) || 
               this.undoneActions.find(action => action.id === actionId);
    }

    // Remove specific action (advanced feature)
    removeAction(actionId) {
        const actionIndex = this.actions.findIndex(action => action.id === actionId);
        if (actionIndex !== -1) {
            return this.actions.splice(actionIndex, 1)[0];
        }
        
        const undoneIndex = this.undoneActions.findIndex(action => action.id === actionId);
        if (undoneIndex !== -1) {
            return this.undoneActions.splice(undoneIndex, 1)[0];
        }
        
        return null;
    }
}

export default DrawingState;