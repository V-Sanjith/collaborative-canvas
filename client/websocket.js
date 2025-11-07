class WebSocketManager {
    constructor() {
        this.socket = null;
        this.isConnected = false;
        this.eventListeners = {};
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        
        this.connect();
    }
    
    connect() {
        try {
            // Connect to the same host
            this.socket = io({
                transports: ['websocket', 'polling'],
                reconnection: true,
                reconnectionAttempts: this.maxReconnectAttempts,
                reconnectionDelay: 1000
            });
            
            this.socket.on('connect', () => {
                console.log('✅ Connected to server with ID:', this.socket.id);
                this.isConnected = true;
                this.reconnectAttempts = 0;
                this.updateConnectionStatus(true);
                
                // Request current room state
                this.socket.emit('get-room-state');
            });
            
            this.socket.on('disconnect', (reason) => {
                console.log('❌ Disconnected from server:', reason);
                this.isConnected = false;
                this.updateConnectionStatus(false);
            });
            
            this.socket.on('connect_error', (error) => {
                console.error('🔌 Connection error:', error);
                this.isConnected = false;
                this.updateConnectionStatus(false);
                
                this.reconnectAttempts++;
                if (this.reconnectAttempts <= this.maxReconnectAttempts) {
                    console.log(`Reconnecting... (attempt ${this.reconnectAttempts})`);
                }
            });
            
            this.socket.on('reconnect', (attemptNumber) => {
                console.log('✅ Reconnected after', attemptNumber, 'attempts');
                this.isConnected = true;
                this.updateConnectionStatus(true);
            });
            
            // Forward all socket events to local listeners
            const events = [
                'drawing-data', 'cursor-move', 'user-joined', 
                'user-left', 'room-state', 'undo', 'redo', 'clear-canvas',
                'users-updated', 'user-tool-change', 'drawing-saved',
                'room-stats', 'error', 'canvas-state-update', 'action-failed'
            ];
            
            events.forEach(event => {
                this.socket.on(event, (data) => {
                    console.log(`📨 Received ${event}:`, data);
                    this.emit(event, data);
                });
            });
            
        } catch (error) {
            console.error('Failed to initialize WebSocket:', error);
        }
    }
    
    sendDrawingData(data) {
        if (this.isConnected && this.socket) {
            console.log('📤 Sending drawing data:', data.type);
            this.socket.emit('drawing-data', data);
        } else {
            console.warn('⚠️ Cannot send - not connected to server');
        }
    }
    
    sendCursorMove(position) {
        if (this.isConnected && this.socket) {
            this.socket.emit('cursor-move', position);
        }
    }
    
    undo() {
        if (this.isConnected) {
            console.log('📤 Sending undo request');
            this.socket.emit('undo');
        } else {
            console.warn('⚠️ Cannot undo - not connected to server');
        }
    }
    
    redo() {
        if (this.isConnected) {
            console.log('📤 Sending redo request');
            this.socket.emit('redo');
        } else {
            console.warn('⚠️ Cannot redo - not connected to server');
        }
    }
    
    clearCanvas() {
        if (this.isConnected) {
            console.log('📤 Sending clear canvas request');
            this.socket.emit('clear-canvas');
        } else {
            console.warn('⚠️ Cannot clear - not connected to server');
        }
    }
    
    getRoomStats() {
        if (this.isConnected) {
            this.socket.emit('get-stats');
        }
    }
    
    updateConnectionStatus(connected) {
        const statusElement = document.getElementById('connectionStatus');
        if (statusElement) {
            statusElement.textContent = connected ? '✅ Connected' : '❌ Disconnected';
            statusElement.className = connected ? 'connected' : 'disconnected';
        }
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
    
    // Get socket ID for debugging
    getSocketId() {
        return this.socket ? this.socket.id : null;
    }
}

export default WebSocketManager;