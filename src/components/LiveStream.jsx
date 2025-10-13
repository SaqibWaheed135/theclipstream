import React, { useState, useEffect, useRef } from 'react';
import { Camera, Radio, Users, Heart, MessageCircle, X, Mic, MicOff, Video, VideoOff, Send } from 'lucide-react';

// Dynamic import for LiveKit
let Room, RoomEvent, Track;

const loadLiveKit = async () => {
  try {
    const livekit = await import('livekit-client');
    Room = livekit.Room;
    RoomEvent = livekit.RoomEvent;
    Track = livekit.Track;
    return true;
  } catch (err) {
    console.error('LiveKit not installed. Run: npm install livekit-client');
    return false;
  }
};

const API_URL = 'https://theclipstream-backend.onrender.com/api';

// Host Component
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
  const [liveKitReady, setLiveKitReady] = useState(false);
  
  const videoRef = useRef(null);
  const localVideoRef = useRef(null);

  useEffect(() => {
    loadLiveKit().then(setLiveKitReady);
    
    return () => {
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
      if (liveKitRoom) {
        liveKitRoom.disconnect();
      }
    };
  }, []);

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
          facingMode: 'user',
          frameRate: { ideal: 30 }
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
        localVideoRef.current.muted = true;
        await localVideoRef.current.play();
      }
    } catch (err) {
      console.error('Camera preview error:', err);
      setError('Could not access camera/microphone. Please grant permissions.');
    }
  };

  const startStream = async () => {
    if (!title.trim()) {
      setError('Please enter a title');
      return;
    }

    if (!liveKitReady) {
      setError('LiveKit not loaded. Install: npm install livekit-client');
      return;
    }

    setLoading(true);
    setError('');

    try {
      if (!localStream) {
        await startCameraPreview();
      }

      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/live/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
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

      const room = new Room({
        adaptiveStream: true,
        dynacast: true,
        videoCaptureDefaults: {
          resolution: { width: 1280, height: 720, frameRate: 30 }
        },
        audioCaptureDefaults: {
          echoCancellation: true,
          noiseSuppression: true,
        }
      });

      console.log('Connecting to LiveKit room...');
      await room.connect(data.roomUrl, data.publishToken);
      console.log('✅ Connected to LiveKit room');

      // Get existing tracks from the preview
      const videoTrack = localStream.getVideoTracks()[0];
      const audioTrack = localStream.getAudioTracks()[0];
      
      console.log('Video track available:', !!videoTrack);
      console.log('Audio track available:', !!audioTrack);

      await room.localParticipant.enableCameraAndMicrophone();
      console.log('✅ Camera and microphone enabled');

      room.on(RoomEvent.LocalTrackPublished, (publication) => {
        console.log('Track published:', publication.source, 'Track:', publication.track);
        
        if (publication.source === Track.Source.Camera) {
          const localVideoTrack = publication.track;
          if (localVideoTrack && localVideoTrack.mediaStreamTrack) {
            console.log('Attaching camera track to video element');
            const mediaStream = new MediaStream([localVideoTrack.mediaStreamTrack]);
            
            if (videoRef.current) {
              videoRef.current.srcObject = mediaStream;
              videoRef.current.muted = true;
              videoRef.current.play()
                .then(() => {
                  console.log('✅ LiveKit video playing');
                  // Hide preview after LiveKit video is confirmed playing
                  setTimeout(() => {
                    if (localVideoRef.current) {
                      localVideoRef.current.style.display = 'none';
                    }
                  }, 300);
                })
                .catch(err => console.error('Video play error:', err));
            }
          }
        }

        if (publication.source === Track.Source.Microphone) {
          console.log('✅ Microphone track published');
        }
      });

      // IMPORTANT: Attach existing tracks immediately (they may already be published)
      setTimeout(() => {
        const camPublication = room.localParticipant.getTrackPublication(Track.Source.Camera);
        if (camPublication && camPublication.track && videoRef.current) {
          console.log('⚡ Manually attaching camera track');
          const mediaStream = new MediaStream([camPublication.track.mediaStreamTrack]);
          videoRef.current.srcObject = mediaStream;
          videoRef.current.muted = true;
          videoRef.current.play()
            .then(() => {
              console.log('✅ Manual attach successful');
              if (localVideoRef.current) {
                localVideoRef.current.style.display = 'none';
              }
            })
            .catch(err => console.error('Manual attach error:', err));
        } else {
          console.log('⚠️ Camera track not found, keeping preview');
        }
      }, 1000);

      setLiveKitRoom(room);
      setIsLive(true);
      console.log('🎉 Live stream started successfully!');
      
    } catch (err) {
      console.error('Error starting stream:', err);
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
          ...(token && { 'Authorization': `Bearer ${token}` })
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

      if (localVideoRef.current) {
        localVideoRef.current.style.display = 'block';
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
      const isEnabled = liveKitRoom.localParticipant.isCameraEnabled;
      await liveKitRoom.localParticipant.setCameraEnabled(!isEnabled);
      setIsCameraOn(!isEnabled);
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
      const isEnabled = liveKitRoom.localParticipant.isMicrophoneEnabled;
      await liveKitRoom.localParticipant.setMicrophoneEnabled(!isEnabled);
      setIsMicOn(!isEnabled);
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
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
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
            {/* LiveKit video - shows after connection */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
              style={{ position: 'absolute', top: 0, left: 0, zIndex: 2 }}
            />
            {/* Local preview - shows before going live, hidden after LiveKit connects */}
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
              style={{ position: 'absolute', top: 0, left: 0, zIndex: 1 }}
            />
            {!isCameraOn && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-900" style={{ zIndex: 10 }}>
                <VideoOff className="w-16 h-16 text-gray-600" />
              </div>
            )}
          </div>

          <div className="bg-gray-800 rounded-lg p-4 mb-4 flex items-center justify-center gap-4">
            <button
              onClick={toggleCamera}
              className={`p-4 rounded-full transition-colors ${isCameraOn ? 'bg-gray-700 hover:bg-gray-600' : 'bg-red-600 hover:bg-red-700'}`}
            >
              {isCameraOn ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
            </button>
            <button
              onClick={toggleMic}
              className={`p-4 rounded-full transition-colors ${isMicOn ? 'bg-gray-700 hover:bg-gray-600' : 'bg-red-600 hover:bg-red-700'}`}
            >
              {isMicOn ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
            </button>
          </div>

          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="font-semibold mb-2">Stream Details</h3>
            <div className="space-y-2 text-sm">
              <p className="text-gray-400">Stream ID: <span className="text-white font-mono text-xs">{streamData?.streamId}</span></p>
              <p className="text-gray-400">Status: <span className="text-green-400">● Live</span></p>
              <p className="text-gray-400">Room: <span className="text-white">Connected</span></p>
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
            <Radio className="w-6 h-6 text-red-500" />
            Start Live Stream
          </h1>

          {error && (
            <div className="bg-red-500/20 border border-red-500 text-red-500 p-3 rounded mb-4 text-sm">
              {error}
            </div>
          )}

          {!liveKitReady && (
            <div className="bg-yellow-500/20 border border-yellow-500 text-yellow-500 p-3 rounded mb-4 text-sm">
              ⚠️ LiveKit not loaded. Run: <code className="bg-black/30 px-1 rounded">npm install livekit-client</code>
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
                className={`w-10 h-10 backdrop-blur-sm rounded-full flex items-center justify-center transition-colors ${isCameraOn ? 'bg-black/50 hover:bg-black/70' : 'bg-red-500 hover:bg-red-600'}`}
              >
                {isCameraOn ? <Camera className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
              </button>
              <button
                onClick={toggleMic}
                className={`w-10 h-10 backdrop-blur-sm rounded-full flex items-center justify-center transition-colors ${isMicOn ? 'bg-black/50 hover:bg-black/70' : 'bg-red-500 hover:bg-red-600'}`}
              >
                {isMicOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
              </button>
            </div>
            {!localStream && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                <div className="text-center">
                  <Camera className="w-12 h-12 mx-auto mb-3 text-gray-600" />
                  <p className="text-gray-400 text-sm">Requesting camera access...</p>
                </div>
              </div>
            )}
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
              <p className="text-gray-400 text-xs mt-1">{title.length}/100</p>
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
              disabled={loading || !liveKitReady}
              className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed py-3 rounded-lg font-semibold transition-colors"
            >
              {loading ? 'Starting...' : '🔴 Go LIVE'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Viewer Component
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
  
  const commentsEndRef = useRef(null);

  useEffect(() => {
    loadLiveKit().then(ready => {
      setLiveKitReady(ready);
      if (ready && streamId) {
        fetchStream();
      }
    });

    return () => {
      if (liveKitRoom) {
        liveKitRoom.disconnect();
      }
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

      console.log('Stream fetched:', data);
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
      
      const room = new Room();
      await room.connect(roomUrl, viewerToken);
      setLiveKitRoom(room);
      console.log('✅ Connected to LiveKit room');

      room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
        console.log('📹 Track subscribed:', track.kind, 'from', participant.identity);

        if (track.kind === Track.Kind.Video) {
          setTimeout(() => {
            const videoEl = document.querySelector(`video[data-participant="${participant.identity}"]`);
            if (videoEl) {
              track.attach(videoEl);
              videoEl.muted = true;
              videoEl.volume = 0;
              videoEl.play().catch(err => console.warn('Video autoplay failed:', err));
              console.log('✅ Video attached for', participant.identity);
            }
          }, 100);
        }

        if (track.kind === Track.Kind.Audio) {
          console.log('🎵 Audio track received from', participant.identity);
          
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
              console.log('✅ Audio playing for', participant.identity);
              setAudioEnabled(true);
            })
            .catch((err) => {
              console.error('❌ Audio autoplay failed:', err);
              setError('👆 Click anywhere to enable audio');
              
              const playOnInteraction = () => {
                audioEl.play()
                  .then(() => {
                    console.log('✅ Audio started after user interaction');
                    setError('');
                    setAudioEnabled(true);
                    document.removeEventListener('click', playOnInteraction);
                    document.removeEventListener('touchstart', playOnInteraction);
                  })
                  .catch(console.error);
              };
              
              document.addEventListener('click', playOnInteraction, { once: true });
              document.addEventListener('touchstart', playOnInteraction, { once: true });
            });
        }
      });

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

      console.log('✅ LiveKit viewer setup complete');
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
        <div className="fixed top-4 left-4 right-4 bg-yellow-500/90 text-black px-4 py-3 rounded-lg text-sm z-50 flex items-center gap-2">
          <span>⚠️ {error}</span>
        </div>
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
                  <span>🔊 Audio enabled</span>
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
                    <p className="text-sm text-gray-600 mt-2">Stream will appear shortly</p>
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

            <div className="bg-gray-800 rounded-lg p-4 mt-4 flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                <span className="text-xl font-bold">{stream?.streamer?.username?.[0]?.toUpperCase()}</span>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">{stream?.streamer?.username}</h3>
                <p className="text-sm text-gray-400">Host</p>
              </div>
              <button className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg text-sm font-semibold">
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
                    placeholder="Say something..."
                    maxLength={200}
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
                  className="w-full bg-pink-600 hover:bg-pink-700 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors"
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
    return (
      <div>
        <button
          onClick={() => setMode('select')}
          className="fixed top-4 left-4 bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg z-50 flex items-center gap-2"
        >
          ← Back
        </button>
        <HostLiveStream />
      </div>
    );
  }

  if (mode === 'viewer' && streamId) {
    return <ViewerLiveStream streamId={streamId} onBack={() => setMode('select')} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="inline-block p-4 bg-red-600 rounded-full mb-4">
            <Radio className="w-12 h-12" />
          </div>
          <h1 className="text-4xl font-bold mb-2">LiveStream App</h1>
          <p className="text-gray-400">Stream live video with audio to your audience</p>
        </div>
        
        <div className="space-y-4">
          <button
            onClick={() => setMode('host')}
            className="w-full bg-red-600 hover:bg-red-700 p-6 rounded-xl flex items-center justify-center gap-3 transition-all transform hover:scale-105"
          >
            <Radio className="w-6 h-6" />
            <span className="text-xl font-semibold">Start Live Stream</span>
          </button>

          <div className="bg-gray-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Users className="w-5 h-5" />
              Join a Stream
            </h2>
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

          <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-5">
            <h3 className="font-semibold mb-3 text-blue-400 flex items-center gap-2">
              📦 Setup Required
            </h3>
            <div className="space-y-2 text-sm text-gray-300">
              <p>1. Install LiveKit client:</p>
              <code className="block bg-gray-800 px-3 py-2 rounded text-xs">
                npm install livekit-client
              </code>
              <p className="mt-3">2. Make sure your backend is running</p>
              <p>3. Grant camera & microphone permissions</p>
            </div>
          </div>

          <div className="text-center text-sm text-gray-500">
            <p>Built with React + LiveKit + WebRTC</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveScreenBothCode;