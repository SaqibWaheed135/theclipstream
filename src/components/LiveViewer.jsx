import React, { useState, useEffect, useRef } from 'react';
import { Heart, MessageCircle, Share2, Users, Send, ArrowLeft, Camera } from 'lucide-react';
import io from 'socket.io-client';
import { useParams, useNavigate } from 'react-router-dom';
import { Room, RoomEvent, Track } from 'livekit-client'; // LiveKit SDK

const LiveViewer = () => {
  const { streamId } = useParams();
  const navigate = useNavigate();

  const [stream, setStream] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [viewers, setViewers] = useState(0);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [hearts, setHearts] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);
  const [hasRequestedCohost, setHasRequestedCohost] = useState(false);
  const [liveKitRoom, setLiveKitRoom] = useState(null);

  const socketRef = useRef(null);
  const videoRefs = useRef({}); // Refs for each participant's video
  const commentsEndRef = useRef(null);

  // LiveKit config
  const LIVEKIT_URL = process.env.REACT_APP_LIVEKIT_URL || 'wss://your-project.livekit.cloud';

  // Initialize socket and join stream
  useEffect(() => {
    const initializeStream = async () => {
      try {
        setIsLoading(true);

        // Fetch stream info (includes viewer token from backend)
        const response = await fetch(`https://theclipstream-backend.onrender.com/api/live/${streamId}`, {
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error('Stream not found');
        }

        const streamData = await response.json();
        setStream(streamData);

        // Initialize socket
        const token = localStorage.getItem('token');
        socketRef.current = io('https://theclipstream-backend.onrender.com', {
          withCredentials: true,
          auth: token ? { token } : {},
        });

        socketRef.current.on('connect', () => {
          setIsConnected(true);
          socketRef.current.emit('join-stream', { streamId, isStreamer: false });
        });

        socketRef.current.on('disconnect', () => {
          setIsConnected(false);
        });

        socketRef.current.on('joined-stream', async (data) => {
          setViewers(data.viewerCount);
          setStream(data.stream);
          setIsLoading(false);

          // Connect to LiveKit room as viewer
          await connectToLiveKitRoom(data.stream.viewerToken);
        });

        socketRef.current.on('viewer-joined', (data) => {
          setViewers(data.viewerCount);
        });

        socketRef.current.on('viewer-left', (data) => {
          setViewers(data.viewerCount);
        });

        socketRef.current.on('new-comment', (comment) => {
          setComments((prev) => [...prev, comment]);
        });

        socketRef.current.on('heart-sent', () => {
          addHeart();
        });

        socketRef.current.on('stream-ended', () => {
          setError('This live stream has ended');
          setTimeout(() => navigate('/'), 3000);
        });

        socketRef.current.on('cohost-joined', (data) => {
          setStream(data.stream);
          // Re-subscribe if new publisher joins
          if (liveKitRoom) {
            liveKitRoom.remoteParticipants.forEach((participant) => {
              participant.tracks.forEach((publication) => {
                if (publication.isSubscribed && publication.track.kind === Track.Kind.Video) {
                  const track = publication.track;
                  const videoEl = videoRefs.current[participant.identity];
                  if (videoEl) track.attach(videoEl);
                }
              });
            });
          }
        });

        socketRef.current.on('cohost-approved', (data) => {
          alert(`Approved! Use these details to stream:
RTMP URL: ${data.rtmpUrl}
Stream Key: ${data.streamKey}
Or WebRTC token: ${data.publishToken}`);
          setHasRequestedCohost(false);
        });

        socketRef.current.on('cohost-rejected', () => {
          alert('Your co-host request has been rejected.');
          setHasRequestedCohost(false);
        });

        socketRef.current.on('error', (errorData) => {
          setError(errorData.message);
          setIsLoading(false);
        });
      } catch (err) {
        console.error('Stream initialization error:', err);
        setError(err.message);
        setIsLoading(false);
      }
    };

    initializeStream();

    return () => {
      if (socketRef.current) {
        socketRef.current.emit('leave-stream', { streamId });
        socketRef.current.disconnect();
      }
      if (liveKitRoom) {
        liveKitRoom.disconnect();
      }
    };
  }, [streamId, navigate]);

  const connectToLiveKitRoom = async (viewerToken) => {
    try {
      const room = new Room();
      await room.connect(LIVEKIT_URL, viewerToken);
      setLiveKitRoom(room);

      // Subscribe to remote tracks (streams from hosts/co-hosts)
      room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
        console.log('Subscribed to track from:', participant.identity);
        if (track.kind === Track.Kind.Video) {
          const videoEl = videoRefs.current[participant.identity];
          if (videoEl) {
            track.attach(videoEl);
            videoEl.play().catch(console.error);
          }
        }
      });

      room.on(RoomEvent.ParticipantConnected, (participant) => {
        console.log('New participant joined:', participant.identity);
      });

      console.log('LiveKit room connected as viewer');
    } catch (error) {
      console.error('LiveKit viewer connection error:', error);
      setError('Failed to connect to live stream');
    }
  };

  // Auto-scroll comments
  useEffect(() => {
    if (commentsEndRef.current) {
      commentsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [comments]);

  const sendComment = (e) => {
    e.preventDefault();
    if (!newComment.trim() || !socketRef.current || !isConnected) return;

    socketRef.current.emit('send-comment', {
      streamId,
      text: newComment.trim(),
    });

    setNewComment('');
  };

  const sendHeart = () => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit('send-heart', { streamId });
      addHeart();
    }
  };

  const addHeart = () => {
    const heartId = Date.now() + Math.random();
    setHearts((prev) => [...prev, { id: heartId, x: Math.random() * 80 + 10 }]);

    setTimeout(() => {
      setHearts((prev) => prev.filter((h) => h.id !== heartId));
    }, 3000);
  };

  const shareStream = async () => {
    const shareData = {
      title: `🔴 LIVE: ${stream?.title}`,
      text: `Watch ${stream?.streamer?.username}'s live stream!`,
      url: window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(shareData.url);
        alert('Live stream link copied to clipboard!');
      }
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div>
          <p className="text-lg">Connecting to live stream...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-500 rounded-full mx-auto mb-4 flex items-center justify-center">
            <span className="text-2xl">⚠️</span>
          </div>
          <p className="text-lg mb-2">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="bg-white text-black px-6 py-2 rounded-full font-semibold hover:bg-gray-200 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="sticky top-0 bg-black/95 backdrop-blur-lg border-b border-gray-800 z-50 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/')}
              className="p-2 rounded-full hover:bg-gray-800 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="font-bold text-lg">{stream?.title}</h1>
              <p className="text-gray-400 text-sm">@{stream?.streamer?.username}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <div className="bg-red-500 px-3 py-1 rounded-full flex items-center space-x-2">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
              <span className="font-bold text-sm">LIVE</span>
            </div>
            <div className="flex items-center space-x-1 text-sm text-gray-300">
              <Users className="w-4 h-4" />
              <span>{viewers.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative">
        {/* Video Stream Area - Grid for multi-host */}
        <div
          className="relative aspect-[9/16] bg-gray-900 max-h-screen grid"
          style={{ gridTemplateColumns: (liveKitRoom?.remoteParticipants.size || 0) + 1 === 1 ? '1fr' : '1fr 1fr' }}
        >
          {/* Render videos from LiveKit participants */}
          {Array.from(liveKitRoom?.remoteParticipants.values() || []).map((participant) => (
            <div key={participant.identity} className="relative">
              <video
                autoPlay
                playsInline
                controls={false}
                className="absolute inset-0 w-full h-full object-cover"
                ref={(el) => (videoRefs.current[participant.identity] = el)}
              />
              <div className="absolute top-2 left-2 bg-black/50 p-1 rounded text-sm">
                @{participant.identity}
              </div>
            </div>
          ))}
          {/* Hearts overlay */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden col-span-full">
            {hearts.map((heart) => (
              <div
                key={heart.id}
                className="absolute bottom-32"
                style={{
                  left: `${heart.x}%`,
                  animation: 'heartFloat 3s ease-out forwards',
                }}
              >
                <Heart className="w-8 h-8 text-red-500 fill-red-500" />
              </div>
            ))}
          </div>

          {/* Action buttons */}
          <div className="absolute right-4 bottom-32 flex flex-col space-y-4 z-20 col-span-full">
            <button
              onClick={sendHeart}
              className="w-12 h-12 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-red-500/50 transition-colors"
            >
              <Heart className="w-6 h-6 text-red-500" />
            </button>
            <button
              onClick={shareStream}
              className="w-12 h-12 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white/20 transition-colors"
            >
              <Share2 className="w-6 h-6 text-white" />
            </button>
            <button
              onClick={() => {
                if (!hasRequestedCohost) {
                  socketRef.current.emit('request-cohost', { streamId });
                  setHasRequestedCohost(true);
                }
              }}
              disabled={hasRequestedCohost}
              className="w-12 h-12 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-blue-500/50 transition-colors disabled:opacity-50"
            >
              <Camera className="w-6 h-6 text-blue-500" />
            </button>
          </div>
        </div>

        {/* Comments Section */}
        <div className="bg-gray-900 border-t border-gray-800">
          <div className="p-4 border-b border-gray-800">
            <div className="flex items-center justify-between">
              <h3 className="font-bold flex items-center space-x-2">
                <MessageCircle className="w-5 h-5" />
                <span>Live Chat</span>
              </h3>
              <div className={`text-sm px-2 py-1 rounded-full ${
                isConnected ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
              }`}>
                {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
              </div>
            </div>
          </div>

          <div className="h-64 overflow-y-auto p-4 space-y-3">
            {comments.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <MessageCircle className="w-12 h-12 mx-auto mb-2 text-gray-600" />
                <p>No messages yet</p>
                <p className="text-sm">Be the first to say something!</p>
              </div>
            ) : (
              comments.map((comment, index) => (
                <div key={index} className="flex space-x-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-white">
                      {comment.username?.[0]?.toUpperCase() || 'A'}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold text-sm text-white">
                        {comment.username || 'Anonymous'}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(comment.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-sm text-gray-300 break-words">{comment.text}</p>
                  </div>
                </div>
              ))
            )}
            <div ref={commentsEndRef} />
          </div>

          <div className="p-4 border-t border-gray-800">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-white">
                  {localStorage.getItem('username')?.[0]?.toUpperCase() || 'Y'}
                </span>
              </div>
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      sendComment(e);
                    }
                  }}
                  placeholder={isConnected ? 'Say something...' : 'Connecting...'}
                  disabled={!isConnected}
                  maxLength={200}
                  className="w-full px-4 py-2 pr-12 bg-gray-800 border border-gray-700 rounded-full focus:outline-none focus:ring-2 focus:ring-red-500 text-white placeholder-gray-400 disabled:opacity-50"
                />
                <button
                  onClick={sendComment}
                  disabled={!newComment.trim() || !isConnected}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1.5 rounded-full bg-red-500 text-white disabled:bg-gray-600 disabled:cursor-not-allowed hover:bg-red-600 transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="text-xs text-gray-500 mt-1 text-right">{newComment.length}/200</div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes heartFloat {
          0% { transform: translateY(0) scale(1); opacity: 1; }
          50% { transform: translateY(-100px) scale(1.2); opacity: 0.8; }
          100% { transform: translateY(-200px) scale(0.8); opacity: 0; }
        }
        .overflow-y-auto::-webkit-scrollbar { width: 4px; }
        .overflow-y-auto::-webkit-scrollbar-track { background: rgba(75, 85, 99, 0.3); border-radius: 2px; }
        .overflow-y-auto::-webkit-scrollbar-thumb { background: rgba(156, 163, 175, 0.5); border-radius: 2px; }
        .overflow-y-auto::-webkit-scrollbar-thumb:hover { background: rgba(156, 163, 175, 0.7); }
      `}</style>
    </div>
  );
};

export default LiveViewer;