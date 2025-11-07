import CanvasManager from './canvas.js';
import WebSocketManager from './websocket.js';

class CollaborativeCanvas {
    constructor() {
        this.canvasManager = new CanvasManager();
        this.websocketManager = new WebSocketManager();
        
        this.initializeEventListeners();
        this.initializeWebSocket();
        this.initializeDebugPanel();
        
        console.log('🚀 Collaborative Canvas initialized');
    }
    
    initializeEventListeners() {
        // Tool selection
        document.querySelectorAll('.tool').forEach(tool => {
            tool.addEventListener('click', (e) => {
                this.setTool(e.target.dataset.tool);
            });
        });
        
        // Color picker
        document.getElementById('colorPicker').addEventListener('input', (e) => {
            this.setColor(e.target.value);
        });
        
        // Brush size
        const brushSize = document.getElementById('brushSize');
        const brushSizeValue = document.getElementById('brushSizeValue');
        
        brushSize.addEventListener('input', (e) => {
            this.setBrushSize(parseInt(e.target.value));
            brushSizeValue.textContent = `${e.target.value}px`;
        });
        
        // Undo/Redo buttons
        document.getElementById('undoBtn').addEventListener('click', () => {
            this.undo();
        });
        
        document.getElementById('redoBtn').addEventListener('click', () => {
            this.redo();
        });
        
        // Clear button
        document.getElementById('clearBtn').addEventListener('click', () => {
            this.clearCanvas();
        });
        
        console.log('🎮 Event listeners initialized');
    }
    
    // Add this method to the CollaborativeCanvas class
    addTestActions() {
        console.log('🧪 Adding test actions...');
        
        // Add some test drawing actions
        const testActions = [
            {
                type: 'move',
                startX: 50,
                startY: 50,
                endX: 100,
                endY: 100,
                tool: 'brush',
                color: '#FF0000',
                brushSize: 5
            },
            {
                type: 'move', 
                startX: 100,
                startY: 100,
                endX: 150,
                endY: 50,
                tool: 'brush',
                color: '#00FF00',
                brushSize: 5
            },
            {
                type: 'move',
                startX: 150,
                startY: 50,
                endX: 200,
                endY: 100,
                tool: 'brush',
                color: '#0000FF',
                brushSize: 5
            }
        ];
        
        testActions.forEach((action, index) => {
            setTimeout(() => {
                this.websocketManager.sendDrawingData(action);
                console.log(`✅ Sent test action ${index + 1}`);
            }, index * 500);
        });
    }
    
    // Update the initializeDebugPanel method to include test buttons
    initializeDebugPanel() {
        const debugBtn = document.getElementById('debugBtn');
        const debugInfo = document.getElementById('debugInfo');
        const testUndo = document.getElementById('testUndo');
        const testRedo = document.getElementById('testRedo');
        
        debugBtn.addEventListener('click', () => {
            debugInfo.style.display = debugInfo.style.display === 'none' ? 'block' : 'none';
        });
        
        testUndo.addEventListener('click', () => {
            console.log('🐛 DEBUG: Manual undo test');
            this.undo();
        });
        
        testRedo.addEventListener('click', () => {
            console.log('🐛 DEBUG: Manual redo test');
            this.redo();
        });
        
        // Add test actions button
        const testActionsBtn = document.createElement('button');
        testActionsBtn.textContent = 'Add Test Actions';
        testActionsBtn.id = 'testActions';
        testActionsBtn.style.background = '#9b59b6';
        testActionsBtn.style.color = 'white';
        testActionsBtn.style.border = 'none';
        testActionsBtn.style.padding = '3px 8px';
        testActionsBtn.style.borderRadius = '3px';
        testActionsBtn.style.cursor = 'pointer';
        testActionsBtn.style.fontSize = '10px';
        testActionsBtn.style.margin = '2px';
        
        testActionsBtn.addEventListener('click', () => {
            this.addTestActions();
        });
        
        debugInfo.appendChild(testActionsBtn);
        
        // Add server stats button
        const statsBtn = document.createElement('button');
        statsBtn.textContent = 'Get Stats';
        statsBtn.style.background = '#e67e22';
        statsBtn.style.color = 'white';
        statsBtn.style.border = 'none';
        statsBtn.style.padding = '3px 8px';
        statsBtn.style.borderRadius = '3px';
        statsBtn.style.cursor = 'pointer';
        statsBtn.style.fontSize = '10px';
        statsBtn.style.margin = '2px';
        
        statsBtn.addEventListener('click', () => {
            this.websocketManager.getRoomStats();
            console.log('📊 Requesting server stats...');
        });
        
        debugInfo.appendChild(statsBtn);
        
        console.log('🐛 Debug panel initialized');
    }
    
    setTool(tool) {
        this.canvasManager.setTool(tool);
        
        // Update UI
        document.querySelectorAll('.tool').forEach(t => t.classList.remove('active'));
        document.querySelector(`[data-tool="${tool}"]`).classList.add('active');
        
        // Broadcast tool change
        this.websocketManager.sendDrawingData({
            type: 'tool-change',
            tool: tool,
            color: this.canvasManager.currentColor,
            brushSize: this.canvasManager.brushSize
        });
        
        console.log('🛠️ Tool changed to:', tool);
    }
    
    setColor(color) {
        this.canvasManager.setColor(color);
        console.log('🎨 Color changed to:', color);
    }
    
    setBrushSize(size) {
        this.canvasManager.setBrushSize(size);
        console.log('📏 Brush size changed to:', size);
    }
    
    undo() {
        console.log('↶ User clicked undo');
        this.websocketManager.undo();
    }
    
    redo() {
        console.log('↷ User clicked redo');
        this.websocketManager.redo();
    }
    
    clearCanvas() {
        if (confirm('Clear the entire canvas? All users will see this change.')) {
            console.log('🗑️ User cleared canvas');
            this.websocketManager.clearCanvas();
        }
    }
    
    initializeWebSocket() {
        // Handle drawing events from server
        this.websocketManager.on('drawing-data', (data) => {
            console.log('📨 Received drawing data from server:', data.type);
            this.canvasManager.drawRemoteData(data);
            this.updateDebugInfo();
        });
        
        this.websocketManager.on('cursor-move', (data) => {
            this.canvasManager.updateUserCursor(data);
        });
        
        this.websocketManager.on('user-joined', (user) => {
            console.log('👋 User joined:', user.id);
            this.updateUserList();
        });
        
        this.websocketManager.on('user-left', (data) => {
            console.log('👋 User left:', data.userId);
            this.canvasManager.removeUserCursor(data.userId);
            this.updateUserList();
        });
        
        this.websocketManager.on('room-state', (state) => {
            console.log('🏠 Room state received:', state.users.length, 'users,', state.drawingHistory.length, 'drawing actions');
            this.canvasManager.initializeFromHistory(state.drawingHistory);
            this.updateUserList(state.users);
            this.updateDebugInfo();
        });
        
        this.websocketManager.on('users-updated', (data) => {
            this.updateUserList(data.users);
        });
        
        this.websocketManager.on('canvas-state-update', (data) => {
            console.log('🔄 Received canvas state update:', data.type);
            console.log('📊 Actions to redraw:', data.currentState.length);
            this.canvasManager.handleCanvasStateUpdate(data);
            this.updateDebugInfo();
        });
        
        this.websocketManager.on('clear-canvas', (data) => {
            console.log('🗑️ Canvas cleared by user:', data.userId);
            this.canvasManager.clearCanvas();
            this.updateDebugInfo();
        });
        
        this.websocketManager.on('action-failed', (data) => {
            console.log('❌ Action failed:', data.message);
            alert(data.message);
        });
        
        this.websocketManager.on('drawing-saved', (data) => {
            console.log('✅ Drawing saved:', data.actionId);
            this.updateDebugInfo();
        });
        
        this.websocketManager.on('room-stats', (stats) => {
            console.log('📊 Server stats:', stats);
            this.updateDebugInfoWithStats(stats);
        });
        
        this.websocketManager.on('error', (error) => {
            console.error('❌ WebSocket error:', error);
            alert('Connection error: ' + error.message);
        });
        
        // Handle local drawing events
        this.canvasManager.on('drawing-start', (data) => {
            console.log('📤 Sending drawing start');
            this.websocketManager.sendDrawingData(data);
        });
        
        this.canvasManager.on('drawing-move', (data) => {
            this.websocketManager.sendDrawingData(data);
        });
        
        this.canvasManager.on('drawing-end', (data) => {
            console.log('📤 Sending drawing end');
            this.websocketManager.sendDrawingData(data);
        });
        
        this.canvasManager.on('cursor-move', (position) => {
            this.websocketManager.sendCursorMove(position);
        });
    }
    
    updateUserList(users = null) {
        const userList = document.getElementById('userList');
        const userCount = document.getElementById('userCount');
        
        if (users) {
            userCount.textContent = users.length;
            userList.innerHTML = users.map(user => 
                `<div style="color: ${user.color}; margin: 2px 0;">
                 ● User ${user.id.slice(0, 8)}
                 </div>`
            ).join('');
        }
    }
    
    updateDebugInfo() {
        const actionCount = document.getElementById('actionCount');
        const undoneCount = document.getElementById('undoneCount');
        
        // Placeholder - in real implementation, this would come from server stats
        actionCount.textContent = '?';
        undoneCount.textContent = '?';
    }
    
    updateDebugInfoWithStats(stats) {
        const actionCount = document.getElementById('actionCount');
        const undoneCount = document.getElementById('undoneCount');
        
        if (stats && stats.drawingStats) {
            actionCount.textContent = stats.drawingStats.totalActions || '0';
            undoneCount.textContent = stats.drawingStats.undoneActions || '0';
            
            // Update button states based on undo/redo availability
            const undoBtn = document.getElementById('undoBtn');
            const redoBtn = document.getElementById('redoBtn');
            
            if (undoBtn) {
                undoBtn.disabled = !stats.drawingStats.canUndo;
                undoBtn.title = stats.drawingStats.canUndo ? 'Undo last action' : 'Nothing to undo';
            }
            
            if (redoBtn) {
                redoBtn.disabled = !stats.drawingStats.canRedo;
                redoBtn.title = stats.drawingStats.canRedo ? 'Redo last action' : 'Nothing to redo';
            }
        }
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new CollaborativeCanvas();
    console.log('🎉 Application ready! Open another browser window to test collaboration.');
    console.log('🐛 Click the debug button in top-left for testing tools');
    console.log('🧪 Use "Add Test Actions" to create test drawings for undo/redo testing');
});

// Export for debugging
window.CollaborativeCanvas = CollaborativeCanvas;