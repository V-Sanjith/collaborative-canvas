class CanvasManager {
    constructor() {
        this.canvas = document.getElementById('drawingCanvas');
        this.cursorCanvas = document.getElementById('cursorCanvas');
        this.cursorsContainer = document.getElementById('cursorsContainer');
        this.ctx = this.canvas.getContext('2d');
        this.cursorCtx = this.cursorCanvas.getContext('2d');
        
        this.setupCanvas();
        this.initializeDrawing();
        this.initializeCursors();
        
        this.eventListeners = {};
        this.currentTool = 'brush';
        this.currentColor = '#FF6B6B';
        this.brushSize = 5;
        this.isDrawing = false;
        this.lastX = 0;
        this.lastY = 0;
        this.currentPath = [];
    }
    
    setupCanvas() {
        const container = this.canvas.parentElement;
        const rect = container.getBoundingClientRect();
        
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;
        this.cursorCanvas.width = rect.width;
        this.cursorCanvas.height = rect.height;
        
        // Set white background
        this.ctx.fillStyle = 'white';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Smooth drawing
        this.ctx.lineJoin = 'round';
        this.ctx.lineCap = 'round';
        this.ctx.lineWidth = this.brushSize;
        
        console.log('🎨 Canvas setup complete:', this.canvas.width, 'x', this.canvas.height);
    }
    
    initializeDrawing() {
        this.isDrawing = false;
        this.lastX = 0;
        this.lastY = 0;
        this.currentPath = [];
        
        // Mouse events
        this.canvas.addEventListener('mousedown', this.startDrawing.bind(this));
        this.canvas.addEventListener('mousemove', this.draw.bind(this));
        this.canvas.addEventListener('mouseup', this.stopDrawing.bind(this));
        this.canvas.addEventListener('mouseout', this.stopDrawing.bind(this));
        
        // Touch events
        this.canvas.addEventListener('touchstart', this.handleTouch.bind(this));
        this.canvas.addEventListener('touchmove', this.handleTouch.bind(this));
        this.canvas.addEventListener('touchend', this.stopDrawing.bind(this));
        
        console.log('✏️ Drawing initialized');
    }
    
    initializeCursors() {
        this.userCursors = new Map();
        console.log('🖱️ Cursor tracking initialized');
    }
    
    startDrawing(e) {
        e.preventDefault();
        this.isDrawing = true;
        const { x, y } = this.getCoordinates(e);
        
        [this.lastX, this.lastY] = [x, y];
        this.currentPath = [{ x, y }];
        
        // Draw locally immediately
        this.ctx.beginPath();
        this.ctx.moveTo(x, y);
        this.ctx.strokeStyle = this.currentTool === 'eraser' ? 'white' : this.currentColor;
        this.ctx.lineWidth = this.brushSize;
        
        this.emit('drawing-start', { 
            type: 'start',
            x: x, 
            y: y,
            tool: this.currentTool,
            color: this.currentColor,
            brushSize: this.brushSize
        });
        
        console.log('🖊️ Drawing started at:', x, y);
    }
    
    draw(e) {
        if (!this.isDrawing) {
            // Just track cursor movement
            const { x, y } = this.getCoordinates(e);
            this.emit('cursor-move', { x, y });
            return;
        }
        
        e.preventDefault();
        const { x, y } = this.getCoordinates(e);
        
        // Draw locally
        this.ctx.lineTo(x, y);
        this.ctx.stroke();
        
        // Store the point
        this.currentPath.push({ x, y });
        
        // Send to server
        this.emit('drawing-move', { 
            type: 'move',
            startX: this.lastX, 
            startY: this.lastY, 
            endX: x, 
            endY: y,
            tool: this.currentTool,
            color: this.currentColor,
            brushSize: this.brushSize
        });
        
        this.lastX = x;
        this.lastY = y;
        
        // Update cursor position
        this.emit('cursor-move', { x, y });
    }
    
    stopDrawing() {
        if (!this.isDrawing) return;
        
        this.isDrawing = false;
        this.ctx.closePath();
        this.currentPath = [];
        
        this.emit('drawing-end', { 
            type: 'end'
        });
        
        console.log('🖊️ Drawing ended');
    }
    
    handleTouch(e) {
        e.preventDefault();
        if (e.touches.length > 0) {
            const touch = e.touches[0];
            const simulatedEvent = {
                clientX: touch.clientX,
                clientY: touch.clientY
            };
            
            if (e.type === 'touchstart') {
                this.startDrawing(simulatedEvent);
            } else if (e.type === 'touchmove') {
                this.draw(simulatedEvent);
            }
        }
    }
    
    getCoordinates(e) {
        const rect = this.canvas.getBoundingClientRect();
        const clientX = e.clientX || (e.touches && e.touches[0].clientX);
        const clientY = e.clientY || (e.touches && e.touches[0].clientY);
        
        return {
            x: clientX - rect.left,
            y: clientY - rect.top
        };
    }
    
    // Handle remote drawing data
    drawRemoteData(data) {
        console.log('🎨 Drawing remote data:', data.type, 'from user:', data.userId);
        
        if (data.type === 'clear') {
            this.clearCanvas();
            return;
        }
        
        this.ctx.strokeStyle = data.tool === 'eraser' ? 'white' : data.color;
        this.ctx.lineWidth = data.brushSize;
        this.ctx.lineJoin = 'round';
        this.ctx.lineCap = 'round';
        
        if (data.type === 'start') {
            this.ctx.beginPath();
            this.ctx.moveTo(data.x, data.y);
        } else if (data.type === 'move') {
            this.ctx.beginPath();
            this.ctx.moveTo(data.startX, data.startY);
            this.ctx.lineTo(data.endX, data.endY);
            this.ctx.stroke();
        }
    }
    
// Handle canvas state updates (undo/redo) - FIXED VERSION
handleCanvasStateUpdate(data) {
    console.log('🔄 Handling canvas state update:', data.type);
    console.log('📊 Actions to redraw:', data.currentState.length);
    
    // Always redraw the ENTIRE canvas with the new state
    this.redrawCanvas(data.currentState);
}

redrawCanvas(actions) {
    console.log('🎨 Redrawing canvas with', actions.length, 'actions');
    
    // COMPLETELY clear the canvas
    this.clearCanvas();
    
    // Redraw ALL actions in order
    actions.forEach((action, index) => {
        console.log(`   ↪ Redrawing action ${index + 1}:`, action.type);
        this.drawRemoteData(action);
    });
    
    console.log('✅ Canvas redraw complete');
}

clearCanvas() {
    this.ctx.fillStyle = 'white';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    console.log('🗑️ Canvas cleared for redraw');
}
    
    // Handle user cursors
    updateUserCursor(data) {
        const { userId, position, color } = data;
        
        if (!this.userCursors.has(userId)) {
            this.createUserCursor(userId, color);
        }
        
        const cursor = this.userCursors.get(userId);
        if (cursor && cursor.element) {
            cursor.element.style.left = `${position.x}px`;
            cursor.element.style.top = `${position.y}px`;
            cursor.element.style.color = color;
        }
    }
    
    createUserCursor(userId, color) {
        const cursor = document.createElement('div');
        cursor.className = 'user-cursor';
        cursor.style.color = color;
        cursor.style.position = 'absolute';
        cursor.style.zIndex = '1000';
        cursor.style.pointerEvents = 'none';
        cursor.style.width = '10px';
        cursor.style.height = '10px';
        cursor.style.background = 'currentColor';
        cursor.style.borderRadius = '50%';
        cursor.style.transform = 'translate(-50%, -50%)';
        
        // Add user ID label
        const label = document.createElement('div');
        label.textContent = `User ${userId.slice(0, 4)}`;
        label.style.color = color;
        label.style.fontSize = '12px';
        label.style.marginTop = '15px';
        label.style.whiteSpace = 'nowrap';
        cursor.appendChild(label);
        
        this.cursorsContainer.appendChild(cursor);
        this.userCursors.set(userId, { element: cursor });
        
        console.log('🖱️ Created cursor for user:', userId);
    }
    
    removeUserCursor(userId) {
        if (this.userCursors.has(userId)) {
            const cursor = this.userCursors.get(userId);
            if (cursor.element) {
                cursor.element.remove();
            }
            this.userCursors.delete(userId);
            console.log('🖱️ Removed cursor for user:', userId);
        }
    }
    
    setTool(tool) {
        this.currentTool = tool;
        this.canvas.style.cursor = tool === 'eraser' ? 'crosshair' : 'crosshair';
        console.log('🛠️ Tool changed to:', tool);
    }
    
    setColor(color) {
        this.currentColor = color;
        console.log('🎨 Color changed to:', color);
    }
    
    setBrushSize(size) {
        this.brushSize = size;
        this.ctx.lineWidth = size;
        console.log('📏 Brush size changed to:', size);
    }
    
    initializeFromHistory(history) {
        console.log('📚 Initializing from history:', history.length, 'actions');
        this.redrawCanvas(history);
    }
    
    // Event emitter methods
    on(event, callback) {
        if (!this.eventListeners[event]) {
            this.eventListeners[event] = [];
        }
        this.eventListeners[event].push(callback);
    }
    
    emit(event, data) {
        if (this.eventListeners[event]) {
            this.eventListeners[event].forEach(callback => callback(data));
        }
    }
}

export default CanvasManager;