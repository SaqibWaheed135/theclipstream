import React, { useState, useRef, useEffect } from 'react';
import { Heart, MessageCircle, Share2, Camera, CameraOff, Mic, MicOff, Send } from 'lucide-react';
import io from 'socket.io-client';
import { Room, RoomEvent, Track } from 'livekit-client';

const LiveScreen = () => {
  const [isLive, setIsLive] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [viewers, setViewers] = useState(0);
  const [liveTitle, setLiveTitle] = useState('');
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [streamId, setStreamId] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [hearts, setHearts] = useState([]);
  const [currentStream, setCurrentStream] = useState(null);
  const [cohostRequests, setCohostRequests] = useState([]);
  const [showRequestsModal, setShowRequestsModal] = useState(false);
  const [liveKitRoom, setLiveKitRoom] = useState(null);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const socketRef = useRef(null);
  const localVideoRef = useRef(null);
  const commentsEndRef = useRef(null);
  const audioRef = useRef(null);

  // Use environment variable for LiveKit URL
  const LIVEKIT_URL = process.env.REACT_APP_LIVEKIT_URL || 'wss://theclipstream-q0jt88zr.livekit.cloud';

  // Initialize socket connection
  useEffect(() => {
    socketRef.current = io('https://theclipstream-backend.onrender.com', {
      withCredentials: true,
      transports: ['websocket', 'polling'],
    });

    socketRef.current.on('connect', () => {
      setConnectionStatus('connected');
      console.log('Connected to server');
    });

    socketRef.current.on('disconnect', () => {
      setConnectionStatus('disconnected');
      console.log('Disconnected from server');
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
      handleStreamEnd();
    });

    socketRef.current.on('cohost-request', (request) => {
      setCohostRequests((prev) => [...prev, request]);
    });

    socketRef.current.on('cohost-joined', () => {
      fetchStream();
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
      stopStream();
    };
  }, []);

  // Initialize camera preview
  useEffect(() => {
    if (!isLive) {
      getUserMedia().catch((error) => {
        console.error('Error initializing camera preview:', error);
      });
    }
  }, [isLive]);

  // Auto-scroll comments
  useEffect(() => {
    if (commentsEndRef.current) {
      commentsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [comments]);

  // Detect if device is mobile
  const isMobile = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  };

  const getUserMedia = async () => {
    try {
      // Stop existing stream first
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      // Mobile-optimized constraints
      const constraints = {
        video: {
          width: isMobile() ?
            { min: 320, ideal: 640, max: 1280 } :
            { min: 320, ideal: 720, max: 1920 },
          height: isMobile() ?
            { min: 240, ideal: 1136, max: 1920 } :
            { min: 240, ideal: 1280, max: 1080 },
          facingMode: 'user',
          frameRate: { ideal: 30, max: 30 }
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        localVideoRef.current.muted = true;

        try {
          await localVideoRef.current.play();
        } catch (playError) {
          console.warn('Local video autoplay failed:', playError);
        }
      }

      return stream;
    } catch (error) {
      console.error('Error accessing media devices:', error);

      if (error.name === 'NotAllowedError') {
        alert('Camera and microphone access denied. Please allow permissions and try again.');
      } else if (error.name === 'NotFoundError') {
        alert('No camera or microphone found. Please check your device.');
      } else if (error.name === 'OverconstrainedError') {
        console.log('Trying with simpler constraints...');
        try {
          const simpleConstraints = { video: true, audio: true };
          const simpleStream = await navigator.mediaDevices.getUserMedia(simpleConstraints);
          streamRef.current = simpleStream;
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = simpleStream;
            await localVideoRef.current.play();
          }
          return simpleStream;
        } catch (simpleError) {
          throw simpleError;
        }
      } else {
        alert('Could not access camera/microphone: ' + error.message);
      }

      throw error;
    }
  };

  const fetchStream = async () => {
    if (!streamId) return;
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`https://theclipstream-backend.onrender.com/api/live/${streamId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setCurrentStream(data);
      }
    } catch (error) {
      console.error('Error fetching stream:', error);
    }
  };

  //  const startLive = async () => {
  //   if (!liveTitle.trim()) {
  //     alert('Please enter a title for your live stream');
  //     return;
  //   }

  //   try {
  //     setConnectionStatus('connecting');
  //     console.log('Starting live stream process...');

  //     // Get fresh media stream for preview
  //     console.log('Getting fresh user media...');
  //     await getUserMedia();

  //     if (!streamRef.current) {
  //       throw new Error('Failed to get media stream');
  //     }

  //     const token = localStorage.getItem('token');
  //     console.log('Creating live stream via API...');

  //     const response = await fetch('https://theclipstream-backend.onrender.com/api/live/create', {
  //       method: 'POST',
  //       headers: {
  //         'Content-Type': 'application/json',
  //         ...(token && { Authorization: `Bearer ${token}` }),
  //       },
  //       credentials: 'include',
  //       body: JSON.stringify({
  //         title: liveTitle,
  //         description: '',
  //         privacy: 'public',
  //       }),
  //     });

  //     if (!response.ok) {
  //       const errorData = await response.json();
  //       throw new Error(`Failed to create live stream: ${errorData.msg || response.statusText}`);
  //     }

  //     const streamData = await response.json();
  //     console.log('Stream data from backend:', streamData);

  //     if (!streamData.publishToken || typeof streamData.publishToken !== 'string') {
  //       throw new Error('Invalid publish token received from server');
  //     }

  //     if (!streamData.roomUrl || !streamData.roomUrl.startsWith('wss://')) {
  //       throw new Error('Invalid room URL received from server');
  //     }

  //     setStreamId(streamData.streamId);
  //     setCurrentStream(streamData.stream);

  //     console.log('Connecting to LiveKit room...');
  //     const room = new Room({
  //       adaptiveStream: true,
  //       dynacast: true,
  //       videoCaptureDefaults: {
  //         resolution: isMobile()
  //           ? { width: 640, height: 1136, frameRate: 30 }
  //           : { width: 720, height: 1280, frameRate: 30 },
  //       },
  //       audioCaptureDefaults: {
  //         echoCancellation: true,
  //         noiseSuppression: true,
  //       },
  //     });

  //     try {
  //       await room.connect(streamData.roomUrl, streamData.publishToken);
  //       console.log('Connected to LiveKit room successfully');
  //     } catch (liveKitError) {
  //       console.error('LiveKit connection failed:', liveKitError);
  //       throw new Error(`Failed to connect to LiveKit: ${liveKitError.message}`);
  //     }

  //     // Enable local camera and microphone
  //     try {
  //       await room.localParticipant.enableCameraAndMicrophone();
  //       console.log('Tracks published using enableCameraAndMicrophone');
  //     } catch (publishError) {
  //       console.error('LiveKit publishing failed:', publishError);
  //       throw new Error(`Failed to publish video/audio: ${publishError.message}`);
  //     }

  //     setLiveKitRoom(room);

  //     // ✅ FIX: Use LiveKit event listener instead of timeout
  //     room.on(RoomEvent.LocalTrackPublished, (publication) => {
  //       if (publication.source === Track.Source.Camera && videoRef.current) {
  //         console.log('Camera track published, setting video element...');
  //         const localVideoTrack = publication.track;
  //         if (localVideoTrack && localVideoTrack.mediaStreamTrack) {
  //           const mediaStream = new MediaStream([localVideoTrack.mediaStreamTrack]);
  //           videoRef.current.srcObject = mediaStream;
  //           videoRef.current.muted = false;
  //           videoRef.current
  //             .play()
  //             .then(() => console.log('Main video playing successfully'))
  //             .catch((err) => {
  //               console.warn('Main video autoplay failed, retrying muted:', err);
  //               videoRef.current.muted = true;
  //               videoRef.current.play();
  //             });

  //           // Hide local preview after switching
  //           if (localVideoRef.current) {
  //             localVideoRef.current.style.display = 'none';
  //           }
  //         }
  //       }
  //     });

  //     setIsStreaming(true);

  //     // Join stream via socket
  //     socketRef.current.emit('join-stream', {
  //       streamId: streamData.streamId,
  //       isStreamer: true,
  //       title: liveTitle,
  //     });

  //     setIsLive(true);
  //     setConnectionStatus('live');
  //     console.log('Live stream started successfully!');
  //   } catch (error) {
  //     console.error('Error starting live stream:', error);
  //     setConnectionStatus('error');
  //     alert('Failed to start live stream: ' + error.message);

  //     // Clean up on error
  //     if (streamRef.current) {
  //       streamRef.current.getTracks().forEach((track) => track.stop());
  //     }
  //     stopStream();
  //   }
  // };


  const startLive = async () => {
    if (!liveTitle.trim()) {
      alert('Please enter a title for your live stream');
      return;
    }

    try {
      setConnectionStatus('connecting');
      console.log('Starting live stream process...');

      // Get fresh media stream for preview
      console.log('Getting fresh user media...');
      await getUserMedia();

      if (!streamRef.current) {
        throw new Error('Failed to get media stream');
      }

      const token = localStorage.getItem('token');
      console.log('Creating live stream via API...');

      const response = await fetch('https://theclipstream-backend.onrender.com/api/live/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        credentials: 'include',
        body: JSON.stringify({
          title: liveTitle,
          description: '',
          privacy: 'public',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Failed to create live stream: ${errorData.msg || response.statusText}`);
      }

      const streamData = await response.json();
      console.log('Stream data from backend:', streamData);

      if (!streamData.publishToken || typeof streamData.publishToken !== 'string') {
        throw new Error('Invalid publish token received from server');
      }

      if (!streamData.roomUrl || !streamData.roomUrl.startsWith('wss://')) {
        throw new Error('Invalid room URL received from server');
      }

      setStreamId(streamData.streamId);
      setCurrentStream(streamData.stream);

      console.log('Connecting to LiveKit room...');
      const room = new Room({
        adaptiveStream: true,
        dynacast: true,
        videoCaptureDefaults: {
          resolution: isMobile()
            ? { width: 640, height: 1136, frameRate: 30 }
            : { width: 720, height: 1280, frameRate: 30 },
        },
        audioCaptureDefaults: {
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      try {
        await room.connect(streamData.roomUrl, streamData.publishToken);
        console.log('Connected to LiveKit room successfully');
      } catch (liveKitError) {
        console.error('LiveKit connection failed:', liveKitError);
        throw new Error(`Failed to connect to LiveKit: ${liveKitError.message}`);
      }

      // Enable local camera and microphone
      try {
        await room.localParticipant.enableCameraAndMicrophone();
        console.log('Tracks published using enableCameraAndMicrophone');
      } catch (publishError) {
        console.error('LiveKit publishing failed:', publishError);
        throw new Error(`Failed to publish video/audio: ${publishError.message}`);
      }

      setLiveKitRoom(room);

      let cameraTrackReceived = false;
      let micTrackReceived = false;


      // Listen for local track publications
      // room.on(RoomEvent.LocalTrackPublished, (publication) => {
      //   if (publication.source === Track.Source.Camera && videoRef.current) {
      //     console.log('Camera track published, setting video element...');
      //     const localVideoTrack = publication.track;
      //     if (localVideoTrack && localVideoTrack.mediaStreamTrack) {
      //       cameraTrackReceived = true;
      //       const mediaStream = new MediaStream([localVideoTrack.mediaStreamTrack]);
      //       videoRef.current.srcObject = mediaStream;
      //       videoRef.current.muted = false;
      //       videoRef.current.play().catch((err) => {
      //         console.warn('Main video autoplay failed, retrying muted:', err);
      //         videoRef.current.muted = true;
      //         videoRef.current.play();
      //       });

      //       // Hide local preview after switching
      //       if (localVideoRef.current) {
      //         localVideoRef.current.style.display = 'none';
      //       }
      //     }
      //   }

      //   //         if (publication.source === Track.Source.Microphone) {
      //   //   console.log('Microphone track published ✅');
      //   //   micTrackReceived = true;

      //   //   const localAudioTrack = publication.track;
      //   //   if (localAudioTrack && localAudioTrack.mediaStreamTrack && audioRef.current) {
      //   //     console.log('Attaching local microphone to hidden audio element...');
      //   //     const audioStream = new MediaStream([localAudioTrack.mediaStreamTrack]);
      //   //     audioRef.current.srcObject = audioStream;
      //   //     audioRef.current.muted = true; // Prevent echo feedback
      //   //     audioRef.current
      //   //       .play()
      //   //       .then(() => console.log('Hidden audio element is playing mic track'))
      //   //       .catch((err) => console.warn('Autoplay failed for audio element:', err));
      //   //   }
      //   // }

      //   if (publication.source === Track.Source.Microphone) {
      //     console.log('✅ Microphone track published successfully');
      //     micTrackReceived = true;
      //   }

      // });

      room.on(RoomEvent.LocalTrackPublished, (publication) => {
        if (publication.source === Track.Source.Camera && videoRef.current) {
          console.log('Camera track published, setting video element...');
          const localVideoTrack = publication.track;
          if (localVideoTrack && localVideoTrack.mediaStreamTrack) {
            const mediaStream = new MediaStream([localVideoTrack.mediaStreamTrack]); // Only video track
            videoRef.current.srcObject = mediaStream;
            videoRef.current.muted = true; // Ensure muted to prevent audio feedback
            videoRef.current.play().catch((err) => {
              console.warn('Main video autoplay failed:', err);
            });

            // Hide local preview after switching
            if (localVideoRef.current) {
              localVideoRef.current.style.display = 'none';
            }
          }
        }

        if (publication.source === Track.Source.Microphone) {
          console.log('✅ Microphone track published successfully');
          micTrackReceived = true;
          // Do NOT attach the microphone track to any local audio or video element
        }
      });
      // Fallback for video if track not received
      // setTimeout(() => {
      //   if (!cameraTrackReceived && videoRef.current && streamRef.current) {
      //     console.warn('LiveKit track not received, falling back to getUserMedia stream');
      //     videoRef.current.srcObject = streamRef.current;
      //     videoRef.current.muted = false;
      //     videoRef.current.play().catch((err) => {
      //       console.warn('Fallback video autoplay failed, retrying muted:', err);
      //       videoRef.current.muted = true;
      //       videoRef.current.play();
      //     });
      //   }

      //   if (!micTrackReceived) {
      //     console.warn('⚠️ Microphone track not published — viewers will not hear audio.');
      //     alert('Your mic did not connect. Please check permissions and retry.');
      //   }
      // }, 3000);

      // Fallback check with longer timeout
    setTimeout(() => {
  if (!cameraTrackReceived && videoRef.current && streamRef.current) {
    console.warn('LiveKit camera track not received, falling back to getUserMedia stream');
    videoRef.current.srcObject = streamRef.current;
    videoRef.current.muted = true; // Ensure muted
    videoRef.current.play().catch((err) => {
      console.warn('Fallback video autoplay failed:', err);
    });
  }

  if (!micTrackReceived) {
    const isMicEnabled = room.localParticipant.isMicrophoneEnabled;
    console.log('Microphone enabled state:', isMicEnabled);
    console.log('Published tracks:', Array.from(room.localParticipant.trackPublications.values()));
    if (!isMicEnabled) {
      console.error('❌ Microphone track not published');
      alert('Your mic did not connect. Please check permissions and retry.');
    } else {
      console.log('✅ Microphone is enabled (may have published late)');
      micTrackReceived = true;
    }
  }
}, 5000);

      setIsStreaming(true);

      // Join stream via socket
      socketRef.current.emit('join-stream', {
        streamId: streamData.streamId,
        isStreamer: true,
        title: liveTitle,
      });

      setIsLive(true);
      setConnectionStatus('live');
      console.log('Live stream started successfully!');
    } catch (error) {
      console.error('Error starting live stream:', error);
      setConnectionStatus('error');
      alert('Failed to start live stream: ' + error.message);

      // Clean up on error
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      stopStream();
    }
  };


  const stopStream = async () => {
    try {
      console.log('Stopping stream...');

      // Disconnect LiveKit room first
      if (liveKitRoom) {
        await liveKitRoom.disconnect();
        setLiveKitRoom(null);
      }

      // Clear video elements properly
      if (videoRef.current) {
        videoRef.current.srcObject = null;
        videoRef.current.load(); // Reset the video element
      }

      // End stream via socket and API
      if (socketRef.current && streamId) {
        socketRef.current.emit('end-stream', { streamId });
      }

      if (streamId) {
        const token = localStorage.getItem('token');
        await fetch(`https://theclipstream-backend.onrender.com/api/live/${streamId}/end`, {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          credentials: 'include',
        });
      }

      handleStreamEnd();
    } catch (error) {
      console.error('Error stopping stream:', error);
      handleStreamEnd();
    }
  };

  const handleStreamEnd = () => {
    setIsLive(false);
    setIsStreaming(false);
    setViewers(0);
    setStreamId(null);
    setComments([]);
    setConnectionStatus('disconnected');
    setCurrentStream(null);
    setCohostRequests([]);
    setIsMuted(false);
    setIsVideoOff(false);

    // Show local preview again
    if (localVideoRef.current) {
      localVideoRef.current.style.display = 'block';
    }

    // Restart camera preview
    setTimeout(() => {
      getUserMedia().catch(console.error);
    }, 1000);
  };

  const sendComment = (e) => {
    e.preventDefault();
    if (!newComment.trim() || !streamId) return;

    const comment = {
      streamId,
      text: newComment.trim(),
      timestamp: Date.now(),
    };

    socketRef.current.emit('send-comment', comment);
    setNewComment('');
  };

  const sendHeart = () => {
    if (streamId) {
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

  const toggleVideo = async () => {
    if (liveKitRoom && isLive) {
      // Use LiveKit's methods during live stream
      const isEnabled = liveKitRoom.localParticipant.isCameraEnabled;
      await liveKitRoom.localParticipant.setCameraEnabled(!isEnabled);
      setIsVideoOff(isEnabled);

      // Update the main video display
      setTimeout(() => {
        if (videoRef.current && liveKitRoom.localParticipant.getTrack(Track.Source.Camera)) {
          const localVideoTrack = liveKitRoom.localParticipant.getTrack(Track.Source.Camera).track;
          if (localVideoTrack) {
            const mediaStream = new MediaStream([localVideoTrack.mediaStreamTrack]);
            videoRef.current.srcObject = mediaStream;
          }
        }
      }, 100);
    } else if (streamRef.current) {
      // For preview mode
      const videoTrack = streamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
      }
    }
  };

  const toggleMute = async () => {
    if (liveKitRoom && isLive) {
      // Use LiveKit's methods during live stream
      const isEnabled = liveKitRoom.localParticipant.isMicrophoneEnabled;
      await liveKitRoom.localParticipant.setMicrophoneEnabled(!isEnabled);
      setIsMuted(isEnabled);
    } else if (streamRef.current) {
      // For preview mode
      const audioTrack = streamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const shareStream = async () => {
    const shareData = {
      title: `🔴 LIVE: ${liveTitle}`,
      text: `Watch my live stream now!`,
      url: `${window.location.origin}/live/${streamId}`,
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
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = shareData.url;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      alert('Live stream link copied to clipboard!');
    }
  };

  const approveCohost = (userId) => {
    socketRef.current.emit('approve-cohost', { streamId, userId });
    setCohostRequests((prev) => prev.filter((r) => r.userId !== userId));
  };

  const rejectCohost = (userId) => {
    socketRef.current.emit('reject-cohost', { streamId, userId });
    setCohostRequests((prev) => prev.filter((r) => r.userId !== userId));
  };

  // Pre-live setup screen
  if (!isLive) {
    return (
      <div className="min-h-screen bg-black text-white">
        {/* Header */}
        <div className="sticky top-0 bg-black/95 backdrop-blur-lg border-b border-gray-800 z-10 p-4">
          <h1 className="text-xl font-bold text-center">Go LIVE</h1>
          <div className="text-center mt-1">
            <span className={`text-xs px-2 py-1 rounded-full ${connectionStatus === 'connected' ? 'bg-green-500/20 text-green-400' :
              connectionStatus === 'connecting' ? 'bg-yellow-500/20 text-yellow-400' :
                connectionStatus === 'error' ? 'bg-red-500/20 text-red-400' :
                  'bg-gray-500/20 text-gray-400'
              }`}>
              {connectionStatus === 'connected' ? '🟢 Ready to go live' :
                connectionStatus === 'connecting' ? '🟡 Starting stream...' :
                  connectionStatus === 'error' ? '🔴 Connection error' :
                    '⚫ Connecting...'}
            </span>
          </div>
        </div>

        <div className="p-4">
          {/* Camera Preview */}
          <div className="relative bg-gray-900 rounded-xl aspect-[9/16] mb-6 overflow-hidden">
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover"
            />

            {/* Control Buttons Overlay */}
            <div className="absolute top-4 right-4 flex space-x-2">
              <button
                onClick={toggleVideo}
                className={`w-10 h-10 ${isVideoOff ? 'bg-red-500' : 'bg-black/50'} backdrop-blur-sm rounded-full flex items-center justify-center transition-colors`}
              >
                {isVideoOff ? <CameraOff className="w-5 h-5 text-white" /> : <Camera className="w-5 h-5 text-white" />}
              </button>
              {/* <button
                onClick={toggleMute}
                className={`w-10 h-10 ${isMuted ? 'bg-red-500' : 'bg-black/50'} backdrop-blur-sm rounded-full flex items-center justify-center transition-colors`}
              >
                {isMuted ? <MicOff className="w-5 h-5 text-white" /> : <Mic className="w-5 h-5 text-white" />}
              </button> */}
              <button
                onClick={toggleMute}
                className={`w-12 h-12 ${isMuted ? 'bg-red-500' : micTrackReceived ? 'bg-green-500' : 'bg-black/50'} backdrop-blur-sm rounded-full flex items-center justify-center transition-colors`}
              >
                {isMuted ? <MicOff className="w-6 h-6 text-white" /> : <Mic className="w-6 h-6 text-white" />}
              </button>
            </div>

            {/* No Camera Message */}
            {!streamRef.current && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                <div className="text-center">
                  <div className="w-16 h-16 bg-red-500 rounded-full mx-auto mb-4 flex items-center justify-center">
                    <Camera className="w-8 h-8 text-white" />
                  </div>
                  <p className="text-gray-400">Allow camera access to see preview</p>
                </div>
              </div>
            )}
          </div>

          {/* Stream Title Input */}
          <div className="mb-6">
            <label className="block text-sm font-semibold mb-2">Live title</label>
            <input
              type="text"
              placeholder="What's your live stream about?"
              value={liveTitle}
              onChange={(e) => setLiveTitle(e.target.value)}
              className="w-full bg-gray-900 text-white p-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500"
              maxLength={100}
            />
            <p className="text-gray-400 text-sm mt-1">{liveTitle.length}/100</p>
          </div>

          {/* Go Live Button */}
          <button
            onClick={startLive}
            disabled={!liveTitle.trim() || connectionStatus === 'connecting'}
            className="w-full bg-red-500 hover:bg-red-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white py-4 rounded-xl font-bold text-lg transition-colors"
          >
            {connectionStatus === 'connecting' ? 'Starting...' : 'Go LIVE'}
          </button>

          {/* Tips Section */}
          <div className="mt-8 bg-gray-900 rounded-xl p-4">
            <h3 className="font-bold mb-3 text-center">Tips for going live</h3>
            <div className="space-y-3 text-sm text-gray-300">
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                <p>Ensure you have a strong internet connection</p>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                <p>Find good lighting for the best video quality</p>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                <p>Interact with your viewers to keep them engaged</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Live streaming screen
  return (
    <div className="relative h-screen bg-gray-900 overflow-hidden">
      {/* Main Video Stream */}
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
      />

      {/* Hearts Animation Overlay */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {hearts.map((heart) => (
          <div
            key={heart.id}
            className="absolute bottom-32 animate-pulse"
            style={{
              left: `${heart.x}%`,
              animation: 'heartFloat 3s ease-out forwards',
            }}
          >
            <Heart className="w-8 h-8 text-red-500 fill-red-500" />
          </div>
        ))}
      </div>

      {/* Top Controls */}
      <div className="absolute top-4 left-4 z-20">
        <div className="bg-red-500 px-3 py-1 rounded-full flex items-center space-x-2">
          <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
          <span className="text-white font-bold text-sm">LIVE</span>
          <span className="text-white font-bold text-sm">{viewers}</span>
        </div>
      </div>

      <div className="absolute top-4 right-4 z-20 flex space-x-2">
        {cohostRequests.length > 0 && (
          <button
            onClick={() => setShowRequestsModal(true)}
            className="bg-blue-500 px-3 py-2 rounded-full text-white font-semibold"
          >
            Requests ({cohostRequests.length})
          </button>
        )}
        <button
          onClick={shareStream}
          className="bg-black/50 backdrop-blur-sm px-3 py-2 rounded-full text-white hover:bg-black/70 transition-colors"
        >
          <Share2 className="w-4 h-4" />
        </button>
        <button
          onClick={stopStream}
          className="bg-red-500 hover:bg-red-600 px-4 py-2 rounded-full text-white font-semibold transition-colors"
        >
          End
        </button>
      </div>

      {/* Comments Display */}
      <div className="absolute bottom-24 left-0 right-0 p-4 pointer-events-none">
        <div className="bg-black/30 backdrop-blur-sm rounded-xl p-3 max-h-40 overflow-y-auto pointer-events-auto">
          <div className="space-y-2">
            {comments.slice(-5).map((comment, index) => (
              <div key={index} className="flex items-start space-x-2 animate-fadeIn">
                <div className={`w-6 h-6 rounded-full flex-shrink-0 ${['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-pink-500', 'bg-yellow-500'][index % 5]
                  }`}></div>
                <div className="min-w-0 flex-1">
                  <span className="text-white font-semibold text-sm">
                    {comment.username || 'Anonymous'}
                  </span>
                  <p className="text-gray-300 text-sm break-words">{comment.text}</p>
                </div>
              </div>
            ))}
            {comments.length === 0 && (
              <div className="text-center text-gray-400 py-4">
                <MessageCircle className="w-6 h-6 mx-auto mb-2" />
                <p className="text-sm">No comments yet</p>
              </div>
            )}
          </div>
          <div ref={commentsEndRef} />
        </div>
      </div>

      {/* Bottom Controls */}
      <div className="absolute bottom-4 left-4 right-4 flex justify-between items-center">
        <div className="flex space-x-2">
          <button
            onClick={toggleMute}
            className={`w-12 h-12 ${isMuted ? 'bg-red-500' : 'bg-black/50'} backdrop-blur-sm rounded-full flex items-center justify-center transition-colors`}
          >
            {isMuted ? <MicOff className="w-6 h-6 text-white" /> : <Mic className="w-6 h-6 text-white" />}
          </button>
          <button
            onClick={toggleVideo}
            className={`w-12 h-12 ${isVideoOff ? 'bg-red-500' : 'bg-black/50'} backdrop-blur-sm rounded-full flex items-center justify-center transition-colors`}
          >
            {isVideoOff ? <CameraOff className="w-6 h-6 text-white" /> : <Camera className="w-6 h-6 text-white" />}
          </button>
        </div>
        <button
          onClick={sendHeart}
          className="w-12 h-12 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-red-500/50 transition-colors"
        >
          <Heart className="w-6 h-6 text-red-500" />
        </button>
      </div>

      {/* Comment Input */}
      <div className="absolute bottom-20 left-4 right-20">
        <form onSubmit={sendComment} className="flex items-center space-x-2">
          <div className="flex-1 relative">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Say something..."
              maxLength={200}
              className="w-full px-4 py-2 pr-12 bg-black/50 backdrop-blur-sm border border-gray-600 rounded-full focus:outline-none focus:ring-2 focus:ring-red-500 text-white placeholder-gray-400"
            />
            <button
              type="submit"
              disabled={!newComment.trim()}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1.5 rounded-full bg-red-500 text-white disabled:bg-gray-600 disabled:cursor-not-allowed hover:bg-red-600 transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>

      {/* Co-host Requests Modal */}
      {showRequestsModal && (
        <div className="absolute inset-0 bg-black/50 z-30 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-xl p-6 max-w-sm w-full max-h-96 overflow-y-auto">
            <h3 className="font-bold mb-4 text-center text-white">Co-host Requests</h3>
            <div className="space-y-3">
              {cohostRequests.map((request) => (
                <div key={request.userId} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold text-sm">
                        {request.username?.[0]?.toUpperCase() || 'U'}
                      </span>
                    </div>
                    <div>
                      <p className="text-white font-semibold">@{request.username || 'Unknown'}</p>
                      <p className="text-gray-400 text-xs">Wants to co-host</p>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => approveCohost(request.userId)}
                      className="bg-green-500 hover:bg-green-600 px-3 py-1 rounded text-white text-sm font-medium transition-colors"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => rejectCohost(request.userId)}
                      className="bg-red-500 hover:bg-red-600 px-3 py-1 rounded text-white text-sm font-medium transition-colors"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              ))}
              {cohostRequests.length === 0 && (
                <div className="text-center text-gray-400 py-8">
                  <Camera className="w-12 h-12 mx-auto mb-3 text-gray-600" />
                  <p>No co-host requests</p>
                  <p className="text-sm mt-1">Requests will appear here</p>
                </div>
              )}
            </div>
            <button
              onClick={() => setShowRequestsModal(false)}
              className="w-full mt-6 bg-gray-600 hover:bg-gray-700 py-3 rounded-lg text-white font-semibold transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Custom Styles */}
      <style jsx>{`
        @keyframes heartFloat {
          0% { 
            transform: translateY(0) scale(1); 
            opacity: 1; 
          }
          50% { 
            transform: translateY(-100px) scale(1.2); 
            opacity: 0.8; 
          }
          100% { 
            transform: translateY(-200px) scale(0.8); 
            opacity: 0; 
          }
        }
        
        @keyframes fadeIn {
          from { 
            opacity: 0; 
            transform: translateY(10px); 
          }
          to { 
            opacity: 1; 
            transform: translateY(0); 
          }
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
        
        /* Custom scrollbar for comments */
        .overflow-y-auto::-webkit-scrollbar {
          width: 4px;
        }
        
        .overflow-y-auto::-webkit-scrollbar-track {
          background: rgba(75, 85, 99, 0.3);
          border-radius: 2px;
        }
        
        .overflow-y-auto::-webkit-scrollbar-thumb {
          background: rgba(156, 163, 175, 0.5);
          border-radius: 2px;
        }
        
        .overflow-y-auto::-webkit-scrollbar-thumb:hover {
          background: rgba(156, 163, 175, 0.7);
        }
        
        /* Ensure video elements are properly styled */
        video {
          background: #000;
        }
        
        /* Mobile optimizations */
        @media (max-width: 768px) {
          .absolute.bottom-20 {
            bottom: 5rem;
          }
          
          .absolute.bottom-4 {
            bottom: 1rem;
          }
          
          .aspect-\[9\/16\] {
            aspect-ratio: 9/16;
          }
        }
        
        /* Prevent text selection on buttons */
        button {
          -webkit-user-select: none;
          -moz-user-select: none;
          -ms-user-select: none;
          user-select: none;
        }
        
        /* Smooth transitions for all interactive elements */
        button, input {
          transition: all 0.2s ease-in-out;
        }
        
        /* Focus styles for accessibility */
        button:focus,
        input:focus {
          outline: 2px solid #ef4444;
          outline-offset: 2px;
        }
        
        /* Loading states */
        .loading {
          position: relative;
          overflow: hidden;
        }
        
        .loading::after {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(255, 255, 255, 0.1),
            transparent
          );
          animation: loading 1.5s infinite;
        }
        
        @keyframes loading {
          0% {
            left: -100%;
          }
          100% {
            left: 100%;
          }
        }
      `}</style>
      {/* Hidden audio element for mic verification */}
      {/* <audio ref={audioRef} autoPlay playsInline muted hidden /> */}

    </div>
  );
};

export default LiveScreen;