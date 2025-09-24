// import React, { useState, useRef, useEffect } from 'react';
// import { Heart, MessageCircle, Share2, Camera, CameraOff, Mic, MicOff, Send } from 'lucide-react';
// import io from 'socket.io-client';
// import Hls from 'hls.js';

// const LiveScreen = () => {
//   const [isLive, setIsLive] = useState(false);
//   const [isStreaming, setIsStreaming] = useState(false);
//   const [viewers, setViewers] = useState(0);
//   const [liveTitle, setLiveTitle] = useState('');
//   const [comments, setComments] = useState([]);
//   const [newComment, setNewComment] = useState('');
//   const [isMuted, setIsMuted] = useState(false);
//   const [isVideoOff, setIsVideoOff] = useState(false);
//   const [streamId, setStreamId] = useState(null);
//   const [connectionStatus, setConnectionStatus] = useState('disconnected');
//   const [hearts, setHearts] = useState([]);
//   const [currentStream, setCurrentStream] = useState(null);
//   const [cohostRequests, setCohostRequests] = useState([]);
//   const [showRequestsModal, setShowRequestsModal] = useState(false);

//   const videoRef = useRef(null);
//   const streamRef = useRef(null);
//   const socketRef = useRef(null);
//   const peerConnections = useRef(new Map());

//   // Initialize socket connection
//   useEffect(() => {
//     socketRef.current = io('https://theclipstream-backend.onrender.com', {
//       withCredentials: true
//     });

//     socketRef.current.on('connect', () => {
//       setConnectionStatus('connected');
//       console.log('Connected to server');
//     });

//     socketRef.current.on('disconnect', () => {
//       setConnectionStatus('disconnected');
//       console.log('Disconnected from server');
//     });

//     socketRef.current.on('viewer-joined', (data) => {
//       setViewers(data.viewerCount);
//     });

//     socketRef.current.on('viewer-left', (data) => {
//       setViewers(data.viewerCount);
//     });

//     socketRef.current.on('new-comment', (comment) => {
//       setComments(prev => [...prev, comment]);
//     });

//     socketRef.current.on('heart-sent', () => {
//       addHeart();
//     });

//     socketRef.current.on('stream-ended', () => {
//       handleStreamEnd();
//     });

//     socketRef.current.on('cohost-request', (request) => {
//       setCohostRequests(prev => [...prev, request]);
//     });

//     socketRef.current.on('cohost-joined', () => {
//       fetchStream();
//     });

//     return () => {
//       if (socketRef.current) {
//         socketRef.current.disconnect();
//       }
//       stopStream();
//     };
//   }, []);

//   // Initialize camera preview
//   useEffect(() => {
//     if (!isLive) {
//       getUserMedia().catch((error) => {
//         console.error('Error initializing camera preview:', error);
//       });
//     }
//   }, [isLive]);

//   useEffect(() => {
//     if (isLive && videoRef.current && streamRef.current) {
//       videoRef.current.srcObject = streamRef.current;
//       videoRef.current.play().catch((err) => {
//         console.error('Error playing video in live mode:', err);
//       });
//     }
//   }, [isLive]);

//   // Get user media
//   const getUserMedia = async () => {
//     try {
//       const constraints = {
//         video: {
//           width: { min: 320, ideal: 720, max: 1280 },
//           height: { min: 240, ideal: 1280, max: 720 },
//           facingMode: 'user'
//         },
//         audio: true
//       };

//       const stream = await navigator.mediaDevices.getUserMedia(constraints);
//       streamRef.current = stream;

//       if (videoRef.current) {
//         videoRef.current.srcObject = stream;
//         videoRef.current.onloadedmetadata = () => {
//           videoRef.current.play().catch((err) => {
//             console.error('Error playing video:', err);
//           });
//         };
//       }

//       return stream;
//     } catch (error) {
//       console.error('Error accessing media devices:', error.name, error.message);
//       let errorMessage = 'Could not access camera/microphone. Please check permissions.';
//       if (error.name === 'NotAllowedError') {
//         errorMessage = 'Camera/microphone access denied. Please allow access in your browser settings.';
//       } else if (error.name === 'NotFoundError') {
//         errorMessage = 'No camera or microphone found. Please ensure devices are connected.';
//       } else if (error.name === 'NotReadableError') {
//         errorMessage = 'Camera or microphone is already in use by another application.';
//       }
//       alert(errorMessage);
//       throw error;
//     }
//   };

//   // Fetch current stream data
//   const fetchStream = async () => {
//     if (!streamId) return;
//     try {
//       const token = localStorage.getItem('token');
//       const response = await fetch(`https://theclipstream-backend.onrender.com/api/live/${streamId}`, {
//         headers: {
//           'Authorization': `Bearer ${token}`
//         },
//         credentials: 'include'
//       });
//       if (response.ok) {
//         const data = await response.json();
//         setCurrentStream(data);
//       }
//     } catch (error) {
//       console.error('Error fetching stream:', error);
//     }
//   };

//   // Start live stream
//   const startLive = async () => {
//     console.log('Starting live stream...');
//     if (!liveTitle.trim()) {
//       console.warn('No title provided');
//       alert('Please enter a title for your live stream');
//       return;
//     }

//     if (!videoRef.current) {
//       console.error('Video element not found');
//       alert('Video element not found. Please try again.');
//       return;
//     }

//     try {
//       console.log('Requesting user media...');
//       setConnectionStatus('connecting');
//       // ✅ ensure preview stream is still there
//       if (!streamRef.current) {
//         streamRef.current = await getUserMedia();
//       }

//       //console.log('User media obtained:', stream);

//       //console.log('Creating live stream on backend...');
//       const token = localStorage.getItem('token');
//       const response = await fetch('https://theclipstream-backend.onrender.com/api/live/create', {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//           'Authorization': `Bearer ${token}`
//         },
//         credentials: 'include',
//         body: JSON.stringify({
//           title: liveTitle,
//           description: '',
//           privacy: 'public'
//         })
//       });

//       if (!response.ok) {
//         throw new Error('Failed to create live stream');
//       }

//       const streamData = await response.json();
//       console.log('Stream created:', streamData);
//       setStreamId(streamData.streamId);
//       setCurrentStream(streamData.stream);

//       // Display RTMP details to the user
//       if (streamData.rtmpUrl && streamData.streamKey) {
//         alert(`Use these details in OBS Studio to stream:
//         RTMP URL: ${streamData.rtmpUrl}
//         Stream Key: ${streamData.streamKey}`);
//       }

//       console.log('Joining stream room...');
//       socketRef.current.emit('join-stream', {
//         streamId: streamData.streamId,
//         isStreamer: true,
//         title: liveTitle
//       });

//       setIsLive(true);
//       if (videoRef.current && streamRef.current) {
//         videoRef.current.srcObject = streamRef.current;
//         videoRef.current.play();
//       }

//       setIsStreaming(true);
//       setConnectionStatus('live');
//       console.log('Live stream started successfully');
//     } catch (error) {
//       console.error('Error starting live stream:', error);
//       setConnectionStatus('error');
//       alert('Failed to start live stream: ' + error.message);
//       stopStream();
//     }
//   };

//   // Stop live stream
//   const stopStream = async () => {
//     try {
//       if (streamRef.current) {
//         streamRef.current.getTracks().forEach(track => track.stop());
//         streamRef.current = null;
//       }

//       if (socketRef.current && streamId) {
//         socketRef.current.emit('end-stream', { streamId });
//       }

//       if (streamId) {
//         const token = localStorage.getItem('token');
//         await fetch(`https://theclipstream-backend.onrender.com/api/live/${streamId}/end`, {
//           method: 'POST',
//           headers: {
//             'Authorization': `Bearer ${token}`
//           },
//           credentials: 'include'
//         });
//       }

//       handleStreamEnd();
//     } catch (error) {
//       console.error('Error stopping stream:', error);
//     }
//   };

//   const handleStreamEnd = () => {
//     setIsLive(false);
//     setIsStreaming(false);
//     setViewers(0);
//     setStreamId(null);
//     setComments([]);
//     setConnectionStatus('disconnected');
//     setCurrentStream(null);
//     setCohostRequests([]);
//   };

//   const sendComment = (e) => {
//     e.preventDefault();
//     if (!newComment.trim() || !streamId) return;

//     const comment = {
//       streamId,
//       text: newComment.trim(),
//       timestamp: Date.now()
//     };

//     socketRef.current.emit('send-comment', comment);
//     setNewComment('');
//   };

//   const sendHeart = () => {
//     if (streamId) {
//       socketRef.current.emit('send-heart', { streamId });
//       addHeart();
//     }
//   };

//   const addHeart = () => {
//     const heartId = Date.now() + Math.random();
//     setHearts(prev => [...prev, { id: heartId, x: Math.random() * 100 }]);
//     setTimeout(() => {
//       setHearts(prev => prev.filter(h => h.id !== heartId));
//     }, 3000);
//   };

//   const toggleMute = () => {
//     if (streamRef.current) {
//       const audioTrack = streamRef.current.getAudioTracks()[0];
//       if (audioTrack) {
//         audioTrack.enabled = !audioTrack.enabled;
//         setIsMuted(!audioTrack.enabled);
//       }
//     }
//   };

//   const toggleVideo = () => {
//     if (streamRef.current) {
//       const videoTrack = streamRef.current.getVideoTracks()[0];
//       if (videoTrack) {
//         videoTrack.enabled = !videoTrack.enabled;
//         setIsVideoOff(!videoTrack.enabled);
//       }
//     }
//   };

//   const shareStream = async () => {
//     const shareData = {
//       title: `🔴 LIVE: ${liveTitle}`,
//       text: `Watch my live stream now!`,
//       url: `${window.location.origin}/live/${streamId}`
//     };

//     try {
//       if (navigator.share) {
//         await navigator.share(shareData);
//       } else {
//         await navigator.clipboard.writeText(shareData.url);
//         alert('Live stream link copied to clipboard!');
//       }
//     } catch (error) {
//       console.error('Error sharing:', error);
//     }
//   };

//   const approveCohost = (userId) => {
//     socketRef.current.emit('approve-cohost', { streamId, userId });
//     setCohostRequests(prev => prev.filter(r => r.userId !== userId));
//   };

//   const rejectCohost = (userId) => {
//     socketRef.current.emit('reject-cohost', { streamId, userId });
//     setCohostRequests(prev => prev.filter(r => r.userId !== userId));
//   };

//   return (
//     <div className="min-h-screen bg-black text-white">
//       {!isLive ? (
//         <>
//           <div className="sticky top-0 bg-black/95 backdrop-blur-lg border-b border-gray-800 z-10 p-4">
//             <h1 className="text-xl font-bold text-center">Go LIVE</h1>
//             <div className="text-center mt-1">
//               <span className={`text-xs px-2 py-1 rounded-full ${connectionStatus === 'connected' ? 'bg-green-500/20 text-green-400' :
//                 connectionStatus === 'connecting' ? 'bg-yellow-500/20 text-yellow-400' :
//                   connectionStatus === 'error' ? 'bg-red-500/20 text-red-400' :
//                     'bg-gray-500/20 text-gray-400'
//                 }`}>
//                 {connectionStatus === 'connected' ? '🟢 Ready to go live' :
//                   connectionStatus === 'connecting' ? '🟡 Connecting...' :
//                     connectionStatus === 'error' ? '🔴 Connection error' :
//                       '⚫ Connecting to server...'}
//               </span>
//             </div>
//           </div>

//           <div className="p-4">
//             <div className="relative bg-gray-900 rounded-xl aspect-[9/16] mb-6 overflow-hidden">
//               <video
//                 ref={videoRef}
//                 autoPlay
//                 muted
//                 playsInline
//                 className="w-full h-full object-cover"
//               />
//               <div className="absolute top-4 right-4 flex space-x-2">
//                 <button
//                   onClick={toggleVideo}
//                   className={`w-10 h-10 ${isVideoOff ? 'bg-red-500' : 'bg-black/50'} rounded-full flex items-center justify-center transition-colors`}
//                 >
//                   {isVideoOff ? <CameraOff className="w-5 h-5 text-white" /> : <Camera className="w-5 h-5 text-white" />}
//                 </button>
//                 <button
//                   onClick={toggleMute}
//                   className={`w-10 h-10 ${isMuted ? 'bg-red-500' : 'bg-black/50'} rounded-full flex items-center justify-center transition-colors`}
//                 >
//                   {isMuted ? <MicOff className="w-5 h-5 text-white" /> : <Mic className="w-5 h-5 text-white" />}
//                 </button>
//               </div>
//               {!videoRef.current?.srcObject && (
//                 <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
//                   <div className="text-center">
//                     <div className="w-16 h-16 bg-red-500 rounded-full mx-auto mb-4 flex items-center justify-center">
//                       <Camera className="w-8 h-8 text-white" />
//                     </div>
//                     <p className="text-gray-400">Camera preview will appear here</p>
//                   </div>
//                 </div>
//               )}
//             </div>

//             <div className="mb-6">
//               <label className="block text-sm font-semibold mb-2">Live title</label>
//               <input
//                 type="text"
//                 placeholder="What's your live stream about?"
//                 value={liveTitle}
//                 onChange={(e) => setLiveTitle(e.target.value)}
//                 className="w-full bg-gray-900 text-white p-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500"
//                 maxLength={100}
//               />
//               <p className="text-gray-400 text-sm mt-1">{liveTitle.length}/100</p>
//             </div>

//             <button
//               onClick={startLive}
//               disabled={!liveTitle.trim() || connectionStatus !== 'connected'}
//               className="w-full bg-red-500 hover:bg-red-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white py-4 rounded-xl font-bold text-lg transition-colors"
//             >
//               {connectionStatus === 'connecting' ? 'Starting...' : 'Go LIVE'}
//             </button>

//             <div className="mt-8 bg-gray-900 rounded-xl p-4">
//               <h3 className="font-bold mb-3 text-center">Tips for going live</h3>
//               <div className="space-y-3 text-sm text-gray-300">
//                 <div className="flex items-start space-x-3">
//                   <div className="w-2 h-2 bg-red-500 rounded-full mt-2"></div>
//                   <p>Ensure you have a strong internet connection</p>
//                 </div>
//                 <div className="flex items-start space-x-3">
//                   <div className="w-2 h-2 bg-red-500 rounded-full mt-2"></div>
//                   <p>Find good lighting for the best video quality</p>
//                 </div>
//                 <div className="flex items-start space-x-3">
//                   <div className="w-2 h-2 bg-red-500 rounded-full mt-2"></div>
//                   <p>Interact with your viewers to keep them engaged</p>
//                 </div>
//               </div>
//             </div>
//           </div>
//         </>
//       ) : (
//         <div className="relative h-screen bg-gray-900 overflow-hidden">
//           <div
//             className="absolute inset-0 grid"
//             style={{
//               gridTemplateColumns: currentStream?.streams.length === 1 ? '1fr' : '1fr 1fr'
//             }}
//           >
//             {currentStream?.streams.map((s, index) => (
//               <div key={index} className="relative">
//                 {s.user.toString() === localStorage.getItem('userId') ? (
//                   <video
//                     ref={videoRef}
//                     autoPlay
//                     muted
//                     playsInline
//                     className="absolute inset-0 w-full h-full object-cover"
//                   />
//                 ) : (
//                   <video
//                     autoPlay
//                     playsInline
//                     controls={false}
//                     className="absolute inset-0 w-full h-full object-cover"
//                     ref={(el) => {
//                       if (el && s.playbackUrl) {
//                         if (Hls.isSupported()) {
//                           const hls = new Hls();
//                           hls.loadSource(s.playbackUrl);
//                           hls.attachMedia(el);
//                         } else if (el.canPlayType('application/vnd.apple.mpegurl')) {
//                           el.src = s.playbackUrl;
//                         }
//                       }
//                     }}
//                   />
//                 )}
//                 <div className="absolute top-2 left-2 bg-black/50 p-1 rounded text-sm">
//                   @{s.user.username}
//                 </div>
//               </div>
//             ))}
//           </div>
//           <div className="absolute inset-0 pointer-events-none overflow-hidden">
//             {hearts.map(heart => (
//               <div
//                 key={heart.id}
//                 className="absolute bottom-32 animate-pulse"
//                 style={{
//                   left: `${heart.x}%`,
//                   animation: 'heartFloat 3s ease-out forwards'
//                 }}
//               >
//                 <Heart className="w-8 h-8 text-red-500 fill-red-500" />
//               </div>

//             ))}
//           </div>
//           <div className="absolute top-4 left-4 z-20">
//             <div className="bg-red-500 px-3 py-1 rounded-full flex items-center space-x-2">
//               <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
//               <span className="text-white font-bold text-sm">LIVE</span>
//               <span className="text-white font-bold text-sm">{viewers}</span>
//             </div>
//           </div>
//           <div className="absolute top-4 right-4 z-20 flex space-x-2">
//             {cohostRequests.length > 0 && (
//               <button
//                 onClick={() => setShowRequestsModal(true)}
//                 className="bg-blue-500 px-3 py-2 rounded-full text-white"
//               >
//                 Requests ({cohostRequests.length})
//               </button>
//             )}
//             <button
//               onClick={shareStream}
//               className="bg-black/50 backdrop-blur-sm px-3 py-2 rounded-full text-white"
//             >
//               <Share2 className="w-4 h-4" />
//             </button>
//             <button
//               onClick={stopStream}
//               className="bg-red-500 hover:bg-red-600 px-4 py-2 rounded-full text-white font-semibold transition-colors"
//             >
//               End
//             </button>
//           </div>
//           <div className="absolute bottom-24 left-0 right-0 p-4 pointer-events-none">
//             <div className="bg-black/30 backdrop-blur-sm rounded-xl p-3 max-h-40 overflow-y-auto pointer-events-auto">
//               <div className="space-y-2">
//                 {comments.slice(-5).map((comment, index) => (
//                   <div key={index} className="flex items-center space-x-2">
//                     <div className={`w-6 h-6 rounded-full ${['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-pink-500', 'bg-yellow-500'][index % 5]
//                       }`}></div>
//                     <span className="text-white font-semibold text-sm">{comment.username || 'Anonymous'}</span>
//                     <span className="text-gray-300 text-sm">{comment.text}</span>
//                   </div>
//                 ))}
//                 {comments.length === 0 && (
//                   <div className="text-center text-gray-400 py-4">
//                     <MessageCircle className="w-6 h-6 mx-auto mb-2" />
//                     <p className="text-sm">No comments yet</p>
//                   </div>
//                 )}
//               </div>
//             </div>
//           </div>
//           <div className="absolute bottom-4 left-4 right-4 flex justify-between items-center">
//             <div className="flex space-x-2">
//               <button
//                 onClick={toggleMute}
//                 className={`w-12 h-12 ${isMuted ? 'bg-red-500' : 'bg-black/50'} backdrop-blur-sm rounded-full flex items-center justify-center transition-colors`}
//               >
//                 {isMuted ? <MicOff className="w-6 h-6 text-white" /> : <Mic className="w-6 h-6 text-white" />}
//               </button>
//               <button
//                 onClick={toggleVideo}
//                 className={`w-12 h-12 ${isVideoOff ? 'bg-red-500' : 'bg-black/50'} backdrop-blur-sm rounded-full flex items-center justify-center transition-colors`}
//               >
//                 {isVideoOff ? <CameraOff className="w-6 h-6 text-white" /> : <Camera className="w-6 h-6 text-white" />}
//               </button>
//             </div>
//             <button
//               onClick={sendHeart}
//               className="w-12 h-12 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center"
//             >
//               <Heart className="w-6 h-6 text-red-500" />
//             </button>
//           </div>
//           <div className="absolute bottom-20 left-4 right-20">
//             <div className="flex items-center space-x-2">
//               <div className="flex-1 relative">
//                 <input
//                   type="text"
//                   value={newComment}
//                   onChange={(e) => setNewComment(e.target.value)}
//                   onKeyPress={(e) => {
//                     if (e.key === 'Enter') {
//                       e.preventDefault();
//                       sendComment(e);
//                     }
//                   }}
//                   placeholder="Say something..."
//                   className="w-full px-4 py-2 pr-12 bg-black/50 backdrop-blur-sm border border-gray-600 rounded-full focus:outline-none focus:ring-2 focus:ring-red-500 text-white placeholder-gray-400"
//                 />
//                 <button
//                   onClick={sendComment}
//                   disabled={!newComment.trim()}
//                   className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1.5 rounded-full bg-red-500 text-white disabled:bg-gray-600 disabled:cursor-not-allowed hover:bg-red-600 transition-colors"
//                 >
//                   <Send className="w-4 h-4" />
//                 </button>
//               </div>
//             </div>
//           </div>
//           {showRequestsModal && (
//             <div className="absolute inset-0 bg-black/50 z-30 flex items-center justify-center">
//               <div className="bg-gray-800 p-4 rounded-xl max-w-sm w-full">
//                 <h3 className="font-bold mb-4 text-center">Co-host Requests</h3>
//                 {cohostRequests.map(r => (
//                   <div key={r.userId} className="flex items-center justify-between mb-2">
//                     <span className="text-white">@{r.username}</span>
//                     <div className="space-x-2">
//                       <button onClick={() => approveCohost(r.userId)} className="bg-green-500 px-2 py-1 rounded text-sm">
//                         Approve
//                       </button>
//                       <button onClick={() => rejectCohost(r.userId)} className="bg-red-500 px-2 py-1 rounded text-sm">
//                         Reject
//                       </button>
//                     </div>
//                   </div>
//                 ))}
//                 {cohostRequests.length === 0 && <p className="text-center text-gray-400">No requests</p>}
//                 <button onClick={() => setShowRequestsModal(false)} className="w-full mt-4 bg-gray-500 py-2 rounded font-semibold">
//                   Close
//                 </button>
//               </div>
//             </div>
//           )}
//           <style jsx>{`
//             @keyframes heartFloat {
//               0% {
//                 transform: translateY(0) scale(1);
//                 opacity: 1;
//               }
//               50% {
//                 transform: translateY(-100px) scale(1.2);
//                 opacity: 0.8;
//               }
//               100% {
//                 transform: translateY(-200px) scale(0.8);
//                 opacity: 0;
//               }
//             }
//           `}</style>
//         </div>
//       )}
//     </div>
//   );
// };

// export default LiveScreen;

import { useRef, useState } from 'react';
import { connect, createLocalTracks } from 'livekit-client';

export default function LiveScreen() {
  const videoRef = useRef(null);
  const [isLive, setIsLive] = useState(false);

  const startLive = async () => {
    const resp = await fetch('/api/live/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'My Live', userId: '123' }),
    });
    const { token, roomName } = await resp.json();

    // connect to LiveKit
    const room = await connect(process.env.REACT_APP_LIVEKIT_URL, token);

    // create local tracks
    const tracks = await createLocalTracks({ audio: true, video: true });
    tracks.forEach(track => room.localParticipant.publishTrack(track));

    // show preview
    if (videoRef.current) {
      const ms = new MediaStream(tracks.map(t => t.mediaStreamTrack));
      videoRef.current.srcObject = ms;
      videoRef.current.play();
    }

    setIsLive(true);
  };

  return (
    <div>
      <video ref={videoRef} autoPlay playsInline muted className="w-full h-full" />
      <button onClick={startLive} disabled={isLive}>
        {isLive ? 'Live!' : 'Go Live'}
      </button>
    </div>
  );
}
