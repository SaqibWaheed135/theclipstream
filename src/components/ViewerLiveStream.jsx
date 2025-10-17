import React, { useState, useEffect, useRef } from 'react';
import { Camera, Users, Heart, MessageCircle, Send, X } from 'lucide-react';
import io from 'socket.io-client';

let Room, RoomEvent, Track;

const loadLiveKit = async () => {
  try {
    const livekit = await import('livekit-client');
    Room = livekit.Room;
    RoomEvent = livekit.RoomEvent;
    Track = livekit.Track;
    return true;
  } catch (err) {
    console.error('LiveKit not installed');
    return false;
  }
};

const API_URL = 'https://theclipstream-backend.onrender.com/api';
const SOCKET_URL = 'https://theclipstream-backend.onrender.com';

// Checkout Modal Component
const CheckoutModal = ({ product, streamId, onClose, setError, userCoinBalance }) => {
  const [purchaseLoading, setPurchaseLoading] = useState(false);
  const [purchaseError, setPurchaseError] = useState('');

  const coinCost = Math.ceil(product.price * 100);

  const handlePurchase = async (e) => {
    e.preventDefault();
    setPurchaseLoading(true);
    setPurchaseError('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/live/${streamId}/purchase-with-coins`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify({ productIndex: product.index, coinCost })
      });

      const data = await response.json();
      if (response.ok) {
        onClose();
        setError('Purchase successful! Coins credited to the live room.');
        setTimeout(() => setError(''), 3000);
      } else {
        setPurchaseError(data.msg || 'Failed to complete purchase');
      }
    } catch (err) {
      setPurchaseError('Purchase failed: ' + err.message);
    } finally {
      setPurchaseLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold">Checkout</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        <form onSubmit={handlePurchase} className="space-y-4">
          <div>
            <h4 className="font-semibold text-lg">{product.name}</h4>
            <p className="text-gray-400">{product.description}</p>
            <p className="font-bold text-lg mt-2">${product.price} ({coinCost} coins)</p>
            <p className="text-sm text-gray-400 mt-1">Your balance: {userCoinBalance} coins</p>
            {coinCost > userCoinBalance && (
              <p className="text-red-500 text-sm mt-2">Insufficient coins. Please top up your account.</p>
            )}
          </div>
          {purchaseError && (
            <div className="text-red-500 text-sm">{purchaseError}</div>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-600 hover:bg-gray-700 py-2 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={purchaseLoading || coinCost > userCoinBalance}
              className="flex-1 bg-green-600 hover:bg-green-700 py-2 rounded-lg disabled:bg-gray-600 disabled:cursor-not-allowed"
            >
              {purchaseLoading ? 'Processing...' : 'Confirm Purchase'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const ViewerLiveStream = ({ streamId, onBack }) => {
  const [stream, setStream] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [comment, setComment] = useState('');
  const [comments, setComments] = useState([]);
  const [hearts, setHearts] = useState([]);
  const [liveKitRoom, setLiveKitRoom] = useState(null);
  const [liveKitReady, setLiveKitReady] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [products, setProducts] = useState([]);
  const [showCartModal, setShowCartModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [userCoinBalance, setUserCoinBalance] = useState(0);
  const [socket, setSocket] = useState(null);
  const [socketConnected, setSocketConnected] = useState(false);

  const commentsEndRef = useRef(null);

  useEffect(() => {
    loadLiveKit().then(ready => {
      setLiveKitReady(ready);
      if (ready && streamId) {
        fetchStream();
      }
    });

    // Fetch user's coin balance
    const fetchUserCoinBalance = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/live/user/coin-balance`, {
          headers: {
            ...(token && { 'Authorization': `Bearer ${token}` })
          }
        });
        const data = await response.json();
        if (response.ok) {
          setUserCoinBalance(data.balance || 0);
        }
      } catch (err) {
        console.error('Error fetching coin balance:', err);
      }
    };
    fetchUserCoinBalance();

    return () => {
      if (liveKitRoom) {
        liveKitRoom.disconnect();
      }
      if (socket) {
        socket.disconnect();
      }
      document.querySelectorAll('audio[data-participant]').forEach(el => el.remove());
    };
  }, [streamId]);

  useEffect(() => {
    if (commentsEndRef.current) {
      commentsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [comments]);

  // NEW: Initialize Socket with proper error handling
  const initializeSocket = () => {
    console.log('Initializing socket connection...');
    
    const token = localStorage.getItem('token');
    
    // Create socket with proper configuration
    const newSocket = io(SOCKET_URL, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
      transports: ['websocket', 'polling'],
      auth: token ? { token: token } : {},
      forceNew: true
    });

    // Connection events
    newSocket.on('connect', () => {
      console.log('Socket connected! ID:', newSocket.id);
      setSocketConnected(true);
      
      // Join the stream room
      newSocket.emit('join-stream', {
        streamId: streamId,
        isStreamer: false
      });
      console.log('Emitted join-stream event');
    });

    newSocket.on('joined-stream', (data) => {
      console.log('Successfully joined stream');
    });

    newSocket.on('new-comment', (data) => {
      console.log('New comment received:', data);
      setComments(prev => [...prev, {
        id: Date.now() + Math.random(),
        username: data.username || 'Viewer',
        text: data.text,
        timestamp: new Date()
      }]);
    });

    newSocket.on('heart-sent', (data) => {
      console.log('Heart animation triggered');
      const heartId = Date.now() + Math.random();
      setHearts(prev => [...prev, { 
        id: heartId, 
        x: Math.random() * 80 + 10
      }]);
      setTimeout(() => {
        setHearts(prev => prev.filter(h => h.id !== heartId));
      }, 3000);
    });

    newSocket.on('viewer-joined', (data) => {
      console.log('Viewer joined:', data);
    });

    newSocket.on('viewer-left', (data) => {
      console.log('Viewer left:', data);
    });

    // Connection error events
    newSocket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      setSocketConnected(false);
      setError('Chat connection failed. Retrying...');
    });

    newSocket.on('error', (error) => {
      console.error('Socket error:', error);
      setError('Connection error: ' + (error.message || 'Unknown error'));
    });

    newSocket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      setSocketConnected(false);
      if (reason === 'io server disconnect') {
        console.log('Server disconnected, attempting to reconnect...');
        setTimeout(() => newSocket.connect(), 3000);
      }
    });

    newSocket.on('reconnect', () => {
      console.log('Socket reconnected');
      setSocketConnected(true);
    });

    setSocket(newSocket);
  };

  const fetchStream = async () => {
    try {
      const response = await fetch(`${API_URL}/live/${streamId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.msg || 'Stream not found');
      }

      console.log('Stream fetched:', data);
      setStream(data);
      setProducts(data.products.map((p, index) => ({ ...p, index })) || []);
      
      if (data.viewerToken && data.roomUrl) {
        await connectToLiveKit(data.roomUrl, data.viewerToken);
      }

      // Initialize socket AFTER stream is loaded
      initializeSocket();
      
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const connectToLiveKit = async (roomUrl, viewerToken) => {
    try {
      console.log('Connecting to LiveKit as viewer...');
      
      const room = new Room();
      await room.connect(roomUrl, viewerToken);
      setLiveKitRoom(room);
      console.log('Connected to LiveKit room');

      room.remoteParticipants.forEach((participant) => {
        participant.trackPublications.forEach((publication) => {
          if (publication.isSubscribed && publication.track) {
            handleTrackSubscribed(publication.track, publication, participant);
          }
        });
      });

      room.on(RoomEvent.TrackSubscribed, handleTrackSubscribed);

      room.on(RoomEvent.TrackUnsubscribed, (track, publication, participant) => {
        if (track.kind === Track.Kind.Audio) {
          const audioEls = document.querySelectorAll(`audio[data-participant="${participant.identity}"]`);
          audioEls.forEach(el => el.remove());
        }
        track.detach();
      });

      room.on(RoomEvent.ParticipantDisconnected, (participant) => {
        console.log('Participant left:', participant.identity);
        const audioEls = document.querySelectorAll(`audio[data-participant="${participant.identity}"]`);
        audioEls.forEach(el => el.remove());
      });

    } catch (err) {
      console.error('LiveKit connection error:', err);
      setError('Failed to connect: ' + err.message);
    }
  };

  const handleTrackSubscribed = (track, publication, participant) => {
    console.log('Track subscribed:', track.kind);

    if (track.kind === Track.Kind.Video) {
      setTimeout(() => {
        const videoEl = document.querySelector(`video[data-participant="${participant.identity}"]`);
        if (videoEl) {
          track.attach(videoEl);
          videoEl.muted = true;
          videoEl.volume = 0;
          videoEl.play().catch(err => console.warn('Video play error:', err));
        }
      }, 200);
    }

    if (track.kind === Track.Kind.Audio) {
      const existingAudio = document.querySelector(`audio[data-participant="${participant.identity}"]`);
      if (existingAudio) {
        existingAudio.remove();
      }

      const audioEl = document.createElement('audio');
      audioEl.autoplay = true;
      audioEl.playsInline = true;
      audioEl.muted = false;
      audioEl.volume = 1.0;
      audioEl.dataset.participant = participant.identity;

      track.attach(audioEl);
      document.body.appendChild(audioEl);

      audioEl.play()
        .then(() => {
          console.log('Audio playing');
          setAudioEnabled(true);
        })
        .catch((err) => {
          console.error('Audio autoplay failed:', err);
          setError('Click anywhere to enable audio');
          
          const playOnInteraction = () => {
            audioEl.play()
              .then(() => {
                console.log('Audio started after interaction');
                setError('');
                setAudioEnabled(true);
                document.removeEventListener('click', playOnInteraction);
                document.removeEventListener('touchstart', playOnInteraction);
              })
              .catch(e => console.error('Audio play failed:', e));
          };
          
          document.addEventListener('click', playOnInteraction, { once: true });
          document.addEventListener('touchstart', playOnInteraction, { once: true });
        });
    }
  };

  const sendHeart = () => {
    if (socket && socketConnected) {
      socket.emit('send-heart', { streamId: streamId });
      console.log('Heart emitted via socket');
    } else {
      console.warn('Socket not connected, cannot send heart');
      setError('Chat not connected. Please wait...');
      return;
    }

    const heartId = Date.now() + Math.random();
    setHearts(prev => [...prev, { id: heartId, x: Math.random() * 80 + 10 }]);
    setTimeout(() => {
      setHearts(prev => prev.filter(h => h.id !== heartId));
    }, 3000);
  };

  const sendComment = (e) => {
    e.preventDefault();
    if (!comment.trim()) return;

    if (socket && socketConnected) {
      socket.emit('send-comment', {
        streamId: streamId,
        text: comment.trim()
      });
      console.log('Comment emitted via socket:', comment);
    } else {
      console.warn('Socket not connected');
      setError('Chat not connected. Please wait...');
      return;
    }
    
    const newComment = {
      id: Date.now(),
      username: 'You',
      text: comment,
      timestamp: new Date()
    };
    
    setComments(prev => [...prev, newComment]);
    setComment('');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-red-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p>Connecting to live stream...</p>
        </div>
      </div>
    );
  }

  if (error && !stream) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <X className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Stream Not Available</h2>
          <p className="text-gray-400 mb-4">{error}</p>
          <button
            onClick={onBack}
            className="bg-gray-700 hover:bg-gray-600 px-6 py-2 rounded-lg"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const participants = liveKitRoom ? Array.from(liveKitRoom.remoteParticipants.values()) : [];

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <style>{`
        @keyframes float-up {
          0% { transform: translateY(0) scale(1); opacity: 1; }
          100% { transform: translateY(-100vh) scale(1.5); opacity: 0; }
        }
      `}</style>
      
      {error && (
        <div className="fixed top-4 left-4 right-4 bg-yellow-500/90 text-black px-4 py-3 rounded-lg text-sm z-50">
          {error}
        </div>
      )}

      {showCartModal && selectedProduct && (
        <CheckoutModal
          product={selectedProduct}
          streamId={streamId}
          onClose={() => setShowCartModal(false)}
          setError={setError}
          userCoinBalance={userCoinBalance}
        />
      )}

      <div className="max-w-6xl mx-auto p-4">
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-red-600 px-3 py-1 rounded-full">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                <span className="text-sm font-semibold">LIVE</span>
              </div>
              <div className="flex items-center gap-2 text-gray-300">
                <Users className="w-4 h-4" />
                <span className="text-sm">{stream?.viewers?.length || participants.length} watching</span>
              </div>
              {audioEnabled && (
                <div className="flex items-center gap-2 text-green-400 text-xs">
                  <span>Audio enabled</span>
                </div>
              )}
            </div>
            <button
              onClick={onBack}
              className="bg-gray-700 hover:bg-gray-600 px-3 py-2 rounded-lg text-sm"
            >
              Exit
            </button>
          </div>
          <h1 className="text-2xl font-bold">{stream?.title}</h1>
          {stream?.description && (
            <p className="text-gray-400 mt-1">{stream.description}</p>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <div className="lg:col-span-3">
            <div className={`bg-black rounded-lg aspect-video relative overflow-hidden ${participants.length > 1 ? 'grid grid-cols-2' : ''}`}>
              {participants.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="animate-pulse mb-4">
                      <Camera className="w-16 h-16 mx-auto text-gray-600" />
                    </div>
                    <p className="text-gray-500 text-lg">Waiting for host...</p>
                  </div>
                </div>
              ) : (
                participants.map((participant) => (
                  <div key={participant.identity} className="relative bg-gray-800">
                    <video
                      data-participant={participant.identity}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 left-2 bg-black/70 backdrop-blur-sm px-3 py-1 rounded-full text-sm flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                      <span>@{participant.identity}</span>
                    </div>
                  </div>
                ))
              )}
              
              {hearts.map((heart) => (
                <div
                  key={heart.id}
                  className="absolute pointer-events-none text-3xl"
                  style={{
                    left: `${heart.x}%`,
                    bottom: '0',
                    animation: 'float-up 3s ease-out forwards',
                  }}
                >
                  ❤️
                </div>
              ))}
            </div>

            <div className="bg-gray-800 rounded-lg p-4 mt-4">
              <h3 className="font-semibold mb-2">Featured Items</h3>
              <div className="flex overflow-x-auto gap-4 pb-4">
                {products.map((p, i) => (
                  <div key={i} className="min-w-[200px] bg-gray-700 rounded-lg p-3">
                    {p.imageUrl && <img src={p.imageUrl} alt={p.name} className="w-full h-32 object-cover rounded mb-2" />}
                    <h4 className="font-semibold">{p.name}</h4>
                    <p className="text-gray-400 mb-2">{p.description}</p>
                    <p className="font-bold mb-2">${p.price}</p>
                    {p.type === 'product' ? (
                      <button 
                        onClick={() => {
                          const token = localStorage.getItem('token');
                          if (!token) {
                            setError('Please log in to purchase');
                            return;
                          }
                          setSelectedProduct({ ...p, index: i });
                          setShowCartModal(true);
                        }}
                        className="w-full bg-green-600 hover:bg-green-700 py-2 rounded-lg text-sm"
                      >
                        Buy Now
                      </button>
                    ) : (
                      <a 
                        href={p.link} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="w-full bg-blue-600 hover:bg-blue-700 py-2 rounded-lg text-sm block text-center"
                      >
                        View Ad
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="bg-gray-800 rounded-lg h-[600px] flex flex-col">
              <div className="p-4 border-b border-gray-700">
                <h3 className="font-semibold flex items-center gap-2">
                  <MessageCircle className="w-5 h-5" />
                  Live Chat
                  {socketConnected ? (
                    <span className="text-xs bg-green-600 px-2 py-1 rounded ml-auto">Connected</span>
                  ) : (
                    <span className="text-xs bg-red-600 px-2 py-1 rounded ml-auto">Connecting...</span>
                  )}
                </h3>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {comments.map((c) => (
                  <div key={c.id} className="text-sm">
                    <span className="font-semibold text-blue-400">{c.username}: </span>
                    <span className="text-gray-300">{c.text}</span>
                  </div>
                ))}
                {comments.length === 0 && (
                  <div className="text-center text-gray-500 mt-20">
                    <MessageCircle className="w-12 h-12 mx-auto mb-3 text-gray-600" />
                    <p className="text-sm">Be the first to comment!</p>
                  </div>
                )}
                <div ref={commentsEndRef} />
              </div>

              <div className="p-4 border-t border-gray-700">
                <form onSubmit={sendComment} className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder={socketConnected ? "Say something..." : "Connecting..."}
                    maxLength={200}
                    disabled={!socketConnected}
                    className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 disabled:opacity-50"
                  />
                  <button
                    type="submit"
                    disabled={!socketConnected}
                    className="bg-blue-600 hover:bg-blue-700 p-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
                <button
                  onClick={sendHeart}
                  disabled={!socketConnected}
                  className="w-full bg-pink-600 hover:bg-pink-700 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Heart className="w-4 h-4" />
                  <span className="text-sm font-semibold">Send Heart</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewerLiveStream;  