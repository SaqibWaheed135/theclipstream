// utils/socket.js
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import LiveStream from '../models/LiveStream.js';
import User from '../models/User.js';

let io;

const initializeSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: [
        "http://localhost:3000",
        "http://localhost:5173", // Vite default port
        "http://localhost:4173", // Vite preview port
        process.env.FRONTEND_URL || "http://localhost:3000"
      ],
      methods: ["GET", "POST"],
      credentials: true,
      allowedHeaders: ["authorization"]
    }
  });

  // Authentication middleware for socket
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || 
                   socket.handshake.headers.authorization?.split(' ')[1];
      
      if (!token) {
        // Allow anonymous viewers
        socket.userId = null;
        socket.isAuthenticated = false;
        return next();
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId || decoded.id).select('-password');
      
      if (!user) {
        socket.userId = null;
        socket.isAuthenticated = false;
      } else {
        socket.userId = user._id.toString();
        socket.user = user;
        socket.isAuthenticated = true;
      }
      
      next();
    } catch (error) {
      console.error('Socket auth error:', error);
      socket.userId = null;
      socket.isAuthenticated = false;
      next();
    }
  });

  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.userId || 'Anonymous'}`);

    // Join a live stream room
    socket.on('join-stream', async (data) => {
      try {
        const { streamId, isStreamer } = data;
        
        const liveStream = await LiveStream.findById(streamId)
          .populate('streamer', 'username avatar');
        
        if (!liveStream) {
          socket.emit('error', { message: 'Live stream not found' });
          return;
        }

        // Join the room
        socket.join(`stream-${streamId}`);
        socket.currentStreamId = streamId;
        socket.isStreamer = isStreamer;

        if (isStreamer) {
          // Streamer joining their own stream
          if (!socket.isAuthenticated || liveStream.streamer._id.toString() !== socket.userId) {
            socket.emit('error', { message: 'Not authorized to stream' });
            return;
          }
          
          socket.emit('stream-started', {
            streamId,
            stream: liveStream
          });
        } else {
          // Viewer joining stream
          if (socket.isAuthenticated) {
            await liveStream.addViewer(socket.userId);
          } else {
            // Anonymous viewer
            liveStream.totalViews += 1;
            await liveStream.save();
          }

          // Notify all users in stream about new viewer count
          const viewerCount = liveStream.currentViewers + (socket.isAuthenticated ? 0 : 1);
          io.to(`stream-${streamId}`).emit('viewer-joined', {
            viewerCount,
            totalViews: liveStream.totalViews
          });

          socket.emit('joined-stream', {
            stream: liveStream,
            viewerCount
          });
        }
      } catch (error) {
        console.error('Join stream error:', error);
        socket.emit('error', { message: 'Could not join stream' });
      }
    });

    // Leave stream room
    socket.on('leave-stream', async (data) => {
      try {
        const { streamId } = data;
        
        if (socket.currentStreamId) {
          socket.leave(`stream-${socket.currentStreamId}`);
          
          if (socket.isAuthenticated && !socket.isStreamer) {
            const liveStream = await LiveStream.findById(socket.currentStreamId);
            if (liveStream) {
              await liveStream.removeViewer(socket.userId);
              
              io.to(`stream-${socket.currentStreamId}`).emit('viewer-left', {
                viewerCount: liveStream.currentViewers
              });
            }
          }
          
          socket.currentStreamId = null;
          socket.isStreamer = false;
        }
      } catch (error) {
        console.error('Leave stream error:', error);
      }
    });

    // Send comment in live stream
    socket.on('send-comment', async (data) => {
      try {
        const { streamId, text } = data;
        
        if (!text || text.trim().length === 0) {
          socket.emit('error', { message: 'Comment cannot be empty' });
          return;
        }

        if (text.length > 200) {
          socket.emit('error', { message: 'Comment too long' });
          return;
        }

        const liveStream = await LiveStream.findById(streamId);
        if (!liveStream || liveStream.status !== 'live') {
          socket.emit('error', { message: 'Live stream not found or not active' });
          return;
        }

        const comment = {
          text: text.trim(),
          timestamp: Date.now(),
          username: socket.isAuthenticated ? socket.user.username : 'Anonymous',
          userId: socket.userId,
          avatar: socket.isAuthenticated ? socket.user.avatar : null
        };

        // Save comment to database if authenticated
        if (socket.isAuthenticated) {
          await liveStream.addComment(socket.userId, text.trim());
        }

        // Broadcast comment to all viewers in the stream
        io.to(`stream-${streamId}`).emit('new-comment', comment);
      } catch (error) {
        console.error('Send comment error:', error);
        socket.emit('error', { message: 'Could not send comment' });
      }
    });

    // Send heart/like in live stream
    socket.on('send-heart', async (data) => {
      try {
        const { streamId } = data;
        
        const liveStream = await LiveStream.findById(streamId);
        if (!liveStream || liveStream.status !== 'live') {
          socket.emit('error', { message: 'Live stream not found or not active' });
          return;
        }

        // Update hearts count
        await liveStream.addHeart();

        // Broadcast heart to all viewers
        io.to(`stream-${streamId}`).emit('heart-sent', {
          userId: socket.userId,
          username: socket.isAuthenticated ? socket.user.username : 'Anonymous',
          timestamp: Date.now()
        });
      } catch (error) {
        console.error('Send heart error:', error);
        socket.emit('error', { message: 'Could not send heart' });
      }
    });

    // End live stream (streamer only)
    socket.on('end-stream', async (data) => {
      try {
        const { streamId } = data;
        
        const liveStream = await LiveStream.findById(streamId);
        if (!liveStream) {
          socket.emit('error', { message: 'Live stream not found' });
          return;
        }

        // Verify streamer authorization
        if (!socket.isAuthenticated || liveStream.streamer.toString() !== socket.userId) {
          socket.emit('error', { message: 'Not authorized to end this stream' });
          return;
        }

        // End the stream
        liveStream.status = 'ended';
        liveStream.endedAt = new Date();
        liveStream.duration = Math.floor((Date.now() - liveStream.startedAt.getTime()) / 1000);
        await liveStream.save();

        // Notify all viewers that stream has ended
        io.to(`stream-${streamId}`).emit('stream-ended', {
          message: 'The live stream has ended',
          duration: liveStream.duration,
          totalViews: liveStream.totalViews,
          heartsReceived: liveStream.heartsReceived
        });

        // Remove all users from the room
        const room = io.sockets.adapter.rooms.get(`stream-${streamId}`);
        if (room) {
          room.forEach(socketId => {
            const clientSocket = io.sockets.sockets.get(socketId);
            if (clientSocket) {
              clientSocket.leave(`stream-${streamId}`);
              clientSocket.currentStreamId = null;
              clientSocket.isStreamer = false;
            }
          });
        }
      } catch (error) {
        console.error('End stream error:', error);
        socket.emit('error', { message: 'Could not end stream' });
      }
    });

    // Handle WebRTC signaling for peer-to-peer connections
    socket.on('offer', (data) => {
      socket.to(`stream-${data.streamId}`).emit('offer', {
        offer: data.offer,
        senderId: socket.id
      });
    });

    socket.on('answer', (data) => {
      socket.to(`stream-${data.streamId}`).emit('answer', {
        answer: data.answer,
        senderId: socket.id
      });
    });

    socket.on('ice-candidate', (data) => {
      socket.to(`stream-${data.streamId}`).emit('ice-candidate', {
        candidate: data.candidate,
        senderId: socket.id
      });
    });

    // Handle disconnection
    socket.on('disconnect', async () => {
      console.log(`User disconnected: ${socket.userId || 'Anonymous'}`);
      
      try {
        if (socket.currentStreamId) {
          if (socket.isStreamer) {
            // Streamer disconnected - end the stream
            const liveStream = await LiveStream.findById(socket.currentStreamId);
            if (liveStream && liveStream.status === 'live') {
              liveStream.status = 'ended';
              liveStream.endedAt = new Date();
              liveStream.duration = Math.floor((Date.now() - liveStream.startedAt.getTime()) / 1000);
              await liveStream.save();

              io.to(`stream-${socket.currentStreamId}`).emit('stream-ended', {
                message: 'The streamer has disconnected',
                duration: liveStream.duration
              });
            }
          } else if (socket.isAuthenticated) {
            // Viewer disconnected - remove from viewer list
            const liveStream = await LiveStream.findById(socket.currentStreamId);
            if (liveStream) {
              await liveStream.removeViewer(socket.userId);
              
              io.to(`stream-${socket.currentStreamId}`).emit('viewer-left', {
                viewerCount: liveStream.currentViewers
              });
            }
          }
        }
      } catch (error) {
        console.error('Disconnect cleanup error:', error);
      }
    });
  });

  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error('Socket.IO not initialized');
  }
  return io;
};

export { initializeSocket, getIO };