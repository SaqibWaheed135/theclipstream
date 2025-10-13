import React, { useState, useEffect, useRef } from 'react';
import { Camera, Radio, Users, Heart, MessageCircle, X, Mic, MicOff, Video, VideoOff, Send } from 'lucide-react';

// Mock API URL - replace with your actual backend URL
const API_URL = 'https://theclipstream-backend.onrender.com/api';
const LIVEKIT_URL = 'wss://theclipstream-q0jt88zr.livekit.cloud';

// Import LiveKit dynamically (you'll need to install: npm install livekit-client)
// import { Room, RoomEvent, Track } from 'livekit-client';

// Host Component - Start and manage live stream
const HostLiveStream = () => {
  const [isLive, setIsLive] = useState(false);
  const [streamData, setStreamData] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [viewerCount, setViewerCount] = useState(0);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isMicOn, setIsMicOn] = useState(true);
  const [localStream, setLocalStream] = useState(null);
  const [liveKitRoom, setLiveKitRoom] = useState(null);
  const [cameraTrackReceived, setCameraTrackReceived] = useState(false);
  const videoRef = useRef(null);
  const localVideoRef = useRef(null);

  useEffect(() => {
    return () => {
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
      if (liveKitRoom) {
        liveKitRoom.disconnect();
      }
    };
  }, [localStream, liveKitRoom]);

  // Initialize camera preview before going live
  useEffect(() => {
    if (!isLive) {
      startCameraPreview();
    }
  }, [isLive]);

  const startCameraPreview = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      setLocalStream(stream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error('Camera preview error:', err);
      setError('Could not access camera/microphone');
    }
  };

  const startStream = async () => {
    if (!title.trim()) {
      setError('Please enter a title');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Ensure we have camera access
      if (!localStream) {
        await startCameraPreview();
      }

      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/live/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          privacy: 'public'
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.msg || 'Failed to create stream');
      }

      console.log('Stream created:', data);
      setStreamData(data);

      // Connect to LiveKit - UNCOMMENT WHEN LIVEKIT-CLIENT IS INSTALLED
      /*
      const { Room, RoomEvent, Track } = await import('livekit-client');
      
      const room = new Room({
        adaptiveStream: true,
        dynacast: true,
      });

      await room.connect(data.roomUrl, data.publishToken);
      console.log('Connected to LiveKit room');

      await room.localParticipant.enableCameraAndMicrophone();
      console.log('Camera and microphone enabled');

      room.on(RoomEvent.LocalTrackPublished, (publication) => {
        if (publication.source === Track.Source.Camera && videoRef.current) {
          const localVideoTrack = publication.track;
          if (localVideoTrack && localVideoTrack.mediaStreamTrack) {
            const mediaStream = new MediaStream([localVideoTrack.mediaStreamTrack]);
            videoRef.current.srcObject = mediaStream;
            videoRef.current.muted = true;
            videoRef.current.play().catch(console.error);
            
            if (localVideoRef.current) {
              localVideoRef.current.style.display = 'none';
            }
            setCameraTrackReceived(true);
          }
        }
      });

      setLiveKitRoom(room);
      */
      
      setIsLive(true);
      console.log('Live stream started successfully!');
      
    } catch (err) {
      setError(err.message);
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        setLocalStream(null);
      }
    } finally {
      setLoading(false);
    }
  };

  const endStream = async () => {
    if (!streamData?.streamId) return;

    try {
      const token = localStorage.getItem('token');
      await fetch(`${API_URL}/live/${streamData.streamId}/end`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (liveKitRoom) {
        await liveKitRoom.disconnect();
        setLiveKitRoom(null);
      }

      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        setLocalStream(null);
      }

      setIsLive(false);
      setStreamData(null);
      setTitle('');
      setDescription('');
      
      setTimeout(() => startCameraPreview(), 1000);
    } catch (err) {
      console.error('Error ending stream:', err);
    }
  };

  const toggleCamera = async () => {
    if (liveKitRoom && isLive) {
      // UNCOMMENT WHEN LIVEKIT IS INSTALLED
      // const isEnabled = liveKitRoom.localParticipant.isCameraEnabled;
      // await liveKitRoom.localParticipant.setCameraEnabled(!isEnabled);
      // setIsCameraOn(!isEnabled);
    } else if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsCameraOn(videoTrack.enabled);
      }
    }
  };

  const toggleMic = async () => {
    if (liveKitRoom && isLive) {
      // UNCOMMENT WHEN LIVEKIT IS INSTALLED
      // const isEnabled = liveKitRoom.localParticipant.isMicrophoneEnabled;
      // await liveKitRoom.localParticipant.setMicrophoneEnabled(!isEnabled);
      // setIsMicOn(!isEnabled);
    } else if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMicOn(audioTrack.enabled);
      }
    }
  };

  if (isLive) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-gray-800 rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 bg-red-600 px-3 py-1 rounded-full">
                  <Radio className="w-4 h-4 animate-pulse" />
                  <span className="text-sm font-semibold">LIVE</span>
                </div>
                <div className="flex items-center gap-2 text-gray-300">
                  <Users className="w-4 h-4" />
                  <span className="text-sm">{viewerCount} viewers</span>
                </div>
              </div>
              <button
                onClick={endStream}
                className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg flex items-center gap-2"
              >
                <X className="w-4 h-4" />
                End Stream
              </button>
            </div>
            <h2 className="text-xl font-bold mt-3">{streamData?.stream?.title}</h2>
          </div>

          <div className="bg-black rounded-lg aspect-video mb-4 relative overflow-hidden">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            {!isCameraOn && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                <VideoOff className="w-16 h-16 text-gray-600" />
              </div>
            )}
          </div>

          <div className="bg-gray-800 rounded-lg p-4 mb-4 flex items-center justify-center gap-4">
            <button
              onClick={toggleCamera}
              className={`p-4 rounded-full ${isCameraOn ? 'bg-gray-700 hover:bg-gray-600' : 'bg-red-600 hover:bg-red-700'}`}
            >
              {isCameraOn ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
            </button>
            <button
              onClick={toggleMic}
              className={`p-4 rounded-full ${isMicOn ? 'bg-gray-700 hover:bg-gray-600' : 'bg-red-600 hover:bg-red-700'}`}
            >
              {isMicOn ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
            </button>
          </div>

          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="font-semibold mb-2">Stream Details</h3>
            <div className="space-y-2 text-sm">
              <p className="text-gray-400">Stream ID: <span className="text-white font-mono">{streamData?.streamId}</span></p>
              <p className="text-gray-400">Status: <span className="text-green-400">Live</span></p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <div className="max-w-md mx-auto mt-20">
        <div className="bg-gray-800 rounded-lg p-6">
          <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <Radio className="w-6 h-6" />
            Start Live Stream
          </h1>

          {error && (
            <div className="bg-red-500/20 border border-red-500 text-red-500 p-3 rounded mb-4">
              {error}
            </div>
          )}

          <div className="relative bg-black rounded-lg aspect-video mb-6 overflow-hidden">
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover"
            />
            <div className="absolute top-4 right-4 flex space-x-2">
              <button
                onClick={toggleCamera}
                className={`w-10 h-10 ${isCameraOn ? 'bg-black/50' : 'bg-red-500'} backdrop-blur-sm rounded-full flex items-center justify-center`}
              >
                {isCameraOn ? <Camera className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
              </button>
              <button
                onClick={toggleMic}
                className={`w-10 h-10 ${isMicOn ? 'bg-black/50' : 'bg-red-500'} backdrop-blur-sm rounded-full flex items-center justify-center`}
              >
                {isMicOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Stream Title *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="What's your stream about?"
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
                maxLength={100}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Description (optional)</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add more details..."
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500 resize-none"
                rows={3}
                maxLength={500}
              />
            </div>

            <button
              onClick={startStream}
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed py-3 rounded-lg font-semibold transition-colors"
            >
              {loading ? 'Starting...' : 'Go LIVE'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Viewer Component - Watch live stream
const ViewerLiveStream = ({ streamId }) => {
  const [stream, setStream] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [comment, setComment] = useState('');
  const [comments, setComments] = useState([]);
  const [hearts, setHearts] = useState([]);
  const [liveKitRoom, setLiveKitRoom] = useState(null);
  const videoRefs = useRef({});
  const commentsEndRef = useRef(null);

  useEffect(() => {
    if (streamId) {
      fetchStream();
    }

    return () => {
      if (liveKitRoom) {
        liveKitRoom.disconnect();
      }
      // Clean up audio elements
      document.querySelectorAll('audio[data-participant]').forEach(el => el.remove());
    };
  }, [streamId]);

  useEffect(() => {
    if (commentsEndRef.current) {
      commentsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [comments]);

  const fetchStream = async () => {
    try {
      const response = await fetch(`${API_URL}/live/${streamId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.msg || 'Stream not found');
      }

      setStream(data);
      
      if (data.viewerToken && data.roomUrl) {
        await connectToLiveKit(data.roomUrl, data.viewerToken);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const connectToLiveKit = async (roomUrl, viewerToken) => {
    try {
      console.log('Connecting to LiveKit as viewer...');
      
      // UNCOMMENT WHEN LIVEKIT-CLIENT IS INSTALLED
      /*
      const { Room, RoomEvent, Track } = await import('livekit-client');
      
      const room = new Room();
      await room.connect(roomUrl, viewerToken);
      setLiveKitRoom(room);

      // Handle video tracks
      room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
        console.log('Track subscribed:', track.kind, 'from', participant.identity);

        if (track.kind === Track.Kind.Video) {
          const videoEl = document.querySelector(`video[data-participant="${participant.identity}"]`);
          if (videoEl) {
            track.attach(videoEl);
            videoEl.muted = true; // Video element should be muted
            videoEl.volume = 0;
            videoEl.play().catch(err => console.warn('Video autoplay failed:', err));
          }
        }

        // Handle audio tracks - CREATE SEPARATE AUDIO ELEMENT
        if (track.kind === Track.Kind.Audio) {
          console.log('🎵 Audio track received from', participant.identity);
          
          // Remove existing audio element if any
          const existingAudio = document.querySelector(`audio[data-participant="${participant.identity}"]`);
          if (existingAudio) {
            existingAudio.remove();
          }

          // Create new audio element
          const audioEl = document.createElement('audio');
          audioEl.autoplay = true;
          audioEl.playsInline = true;
          audioEl.muted = false;
          audioEl.volume = 1.0;
          audioEl.dataset.participant = participant.identity;

          track.attach(audioEl);
          document.body.appendChild(audioEl);

          audioEl.play()
            .then(() => console.log('✅ Audio playing for', participant.identity))
            .catch((err) => {
              console.error('❌ Audio autoplay failed:', err);
              setError('Click anywhere to enable audio');
              
              const playOnClick = () => {
                audioEl.play()
                  .then(() => {
                    console.log('✅ Audio started after user interaction');
                    setError('');
                    document.removeEventListener('click', playOnClick);
                    document.removeEventListener('touchstart', playOnClick);
                  })
                  .catch(console.error);
              };
              
              document.addEventListener('click', playOnClick, { once: true });
              document.addEventListener('touchstart', playOnClick, { once: true });
            });
        }
      });

      // Handle track unsubscription
      room.on(RoomEvent.TrackUnsubscribed, (track, publication, participant) => {
        if (track.kind === Track.Kind.Audio) {
          const audioEls = document.querySelectorAll(`audio[data-participant="${participant.identity}"]`);
          audioEls.forEach(el => el.remove());
        }
        track.detach();
      });

      // Handle participant events
      room.on(RoomEvent.ParticipantDisconnected, (participant) => {
        const audioEls = document.querySelectorAll(`audio[data-participant="${participant.identity}"]`);
        audioEls.forEach(el => el.remove());
      });

      console.log('✅ LiveKit connected as viewer');
      */

      console.log('Viewer token received:', viewerToken?.substring(0, 20) + '...');
    } catch (err) {
      console.error('LiveKit connection error:', err);
      setError('Failed to connect: ' + err.message);
    }
  };

  const sendHeart = () => {
    const heartId = Date.now() + Math.random();
    setHearts(prev => [...prev, { id: heartId, x: Math.random() * 80 + 10 }]);
    setTimeout(() => {
      setHearts(prev => prev.filter(h => h.id !== heartId));
    }, 3000);
  };

  const sendComment = (e) => {
    e.preventDefault();
    if (!comment.trim()) return;
    
    const newComment = {
      id: Date.now(),
      username: 'You',
      text: comment,
      timestamp: new Date()
    };
    
    setComments([...comments, newComment]);
    setComment('');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p>Connecting to live stream...</p>
        </div>
      </div>
    );
  }

  if (error && !stream) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <X className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Stream Not Available</h2>
          <p className="text-gray-400">{error}</p>
        </div>
      </div>
    );
  }

  // Get participants from LiveKit room
  const participants = liveKitRoom ? Array.from(liveKitRoom.remoteParticipants.values()) : [];

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <style>{`
        @keyframes float-up {
          0% {
            transform: translateY(0) scale(1);
            opacity: 1;
          }
          100% {
            transform: translateY(-100vh) scale(1.5);
            opacity: 0;
          }
        }
      `}</style>
      
      {error && (
        <div className="fixed top-4 left-4 right-4 bg-yellow-500/90 text-black px-4 py-2 rounded-lg text-sm z-50">
          {error}
        </div>
      )}

      <div className="max-w-6xl mx-auto p-4">
        <div className="mb-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex items-center gap-2 bg-red-600 px-3 py-1 rounded-full">
              <Radio className="w-4 h-4 animate-pulse" />
              <span className="text-sm font-semibold">LIVE</span>
            </div>
            <div className="flex items-center gap-2 text-gray-300">
              <Users className="w-4 h-4" />
              <span className="text-sm">{stream?.viewers?.length || 0} watching</span>
            </div>
          </div>
          <h1 className="text-2xl font-bold">{stream?.title}</h1>
          {stream?.description && (
            <p className="text-gray-400 mt-1">{stream.description}</p>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <div className="lg:col-span-3">
            <div className={`bg-black rounded-lg aspect-video relative overflow-hidden grid ${participants.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
              {participants.length === 0 ? (
                <div className="flex items-center justify-center col-span-full">
                  <div className="text-center">
                    <Camera className="w-16 h-16 mx-auto mb-4 text-gray-600" />
                    <p className="text-gray-500">Waiting for host...</p>
                    <p className="text-sm text-gray-600 mt-2">
                      Stream will appear shortly
                    </p>
                  </div>
                </div>
              ) : (
                participants.map((participant) => (
                  <div key={participant.identity} className="relative bg-gray-800">
                    <video
                      data-participant={participant.identity}
                      autoPlay
                      playsInline
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 left-2 bg-black/50 px-2 py-1 rounded text-sm">
                      @{participant.identity}
                    </div>
                  </div>
                ))
              )}
              
              {/* Floating hearts */}
              {hearts.map((heart) => (
                <div
                  key={heart.id}
                  className="absolute pointer-events-none"
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

            <div className="bg-gray-800 rounded-lg p-4 mt-4 flex items-center gap-3">
              <div className="w-12 h-12 bg-gray-700 rounded-full flex items-center justify-center">
                {stream?.streamer?.avatar ? (
                  <img src={stream.streamer.avatar} alt="" className="w-full h-full rounded-full object-cover" />
                ) : (
                  <span className="text-xl">{stream?.streamer?.username?.[0]?.toUpperCase()}</span>
                )}
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">{stream?.streamer?.username}</h3>
                <p className="text-sm text-gray-400">Host</p>
              </div>
              <button className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-sm font-semibold">
                Follow
              </button>
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="bg-gray-800 rounded-lg h-[600px] flex flex-col">
              <div className="p-4 border-b border-gray-700">
                <h3 className="font-semibold flex items-center gap-2">
                  <MessageCircle className="w-5 h-5" />
                  Live Chat
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
                  <p className="text-gray-500 text-center text-sm mt-8">Be the first to comment!</p>
                )}
                <div ref={commentsEndRef} />
              </div>

              <div className="p-4 border-t border-gray-700">
                <form onSubmit={sendComment} className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Say something..."
                    className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                  />
                  <button
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-700 p-2 rounded-lg"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
                <button
                  onClick={sendHeart}
                  className="w-full bg-pink-600 hover:bg-pink-700 py-2 rounded-lg flex items-center justify-center gap-2"
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

// Main App Component
const LiveScreenBothCode = () => {
  const [mode, setMode] = useState('select');
  const [streamId, setStreamId] = useState('');

  if (mode === 'host') {
    return <HostLiveStream />;
  }

  if (mode === 'viewer' && streamId) {
    return <ViewerLiveStream streamId={streamId} />;
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <h1 className="text-3xl font-bold text-center mb-2">LiveStream App</h1>
        <p className="text-center text-gray-400 mb-8 text-sm">
          Install <code className="bg-gray-800 px-2 py-1 rounded">livekit-client</code> package for full functionality
        </p>
        
        <div className="space-y-4">
          <button
            onClick={() => setMode('host')}
            className="w-full bg-blue-600 hover:bg-blue-700 p-6 rounded-lg flex items-center justify-center gap-3 transition-colors"
          >
            <Radio className="w-6 h-6" />
            <span className="text-xl font-semibold">Start Live Stream</span>
          </button>

          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">Join a Stream</h2>
            <input
              type="text"
              value={streamId}
              onChange={(e) => setStreamId(e.target.value)}
              placeholder="Enter Stream ID"
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 mb-3 focus:outline-none focus:border-blue-500"
            />
            <button
              onClick={() => streamId && setMode('viewer')}
              disabled={!streamId}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed py-3 rounded-lg font-semibold transition-colors"
            >
              Watch Stream
            </button>
          </div>

          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 text-sm">
            <h3 className="font-semibold mb-2 text-blue-400">📦 Setup Instructions:</h3>
            <ol className="space-y-1 text-gray-300 list-decimal list-inside">
              <li>Install LiveKit: <code className="bg-gray-800 px-2 py-0.5 rounded text-xs">npm install livekit-client</code></li>
              <li>Uncomment LiveKit code in the components</li>
              <li>Set your backend URL and LiveKit URL</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveScreenBothCode;