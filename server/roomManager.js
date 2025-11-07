import { v4 as uuidv4 } from 'uuid';

class RoomManager {
    constructor() {
        this.rooms = new Map();
        this.createRoom('default-room');
    }
    
    createRoom(roomId) {
        this.rooms.set(roomId, {
            users: new Map(),
            drawingActions: [], // Store ALL drawing actions
            undoneActions: []   // Store undone actions for redo
        });
        console.log(`🏠 Created room: ${roomId}`);
    }
    
    addUser(userId, roomId) {
        const room = this.rooms.get(roomId);
        if (!room) {
            this.createRoom(roomId);
            return this.addUser(userId, roomId);
        }
        
        const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7'];
        const color = colors[room.users.size % colors.length];
        
        const user = {
            id: userId,
            roomId,
            color,
            cursorPosition: null
        };
        
        room.users.set(userId, user);
        console.log(`👋 User ${userId} joined room ${roomId}`);
        return user;
    }
    
    removeUser(userId) {
        for (const [roomId, room] of this.rooms) {
            if (room.users.has(userId)) {
                room.users.delete(userId);
                console.log(`👋 User ${userId} left room ${roomId}`);
                break;
            }
        }
    }
    
    getRoomUsers(roomId) {
        const room = this.rooms.get(roomId);
        return room ? Array.from(room.users.values()) : [];
    }
    
    addDrawingAction(roomId, action) {
        const room = this.rooms.get(roomId);
        if (!room) return null;
        
        const actionWithId = {
            id: uuidv4(),
            timestamp: Date.now(),
            ...action
        };
        
        // Add to drawing actions for undo/redo
        room.drawingActions.push(actionWithId);
        
        console.log(`➕ Added ${action.type} action. Total actions: ${room.drawingActions.length}`);
        return actionWithId;
    }
    
    getDrawingHistory(roomId) {
        const room = this.rooms.get(roomId);
        return room ? [...room.drawingActions] : []; // Return COPY of current state
    }
    
    // FIXED UNDO: Remove last action and return updated state
    undo(roomId, userId) {
        const room = this.rooms.get(roomId);
        if (!room || room.drawingActions.length === 0) {
            console.log(`❌ No actions to undo for user ${userId}`);
            return null;
        }
        
        // Remove the last action
        const undoneAction = room.drawingActions.pop();
        
        // Store it for redo
        room.undoneActions.push(undoneAction);
        
        console.log(`↶ User ${userId} undid action. Remaining: ${room.drawingActions.length}, Undone: ${room.undoneActions.length}`);
        
        // Return the CURRENT state after undo
        return {
            undoneAction,
            currentState: [...room.drawingActions] // Return copy of current state
        };
    }
    
    // FIXED REDO: Re-add last undone action
    redo(roomId, userId) {
        const room = this.rooms.get(roomId);
        if (!room || room.undoneActions.length === 0) {
            console.log(`❌ No actions to redo for user ${userId}`);
            return null;
        }
        
        // Get the last undone action
        const redoneAction = room.undoneActions.pop();
        
        // Add it back to drawing actions
        room.drawingActions.push(redoneAction);
        
        console.log(`↷ User ${userId} redid action. Total: ${room.drawingActions.length}, Remaining undone: ${room.undoneActions.length}`);
        
        // Return the CURRENT state after redo
        return {
            redoneAction,
            currentState: [...room.drawingActions] // Return copy of current state
        };
    }
    
    clearCanvas(roomId, userId) {
        const room = this.rooms.get(roomId);
        if (!room) return null;
        
        // Clear both action stacks
        room.drawingActions = [];
        room.undoneActions = [];
        
        console.log(`🗑️ User ${userId} cleared canvas. Actions reset to 0`);
        
        return {
            clearAction: {
                type: 'clear',
                id: uuidv4(),
                timestamp: Date.now()
            },
            userId
        };
    }
    
    getRoomStats(roomId) {
        const room = this.rooms.get(roomId);
        if (!room) return null;
        
        return {
            users: room.users.size,
            totalActions: room.drawingActions.length,
            undoneActions: room.undoneActions.length,
            canUndo: room.drawingActions.length > 0,
            canRedo: room.undoneActions.length > 0
        };
    }
    
    getRoomState(roomId) {
        const room = this.rooms.get(roomId);
        if (!room) return null;
        
        return {
            users: this.getRoomUsers(roomId),
            drawingHistory: this.getDrawingHistory(roomId),
            roomStats: this.getRoomStats(roomId)
        };
    }
}

export default RoomManager;