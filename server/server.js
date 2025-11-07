import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import RoomManager from './roomManager.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const roomManager = new RoomManager();

// Serve static files from client directory
app.use(express.static(path.join(__dirname, '../client')));

// API routes for health checks and stats
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

app.get('/api/rooms/:roomId/stats', (req, res) => {
  const { roomId } = req.params;
  const stats = roomManager.getRoomStats(roomId);
  
  if (!stats) {
    return res.status(404).json({ error: 'Room not found' });
  }
  
  res.json(stats);
});

app.get('/api/rooms', (req, res) => {
  const rooms = Array.from(roomManager.rooms.entries()).map(([roomId, room]) => ({
    roomId,
    userCount: room.users.size,
    ...roomManager.getRoomStats(roomId)
  }));
  
  res.json({ rooms });
});

// Main route - serve the application
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/index.html'));
});

// Handle 404
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('🎉 User connected:', socket.id);
  
  // Join a room (for now, using default room)
  const roomId = 'default-room';
  socket.join(roomId);
  
  // Add user to room manager
  const user = roomManager.addUser(socket.id, roomId);
  
  if (!user) {
    socket.emit('error', { message: 'Failed to join room' });
    socket.disconnect();
    return;
  }
  
  console.log(`👤 User ${socket.id} joined room ${roomId} with color ${user.color}`);
  
  // Send current room state to new user
  const roomState = {
    users: roomManager.getRoomUsers(roomId),
    drawingHistory: roomManager.getDrawingHistory(roomId),
    roomStats: roomManager.getRoomStats(roomId),
    yourColor: user.color
  };
  
  socket.emit('room-state', roomState);
  
  // Broadcast new user to others in the room
  socket.to(roomId).emit('user-joined', user);
  
  // Notify everyone about updated user count
  io.to(roomId).emit('users-updated', {
    users: roomManager.getRoomUsers(roomId),
    userCount: roomManager.getRoomUsers(roomId).length
  });

  // Handle drawing events
  socket.on('drawing-data', (data) => {
    try {
      // Validate drawing data
      if (!data || !data.type) {
        socket.emit('error', { message: 'Invalid drawing data' });
        return;
      }
      
      console.log(`🎨 Received ${data.type} drawing from ${socket.id}`);
      
      // Add to room's drawing history
      const action = roomManager.addDrawingAction(roomId, {
        ...data,
        userId: socket.id,
        timestamp: Date.now()
      });
      
      if (!action) {
        socket.emit('error', { message: 'Failed to save drawing action' });
        return;
      }
      
      // Broadcast to other users in the room (excluding sender)
      socket.to(roomId).emit('drawing-data', action);
      
      // Send confirmation to sender
      socket.emit('drawing-saved', { 
        actionId: action.id,
        timestamp: action.timestamp
      });
      
    } catch (error) {
      console.error('❌ Error handling drawing data:', error);
      socket.emit('error', { message: 'Failed to process drawing' });
    }
  });
  
  // Handle cursor movement
  socket.on('cursor-move', (position) => {
    try {
      // Validate position data
      if (!position || typeof position.x !== 'number' || typeof position.y !== 'number') {
        return;
      }
      
      // Broadcast to other users in the room
      socket.to(roomId).emit('cursor-move', {
        userId: socket.id,
        position,
        color: user.color,
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('❌ Error handling cursor move:', error);
    }
  });
  
// Handle undo action - FIXED VERSION
socket.on('undo', () => {
    try {
        console.log(`↶ User ${socket.id} requested undo`);
        
        const result = roomManager.undo(roomId, socket.id);
        if (result) {
            // Broadcast the UPDATED state to ALL users
            io.to(roomId).emit('canvas-state-update', {
                type: 'undo',
                currentState: result.currentState, // This is the state AFTER undo
                userId: socket.id,
                timestamp: Date.now()
            });
            
            console.log(`✅ Undo successful. Now ${result.currentState.length} actions`);
        } else {
            socket.emit('action-failed', { 
                message: 'Nothing to undo'
            });
            console.log(`❌ Nothing to undo for ${socket.id}`);
        }
    } catch (error) {
        console.error('❌ Error handling undo:', error);
        socket.emit('error', { message: 'Failed to undo action' });
    }
});

// Handle redo action - FIXED VERSION
socket.on('redo', () => {
    try {
        console.log(`↷ User ${socket.id} requested redo`);
        
        const result = roomManager.redo(roomId, socket.id);
        if (result) {
            // Broadcast the UPDATED state to ALL users
            io.to(roomId).emit('canvas-state-update', {
                type: 'redo', 
                currentState: result.currentState, // This is the state AFTER redo
                userId: socket.id,
                timestamp: Date.now()
            });
            
            console.log(`✅ Redo successful. Now ${result.currentState.length} actions`);
        } else {
            socket.emit('action-failed', { 
                message: 'Nothing to redo'
            });
            console.log(`❌ Nothing to redo for ${socket.id}`);
        }
    } catch (error) {
        console.error('❌ Error handling redo:', error);
        socket.emit('error', { message: 'Failed to redo action' });
    }
});
  
  // Handle clear canvas
  socket.on('clear-canvas', () => {
    try {
      console.log(`🗑️ User ${socket.id} requested clear canvas`);
      const clearAction = roomManager.clearCanvas(roomId, socket.id);
      
      if (clearAction) {
        // Broadcast clear to all users in the room
        io.to(roomId).emit('clear-canvas', {
          actionId: clearAction.id,
          userId: socket.id,
          timestamp: Date.now()
        });
        
        console.log(`✅ Canvas cleared by ${socket.id}`);
      }
    } catch (error) {
      console.error('❌ Error clearing canvas:', error);
      socket.emit('error', { message: 'Failed to clear canvas' });
    }
  });
  
  // Handle get room stats
  socket.on('get-stats', () => {
    try {
      const stats = roomManager.getRoomStats(roomId);
      socket.emit('room-stats', stats);
    } catch (error) {
      console.error('❌ Error getting stats:', error);
      socket.emit('error', { message: 'Failed to get room stats' });
    }
  });
  
  // Handle get room state request
  socket.on('get-room-state', () => {
    try {
      const roomState = roomManager.getRoomState(roomId);
      socket.emit('room-state', roomState);
      console.log(`📋 Sent room state to user ${socket.id}`);
    } catch (error) {
      console.error('❌ Error getting room state:', error);
      socket.emit('error', { message: 'Failed to get room state' });
    }
  });
  
  // Handle tool change broadcast
  socket.on('tool-change', (toolData) => {
    try {
      // Broadcast tool change to other users
      socket.to(roomId).emit('user-tool-change', {
        userId: socket.id,
        tool: toolData.tool,
        color: toolData.color,
        brushSize: toolData.brushSize,
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('❌ Error handling tool change:', error);
    }
  });
  
  // Handle chat messages (bonus feature)
  socket.on('chat-message', (message) => {
    try {
      if (!message.text || message.text.trim() === '') {
        return;
      }
      
      const chatMessage = {
        id: Date.now().toString(),
        userId: socket.id,
        userColor: user.color,
        text: message.text.trim(),
        timestamp: Date.now()
      };
      
      // Broadcast to all users in the room
      io.to(roomId).emit('chat-message', chatMessage);
    } catch (error) {
      console.error('❌ Error handling chat message:', error);
    }
  });
  
  // Handle ping (for connection health)
  socket.on('ping', () => {
    socket.emit('pong', { timestamp: Date.now() });
  });
  
  // Handle disconnect
  socket.on('disconnect', (reason) => {
    console.log(`🔴 User ${socket.id} disconnected:`, reason);
    
    try {
      // Remove user from room manager
      roomManager.removeUser(socket.id);
      
      // Notify other users in the room
      socket.to(roomId).emit('user-left', {
        userId: socket.id,
        timestamp: Date.now()
      });
      
      // Update user count for remaining users
      io.to(roomId).emit('users-updated', {
        users: roomManager.getRoomUsers(roomId),
        userCount: roomManager.getRoomUsers(roomId).length
      });
      
      console.log(`✅ User ${socket.id} removed from room ${roomId}`);
    } catch (error) {
      console.error('❌ Error handling disconnect:', error);
    }
  });
  
  // Handle connection errors
  socket.on('error', (error) => {
    console.error(`🔴 Socket error for user ${socket.id}:`, error);
  });
});

// Graceful shutdown handling
const gracefulShutdown = (signal) => {
  console.log(`\n🔴 Received ${signal}. Starting graceful shutdown...`);
  
  // Notify all clients
  io.emit('server-shutdown', { 
    message: 'Server is shutting down',
    timestamp: Date.now()
  });
  
  // Close socket.io
  io.close(() => {
    console.log('✅ Socket.io closed');
  });
  
  // Close HTTP server
  server.close(() => {
    console.log('✅ HTTP server closed');
    process.exit(0);
  });
  
  // Force close after 10 seconds
  setTimeout(() => {
    console.error('🔴 Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

// Handle different shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('🔴 Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('🔴 Unhandled Rejection at:', promise, 'reason:', reason);
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Collaborative Canvas Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🎨 Application: http://localhost:${PORT}`);
  console.log(`🔗 WebSocket server ready for connections`);
});

export { app, io, roomManager };