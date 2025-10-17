// import React, { useState, useEffect, useRef } from 'react';
// import { Camera, Radio, Users, X, Mic, MicOff, Video, VideoOff, MessageCircle, Heart } from 'lucide-react';
// import io from 'socket.io-client';

// let Room, RoomEvent, Track, DataPacket_Kind;

// const loadLiveKit = async () => {
//   try {
//     const livekit = await import('livekit-client');
//     Room = livekit.Room;
//     RoomEvent = livekit.RoomEvent;
//     Track = livekit.Track;
//     DataPacket_Kind = livekit.DataPacket_Kind;
//     return true;
//   } catch (err) {
//     console.error('LiveKit not installed. Run: npm install livekit-client');
//     return false;
//   }
// };

// const API_URL = 'https://theclipstream-backend.onrender.com/api';
// const SOCKET_URL = 'https://theclipstream-backend.onrender.com';

// const HostLiveStream = ({ onBack }) => {
//   const [isLive, setIsLive] = useState(false);
//   const [streamData, setStreamData] = useState(null);
//   const [title, setTitle] = useState('');
//   const [description, setDescription] = useState('');
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState('');
//   const [viewerCount, setViewerCount] = useState(0);
//   const [isCameraOn, setIsCameraOn] = useState(true);
//   const [isMicOn, setIsMicOn] = useState(true);
//   const [localStream, setLocalStream] = useState(null);
//   const [liveKitRoom, setLiveKitRoom] = useState(null);
//   const [liveKitReady, setLiveKitReady] = useState(false);
//   const [comments, setComments] = useState([]);
//   const [hearts, setHearts] = useState([]);
//   const [products, setProducts] = useState([]);
//   const [newProduct, setNewProduct] = useState({
//     type: 'product',
//     name: '',
//     description: '',
//     price: 0,
//     imageUrl: '',
//     link: ''
//   });
//   const [orders, setOrders] = useState([]);
//   const [coinBalance, setCoinBalance] = useState(0);
//   const [socket, setSocket] = useState(null);
  
//   const videoRef = useRef(null);
//   const localVideoRef = useRef(null);
//   const commentsEndRef = useRef(null);

//   useEffect(() => {
//     loadLiveKit().then(setLiveKitReady);
    
//     return () => {
//       if (localStream) {
//         localStream.getTracks().forEach(track => track.stop());
//       }
//       if (liveKitRoom) {
//         liveKitRoom.disconnect();
//       }
//       if (socket) {
//         socket.disconnect();
//       }
//     };
//   }, []);

//   useEffect(() => {
//     if (!isLive) {
//       startCameraPreview();
//     }
//   }, [isLive]);

//   useEffect(() => {
//     if (commentsEndRef.current) {
//       commentsEndRef.current.scrollIntoView({ behavior: 'smooth' });
//     }
//   }, [comments]);

//   // Socket connection and listeners
//   // useEffect(() => {
//   //   if (isLive && streamData?.streamId) {
//   //     const newSocket = io(SOCKET_URL);
      
//   //     newSocket.emit('join-stream', { 
//   //       streamId: streamData.streamId, 
//   //       isStreamer: true 
//   //     });

//   //     newSocket.on('new-order', (data) => {
//   //       setOrders(prev => [...prev, data.order]);
//   //     });

//   //     newSocket.on('coins-updated', (data) => {
//   //       setCoinBalance(data.coinBalance);
//   //     });

//   //     setSocket(newSocket);

//   //     // Fetch initial data
//   //     fetchInitialOrders();
//   //     setProducts(streamData.stream.products?.map((p, i) => ({ ...p, index: i })) || []);
//   //     setCoinBalance(streamData.stream.coinBalance || 0);

//   //     return () => {
//   //       newSocket.disconnect();
//   //     };
//   //   }
//   // }, [isLive, streamData?.streamId]);

//   useEffect(() => {
//     if (isLive && streamData?.streamId) {
//       const newSocket = io(SOCKET_URL, {
//         auth: {
//           token: localStorage.getItem('token')
//         }
//       });
      
//       newSocket.on('connect', () => {
//         console.log('Socket connected');
        
//         // Join the stream
//         newSocket.emit('join-stream', { 
//           streamId: streamData.streamId, 
//           isStreamer: true 
//         });

//         // Subscribe to earnings for this stream
//         newSocket.emit('subscribe-to-stream-earnings', {
//           streamId: streamData.streamId
//         });
//       });

//       // Listen for new orders from viewers
//       newSocket.on('new-order', (data) => {
//         console.log('New order received:', data);
//         setOrders(prev => {
//           const orderExists = prev.some(o => 
//             o._id === data.order._id || 
//             (o.productIndex === data.order.productIndex && 
//              o.buyer === data.order.buyer)
//           );
//           return orderExists ? prev : [...prev, {
//             ...data.order,
//             buyerUsername: data.buyerUsername || data.order.buyer?.username
//           }];
//         });

//         // Update coin balance
//         if (data.totalEarnings !== undefined) {
//           setCoinBalance(data.totalEarnings);
//         }
//       });

//       // Listen for coin updates
//       newSocket.on('coins-updated', (data) => {
//         console.log('Coins updated:', data);
//         if (data.streamId === streamData.streamId) {
//           setCoinBalance(data.coinBalance);
//           // Show a notification
//           setError(`Earned ${data.earnedAmount} coins from a purchase!`);
//           setTimeout(() => setError(''), 3000);
//         }
//       });

//       // Listen for product updates
//       newSocket.on('product-list-updated', (data) => {
//         console.log('Product list updated:', data);
//         setProducts(data.products || []);
//       });

//       // Error handling
//       newSocket.on('error', (error) => {
//         console.error('Socket error:', error);
//       });

//       setSocket(newSocket);

//       // Fetch initial data
//       fetchInitialOrders();
//       setProducts(streamData.stream.products?.map((p, i) => ({ ...p, index: i })) || []);
//       setCoinBalance(streamData.stream.points || 0);

//       return () => {
//         newSocket.disconnect();
//       };
//     }
//   }, [isLive, streamData?.streamId]);

  

//   // const fetchInitialOrders = async () => {
//   //   try {
//   //     const token = localStorage.getItem('token');
//   //     const response = await fetch(`${API_URL}/live/${streamData.streamId}/orders`, {
//   //       headers: {
//   //         ...(token && { 'Authorization': `Bearer ${token}` })
//   //       }
//   //     });
//   //     const data = await response.json();
//   //     if (response.ok) {
//   //       setOrders(data.orders.map(o => ({ ...o, buyerUsername: o.buyer.username })) || []);
//   //     }
//   //   } catch (err) {
//   //     console.error('Failed to fetch initial orders:', err);
//   //   }
//   // };

//   // Also add this new function to fetch and display orders with buyer info
//  const fetchInitialOrders = async () => {
//     try {
//       const token = localStorage.getItem('token');
//       const response = await fetch(`${API_URL}/live/${streamData.streamId}/orders`, {
//         headers: {
//           ...(token && { 'Authorization': `Bearer ${token}` })
//         }
//       });
//       const data = await response.json();
//       if (response.ok) {
//         // Map orders to include buyer username
//         const ordersWithBuyerInfo = data.orders.map(o => ({
//           ...o,
//           buyerUsername: o.buyer?.username || 'Unknown Buyer'
//         })) || [];
//         setOrders(ordersWithBuyerInfo);
//       }
//     } catch (err) {
//       console.error('Failed to fetch initial orders:', err);
//     }
//   };
//   const startCameraPreview = async () => {
//     try {
//       const stream = await navigator.mediaDevices.getUserMedia({
//         video: {
//           width: { ideal: 1280 },
//           height: { ideal: 720 },
//           facingMode: 'user',
//           frameRate: { ideal: 30 }
//         },
//         audio: {
//           echoCancellation: true,
//           noiseSuppression: true,
//           autoGainControl: true
//         }
//       });

//       setLocalStream(stream);
//       if (localVideoRef.current) {
//         localVideoRef.current.srcObject = stream;
//         localVideoRef.current.muted = true;
//         await localVideoRef.current.play();
//       }
//     } catch (err) {
//       console.error('Camera preview error:', err);
//       setError('Could not access camera/microphone. Please grant permissions.');
//     }
//   };

//   const startStream = async () => {
//     if (!title.trim()) {
//       setError('Please enter a title');
//       return;
//     }

//     if (!liveKitReady) {
//       setError('LiveKit not loaded. Install: npm install livekit-client');
//       return;
//     }

//     setLoading(true);
//     setError('');

//     try {
//       if (!localStream) {
//         await startCameraPreview();
//       }

//       const token = localStorage.getItem('token');
//       const response = await fetch(`${API_URL}/live/create`, {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//           ...(token && { 'Authorization': `Bearer ${token}` })
//         },
//         body: JSON.stringify({
//           title: title.trim(),
//           description: description.trim(),
//           privacy: 'public'
//         })
//       });

//       const data = await response.json();
      
//       if (!response.ok) {
//         throw new Error(data.msg || 'Failed to create stream');
//       }

//       console.log('Stream created:', data);
//       setStreamData(data);

//       const room = new Room({
//         adaptiveStream: true,
//         dynacast: true,
//         videoCaptureDefaults: {
//           resolution: { width: 1280, height: 720, frameRate: 30 }
//         },
//         audioCaptureDefaults: {
//           echoCancellation: true,
//           noiseSuppression: true,
//         }
//       });

//       console.log('Connecting to LiveKit room...');
//       await room.connect(data.roomUrl, data.publishToken);
//       console.log('✅ Connected to LiveKit room');

//       // Listen for data messages from viewers
//       room.on(RoomEvent.DataReceived, (payload, participant) => {
//         const decoder = new TextDecoder();
//         const message = JSON.parse(decoder.decode(payload));
        
//         console.log('📨 Data received from', participant?.identity, message);
        
//         if (message.type === 'comment') {
//           setComments(prev => [...prev, {
//             id: Date.now() + Math.random(),
//             username: participant?.identity || 'Viewer',
//             text: message.text,
//             timestamp: new Date()
//           }]);
//         } else if (message.type === 'heart') {
//           const heartId = Date.now() + Math.random();
//           setHearts(prev => [...prev, { 
//             id: heartId, 
//             x: Math.random() * 80 + 10,
//             from: participant?.identity 
//           }]);
//           setTimeout(() => {
//             setHearts(prev => prev.filter(h => h.id !== heartId));
//           }, 3000);
//         }
//       });

//       // Track viewer count
//       room.on(RoomEvent.ParticipantConnected, () => {
//         setViewerCount(room.remoteParticipants.size);
//         console.log('👤 Viewer joined. Total:', room.remoteParticipants.size);
//       });

//       room.on(RoomEvent.ParticipantDisconnected, () => {
//         setViewerCount(room.remoteParticipants.size);
//         console.log('👋 Viewer left. Total:', room.remoteParticipants.size);
//       });

//       await room.localParticipant.enableCameraAndMicrophone();
//       console.log('✅ Camera and microphone enabled');

//       room.on(RoomEvent.LocalTrackPublished, (publication) => {
//         console.log('Track published:', publication.source);
        
//         if (publication.source === Track.Source.Camera) {
//           const localVideoTrack = publication.track;
//           if (localVideoTrack && localVideoTrack.mediaStreamTrack) {
//             const mediaStream = new MediaStream([localVideoTrack.mediaStreamTrack]);
            
//             if (videoRef.current) {
//               videoRef.current.srcObject = mediaStream;
//               videoRef.current.muted = true;
//               videoRef.current.play()
//                 .then(() => {
//                   console.log('✅ LiveKit video playing');
//                   setTimeout(() => {
//                     if (localVideoRef.current) {
//                       localVideoRef.current.style.display = 'none';
//                     }
//                   }, 300);
//                 })
//                 .catch(err => console.error('Video play error:', err));
//             }
//           }
//         }
//       });

//       setTimeout(() => {
//         const camPublication = room.localParticipant.getTrackPublication(Track.Source.Camera);
//         if (camPublication && camPublication.track && videoRef.current) {
//           const mediaStream = new MediaStream([camPublication.track.mediaStreamTrack]);
//           videoRef.current.srcObject = mediaStream;
//           videoRef.current.muted = true;
//           videoRef.current.play()
//             .then(() => {
//               if (localVideoRef.current) {
//                 localVideoRef.current.style.display = 'none';
//               }
//             })
//             .catch(err => console.error('Manual attach error:', err));
//         }
//       }, 1000);

//       setLiveKitRoom(room);
//       setViewerCount(room.remoteParticipants.size);
//       setIsLive(true);
      
//     } catch (err) {
//       console.error('Error starting stream:', err);
//       setError(err.message);
//       if (localStream) {
//         localStream.getTracks().forEach(track => track.stop());
//         setLocalStream(null);
//       }
//     } finally {
//       setLoading(false);
//     }
//   };

//   const endStream = async () => {
//     if (!streamData?.streamId) return;

//     try {
//       const token = localStorage.getItem('token');
//       await fetch(`${API_URL}/live/${streamData.streamId}/end`, {
//         method: 'POST',
//         headers: {
//           ...(token && { 'Authorization': `Bearer ${token}` })
//         }
//       });

//       if (liveKitRoom) {
//         await liveKitRoom.disconnect();
//         setLiveKitRoom(null);
//       }

//       if (localStream) {
//         localStream.getTracks().forEach(track => track.stop());
//         setLocalStream(null);
//       }

//       if (localVideoRef.current) {
//         localVideoRef.current.style.display = 'block';
//       }

//       if (socket) {
//         socket.disconnect();
//       }

//       setIsLive(false);
//       setStreamData(null);
//       setTitle('');
//       setDescription('');
//       setComments([]);
//       setHearts([]);
//       setProducts([]);
//       setOrders([]);
//       setCoinBalance(0);
      
//       onBack();
//     } catch (err) {
//       console.error('Error ending stream:', err);
//     }
//   };

//   const toggleCamera = async () => {
//     if (liveKitRoom && isLive) {
//       const isEnabled = liveKitRoom.localParticipant.isCameraEnabled;
//       await liveKitRoom.localParticipant.setCameraEnabled(!isEnabled);
//       setIsCameraOn(!isEnabled);
//     } else if (localStream) {
//       const videoTrack = localStream.getVideoTracks()[0];
//       if (videoTrack) {
//         videoTrack.enabled = !videoTrack.enabled;
//         setIsCameraOn(videoTrack.enabled);
//       }
//     }
//   };

//   const toggleMic = async () => {
//     if (liveKitRoom && isLive) {
//       const isEnabled = liveKitRoom.localParticipant.isMicrophoneEnabled;
//       await liveKitRoom.localParticipant.setMicrophoneEnabled(!isEnabled);
//       setIsMicOn(!isEnabled);
//     } else if (localStream) {
//       const audioTrack = localStream.getAudioTracks()[0];
//       if (audioTrack) {
//         audioTrack.enabled = !audioTrack.enabled;
//         setIsMicOn(audioTrack.enabled);
//       }
//     }
//   };

//   if (isLive) {
//     return (
//       <div className="min-h-screen bg-gray-900 text-white p-4">
//         <style>{`
//           @keyframes float-up {
//             0% { transform: translateY(0) scale(1); opacity: 1; }
//             100% { transform: translateY(-100vh) scale(1.5); opacity: 0; }
//           }
//         `}</style>

//         <div className="max-w-6xl mx-auto">
//           <div className="bg-gray-800 rounded-lg p-4 mb-4">
//             <div className="flex items-center justify-between">
//               <div className="flex items-center gap-3">
//                 <div className="flex items-center gap-2 bg-red-600 px-3 py-1 rounded-full">
//                   <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
//                   <span className="text-sm font-semibold">LIVE</span>
//                 </div>
//                 <div className="flex items-center gap-2 text-gray-300">
//                   <Users className="w-4 h-4" />
//                   <span className="text-sm">{viewerCount} viewers</span>
//                 </div>
//               </div>
//               <button
//                 onClick={endStream}
//                 className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg flex items-center gap-2"
//               >
//                 <X className="w-4 h-4" />
//                 End Stream
//               </button>
//             </div>
//             <h2 className="text-xl font-bold mt-3">{streamData?.stream?.title}</h2>
//           </div>

//           <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
//             <div className="lg:col-span-3">
//               <div className="bg-black rounded-lg aspect-video mb-4 relative overflow-hidden">
//                 <video
//                   ref={videoRef}
//                   autoPlay
//                   playsInline
//                   muted
//                   className="w-full h-full object-cover"
//                   style={{ position: 'absolute', top: 0, left: 0, zIndex: 2 }}
//                 />
//                 <video
//                   ref={localVideoRef}
//                   autoPlay
//                   playsInline
//                   muted
//                   className="w-full h-full object-cover"
//                   style={{ position: 'absolute', top: 0, left: 0, zIndex: 1 }}
//                 />
//                 {!isCameraOn && (
//                   <div className="absolute inset-0 flex items-center justify-center bg-gray-900" style={{ zIndex: 10 }}>
//                     <VideoOff className="w-16 h-16 text-gray-600" />
//                   </div>
//                 )}

//                 {/* Hearts Animation */}
//                 {hearts.map((heart) => (
//                   <div
//                     key={heart.id}
//                     className="absolute pointer-events-none text-3xl"
//                     style={{
//                       left: `${heart.x}%`,
//                       bottom: '0',
//                       animation: 'float-up 3s ease-out forwards',
//                       zIndex: 20
//                     }}
//                   >
//                     ❤️
//                   </div>
//                 ))}
//               </div>

//               <div className="bg-gray-800 rounded-lg p-4 mb-4 flex items-center justify-center gap-4">
//                 <button
//                   onClick={toggleCamera}
//                   className={`p-4 rounded-full transition-colors ${isCameraOn ? 'bg-gray-700 hover:bg-gray-600' : 'bg-red-600 hover:bg-red-700'}`}
//                 >
//                   {isCameraOn ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
//                 </button>
//                 <button
//                   onClick={toggleMic}
//                   className={`p-4 rounded-full transition-colors ${isMicOn ? 'bg-gray-700 hover:bg-gray-600' : 'bg-red-600 hover:bg-red-700'}`}
//                 >
//                   {isMicOn ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
//                 </button>
//               </div>

//               <div className="bg-gray-800 rounded-lg p-4 mb-4">
//                 <h3 className="font-semibold mb-4">Add Product/Ad</h3>
//                 <select 
//                   value={newProduct.type}
//                   onChange={(e) => setNewProduct({...newProduct, type: e.target.value})}
//                   className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 mb-2 focus:outline-none focus:border-blue-500"
//                 >
//                   <option value="product">Product</option>
//                   <option value="ad">Ad</option>
//                 </select>
//                 <input
//                   placeholder="Name"
//                   value={newProduct.name}
//                   onChange={(e) => setNewProduct({...newProduct, name: e.target.value})}
//                   className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 mb-2 focus:outline-none focus:border-blue-500"
//                 />
//                 <input
//                   placeholder="Description"
//                   value={newProduct.description}
//                   onChange={(e) => setNewProduct({...newProduct, description: e.target.value})}
//                   className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 mb-2 focus:outline-none focus:border-blue-500"
//                 />
//                 <input
//                   type="number"
//                   placeholder="Price"
//                   value={newProduct.price}
//                   onChange={(e) => setNewProduct({...newProduct, price: parseFloat(e.target.value)})}
//                   className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 mb-2 focus:outline-none focus:border-blue-500"
//                 />
//                 <input
//                   placeholder="Image URL"
//                   value={newProduct.imageUrl}
//                   onChange={(e) => setNewProduct({...newProduct, imageUrl: e.target.value})}
//                   className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 mb-2 focus:outline-none focus:border-blue-500"
//                 />
//                 <input
//                   placeholder="Link (for ad or product)"
//                   value={newProduct.link}
//                   onChange={(e) => setNewProduct({...newProduct, link: e.target.value})}
//                   className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 mb-2 focus:outline-none focus:border-blue-500"
//                 />
//                 <button
//                   onClick={async () => {
//                     try {
//                       const token = localStorage.getItem('token');
//                       const response = await fetch(`${API_URL}/live/${streamData.streamId}/add-product`, {
//                         method: 'POST',
//                         headers: {
//                           'Content-Type': 'application/json',
//                           ...(token && { 'Authorization': `Bearer ${token}` })
//                         },
//                         body: JSON.stringify(newProduct)
//                       });
//                       const data = await response.json();
//                       if (response.ok) {
//                         setProducts([...products, { ...data.product, index: products.length }]);
//                         setNewProduct({type: 'product', name: '', description: '', price: 0, imageUrl: '', link: ''});
//                       } else {
//                         setError(data.msg);
//                       }
//                     } catch (err) {
//                       setError('Failed to add product');
//                     }
//                   }}
//                   className="w-full bg-blue-600 hover:bg-blue-700 py-2 rounded-lg font-semibold mt-2"
//                 >
//                   Add
//                 </button>
                
//                 <div className="mt-4">
//                   <h4 className="font-semibold mb-2">Added Items</h4>
//                   {products.map((p, i) => (
//                     <div key={i} className="bg-gray-700 rounded-lg p-2 mb-2">
//                       <span>{p.name} - ${p.price} ({Math.ceil(p.price * 100)} coins)</span>
//                     </div>
//                   ))}
//                 </div>
//               </div>

//               <div className="bg-gray-800 rounded-lg p-4">
//                 <h3 className="font-semibold mb-2">Orders</h3>
//                 {orders.length === 0 ? (
//                   <p className="text-gray-400">No orders yet</p>
//                 ) : (
//                   orders.map((o, i) => (
//                     <div key={i} className="bg-gray-700 rounded-lg p-2 mb-2">
//                       <span>{products[o.productIndex]?.name} - Quantity: {o.quantity} by {o.buyerUsername}</span>
//                     </div>
//                   ))
//                 )}
//               </div>

//               <div className="bg-gray-800 rounded-lg p-4 mt-4">
//                 <h3 className="font-semibold mb-2">Stream Details</h3>
//                 <div className="space-y-2 text-sm">
//                   <p className="text-gray-400">Stream ID: <span className="text-white font-mono text-xs">{streamData?.streamId}</span></p>
//                   <p className="text-gray-400">Status: <span className="text-green-400">● Live</span></p>
//                   <p className="text-gray-400">Room: <span className="text-white">Connected</span></p>
//                   <p className="text-gray-400">Active Viewers: <span className="text-white">{viewerCount}</span></p>
//                   <p className="text-gray-400">Coins Earned: <span className="text-yellow-400">{coinBalance}</span></p>
//                 </div>
//               </div>
//             </div>

//             {/* Live Chat Panel */}
//             <div className="lg:col-span-1">
//               <div className="bg-gray-800 rounded-lg h-[600px] flex flex-col">
//                 <div className="p-4 border-b border-gray-700">
//                   <h3 className="font-semibold flex items-center gap-2">
//                     <MessageCircle className="w-5 h-5" />
//                     Live Chat
//                   </h3>
//                 </div>

//                 <div className="flex-1 overflow-y-auto p-4 space-y-3">
//                   {comments.map((c) => (
//                     <div key={c.id} className="text-sm">
//                       <span className="font-semibold text-blue-400">@{c.username}: </span>
//                       <span className="text-gray-300">{c.text}</span>
//                     </div>
//                   ))}
//                   {comments.length === 0 && (
//                     <div className="text-center text-gray-500 mt-20">
//                       <MessageCircle className="w-12 h-12 mx-auto mb-3 text-gray-600" />
//                       <p className="text-sm">Waiting for comments...</p>
//                     </div>
//                   )}
//                   <div ref={commentsEndRef} />
//                 </div>

//                 <div className="p-4 border-t border-gray-700">
//                   <div className="flex items-center gap-2 text-gray-400 text-xs">
//                     <Heart className="w-4 h-4 text-pink-500" />
//                     <span>Viewers can send hearts and comments</span>
//                   </div>
//                 </div>
//               </div>
//             </div>
//           </div>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="min-h-screen bg-gray-900 text-white p-4">
//       <button
//         onClick={onBack}
//         className="mb-4 bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded-lg"
//       >
//         ← Back to Streams
//       </button>

//       <div className="max-w-md mx-auto mt-10">
//         <div className="bg-gray-800 rounded-lg p-6">
//           <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
//             <Radio className="w-6 h-6 text-red-500" />
//             Start Live Stream
//           </h1>

//           {error && (
//             <div className="bg-red-500/20 border border-red-500 text-red-500 p-3 rounded mb-4 text-sm">
//               {error}
//             </div>
//           )}

//           {!liveKitReady && (
//             <div className="bg-yellow-500/20 border border-yellow-500 text-yellow-500 p-3 rounded mb-4 text-sm">
//               ⚠️ LiveKit not loaded. Run: <code className="bg-black/30 px-1 rounded">npm install livekit-client</code>
//             </div>
//           )}

//           <div className="relative bg-black rounded-lg aspect-video mb-6 overflow-hidden">
//             <video
//               ref={localVideoRef}
//               autoPlay
//               muted
//               playsInline
//               className="w-full h-full object-cover"
//             />
//             <div className="absolute top-4 right-4 flex space-x-2">
//               <button
//                 onClick={toggleCamera}
//                 className={`w-10 h-10 backdrop-blur-sm rounded-full flex items-center justify-center transition-colors ${isCameraOn ? 'bg-black/50 hover:bg-black/70' : 'bg-red-500 hover:bg-red-600'}`}
//               >
//                 {isCameraOn ? <Camera className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
//               </button>
//               <button
//                 onClick={toggleMic}
//                 className={`w-10 h-10 backdrop-blur-sm rounded-full flex items-center justify-center transition-colors ${isMicOn ? 'bg-black/50 hover:bg-black/70' : 'bg-red-500 hover:bg-red-600'}`}
//               >
//                 {isMicOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
//               </button>
//             </div>
//             {!localStream && (
//               <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
//                 <div className="text-center">
//                   <Camera className="w-12 h-12 mx-auto mb-3 text-gray-600" />
//                   <p className="text-gray-400 text-sm">Requesting camera access...</p>
//                 </div>
//               </div>
//             )}
//           </div>

//           <div className="space-y-4">
//             <div>
//               <label className="block text-sm font-medium mb-2">Stream Title *</label>
//               <input
//                 type="text"
//                 value={title}
//                 onChange={(e) => setTitle(e.target.value)}
//                 placeholder="What's your stream about?"
//                 className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
//                 maxLength={100}
//               />
//               <p className="text-gray-400 text-xs mt-1">{title.length}/100</p>
//             </div>

//             <div>
//               <label className="block text-sm font-medium mb-2">Description (optional)</label>
//               <textarea
//                 value={description}
//                 onChange={(e) => setDescription(e.target.value)}
//                 placeholder="Add more details..."
//                 className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500 resize-none"
//                 rows={3}
//                 maxLength={500}
//               />
//             </div>

//             <button
//               onClick={startStream}
//               disabled={loading || !liveKitReady}
//               className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed py-3 rounded-lg font-semibold transition-colors"
//             >
//               {loading ? 'Starting...' : '🔴 Go LIVE'}
//             </button>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default HostLiveStream;


import React, { useState, useEffect, useRef } from 'react';
import { Camera, Radio, Users, X, Mic, MicOff, Video, VideoOff, MessageCircle, Heart } from 'lucide-react';
import io from 'socket.io-client';

let Room, RoomEvent, Track, DataPacket_Kind;

const loadLiveKit = async () => {
  try {
    const livekit = await import('livekit-client');
    Room = livekit.Room;
    RoomEvent = livekit.RoomEvent;
    Track = livekit.Track;
    DataPacket_Kind = livekit.DataPacket_Kind;
    return true;
  } catch (err) {
    console.error('LiveKit not installed. Run: npm install livekit-client');
    return false;
  }
};

const API_URL = 'https://theclipstream-backend.onrender.com/api';
const SOCKET_URL = 'https://theclipstream-backend.onrender.com';

const HostLiveStream = ({ onBack }) => {
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
  const [comments, setComments] = useState([]);
  const [hearts, setHearts] = useState([]);
  const [products, setProducts] = useState([]);
  const [newProduct, setNewProduct] = useState({
    type: 'product',
    name: '',
    description: '',
    price: 0,
    imageUrl: '',
    link: ''
  });
  const [orders, setOrders] = useState([]);
  const [streamEarnings, setStreamEarnings] = useState(0);
  const [socket, setSocket] = useState(null);
  
  const videoRef = useRef(null);
  const localVideoRef = useRef(null);
  const commentsEndRef = useRef(null);

  useEffect(() => {
    loadLiveKit().then(setLiveKitReady);
    
    return () => {
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
      if (liveKitRoom) {
        liveKitRoom.disconnect();
      }
      if (socket) {
        socket.disconnect();
      }
    };
  }, []);

  useEffect(() => {
    if (!isLive) {
      startCameraPreview();
    }
  }, [isLive]);

  useEffect(() => {
    if (commentsEndRef.current) {
      commentsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [comments]);

  useEffect(() => {
    if (isLive && streamData?.streamId) {
      const newSocket = io(SOCKET_URL, {
        auth: {
          token: localStorage.getItem('token')
        }
      });
      
      newSocket.on('connect', () => {
        console.log('Socket connected');
        
        newSocket.emit('join-stream', { 
          streamId: streamData.streamId, 
          isStreamer: true 
        });
      });

      newSocket.on('new-order', (data) => {
        console.log('New order received:', data);
        if (data.streamId === streamData.streamId) {
          setOrders(prev => {
            const orderExists = prev.some(o => 
              (o.productIndex === data.order.productIndex && 
               o.buyer === data.order.buyer)
            );
            return orderExists ? prev : [...prev, {
              ...data.order,
              buyerUsername: data.buyerUsername || data.order.buyer?.username
            }];
          });

          if (data.totalEarnings !== undefined) {
            setStreamEarnings(data.totalEarnings);
          }

          setError(`Order received from ${data.buyerUsername}!`);
          setTimeout(() => setError(''), 3000);
        }
      });

      newSocket.on('coins-updated', (data) => {
        console.log('Coins updated:', data);
        if (data.streamId === streamData.streamId) {
          setStreamEarnings(data.streamEarnings || data.earnedAmount);
          
          setError(`Earned ${data.earnedAmount} coins from a purchase!`);
          setTimeout(() => setError(''), 3000);
        }
      });

      newSocket.on('product-added', (data) => {
        console.log('Product added:', data);
        if (data.streamId === streamData.streamId) {
          setProducts(prev => [...prev, { ...data.product, index: data.productIndex }]);
        }
      });

      newSocket.on('error', (error) => {
        console.error('Socket error:', error);
        setError(error.message || 'Connection error');
      });

      setSocket(newSocket);

      fetchInitialData();

      return () => {
        newSocket.disconnect();
      };
    }
  }, [isLive, streamData?.streamId]);

  const fetchInitialData = async () => {
    try {
      const token = localStorage.getItem('token');
      
      const ordersResponse = await fetch(`${API_URL}/live/${streamData.streamId}/orders`, {
        headers: {
          ...(token && { 'Authorization': `Bearer ${token}` })
        }
      });
      const ordersData = await ordersResponse.json();
      if (ordersResponse.ok) {
        setOrders(ordersData.orders.map(o => ({ 
          ...o, 
          buyerUsername: o.buyer?.username || 'Unknown Buyer' 
        })) || []);
      }

      if (streamData?.stream) {
        setProducts(streamData.stream.products?.map((p, i) => ({ ...p, index: i })) || []);
        setStreamEarnings(streamData.stream.points || 0);
      }
    } catch (err) {
      console.error('Failed to fetch initial data:', err);
    }
  };

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

      room.on(RoomEvent.DataReceived, (payload, participant) => {
        const decoder = new TextDecoder();
        const message = JSON.parse(decoder.decode(payload));
        
        console.log('📨 Data received from', participant?.identity, message);
        
        if (message.type === 'comment') {
          setComments(prev => [...prev, {
            id: Date.now() + Math.random(),
            username: participant?.identity || 'Viewer',
            text: message.text,
            timestamp: new Date()
          }]);
        } else if (message.type === 'heart') {
          const heartId = Date.now() + Math.random();
          setHearts(prev => [...prev, { 
            id: heartId, 
            x: Math.random() * 80 + 10,
            from: participant?.identity 
          }]);
          setTimeout(() => {
            setHearts(prev => prev.filter(h => h.id !== heartId));
          }, 3000);
        }
      });

      room.on(RoomEvent.ParticipantConnected, () => {
        setViewerCount(room.remoteParticipants.size);
        console.log('👤 Viewer joined. Total:', room.remoteParticipants.size);
      });

      room.on(RoomEvent.ParticipantDisconnected, () => {
        setViewerCount(room.remoteParticipants.size);
        console.log('👋 Viewer left. Total:', room.remoteParticipants.size);
      });

      await room.localParticipant.enableCameraAndMicrophone();
      console.log('✅ Camera and microphone enabled');

      room.on(RoomEvent.LocalTrackPublished, (publication) => {
        console.log('Track published:', publication.source);
        
        if (publication.source === Track.Source.Camera) {
          const localVideoTrack = publication.track;
          if (localVideoTrack && localVideoTrack.mediaStreamTrack) {
            const mediaStream = new MediaStream([localVideoTrack.mediaStreamTrack]);
            
            if (videoRef.current) {
              videoRef.current.srcObject = mediaStream;
              videoRef.current.muted = true;
              videoRef.current.play()
                .then(() => {
                  console.log('✅ LiveKit video playing');
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
      });

      setTimeout(() => {
        const camPublication = room.localParticipant.getTrackPublication(Track.Source.Camera);
        if (camPublication && camPublication.track && videoRef.current) {
          const mediaStream = new MediaStream([camPublication.track.mediaStreamTrack]);
          videoRef.current.srcObject = mediaStream;
          videoRef.current.muted = true;
          videoRef.current.play()
            .then(() => {
              if (localVideoRef.current) {
                localVideoRef.current.style.display = 'none';
              }
            })
            .catch(err => console.error('Manual attach error:', err));
        }
      }, 1000);

      setLiveKitRoom(room);
      setViewerCount(room.remoteParticipants.size);
      setIsLive(true);
      
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

      if (socket) {
        socket.disconnect();
      }

      setIsLive(false);
      setStreamData(null);
      setTitle('');
      setDescription('');
      setComments([]);
      setHearts([]);
      setProducts([]);
      setOrders([]);
      setStreamEarnings(0);
      
      onBack();
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

  const addProductViaSocket = () => {
    if (!socket) {
      setError('Socket not connected');
      return;
    }

    if (!newProduct.name.trim()) {
      setError('Product name is required');
      return;
    }

    if (newProduct.price <= 0) {
      setError('Product price must be greater than 0');
      return;
    }

    socket.emit('add-product', {
      streamId: streamData.streamId,
      product: newProduct
    });

    setNewProduct({
      type: 'product',
      name: '',
      description: '',
      price: 0,
      imageUrl: '',
      link: ''
    });
  };

  if (isLive) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-4">
        <style>{`
          @keyframes float-up {
            0% { transform: translateY(0) scale(1); opacity: 1; }
            100% { transform: translateY(-100vh) scale(1.5); opacity: 0; }
          }
        `}</style>

        <div className="max-w-6xl mx-auto">
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

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            <div className="lg:col-span-3">
              <div className="bg-black rounded-lg aspect-video mb-4 relative overflow-hidden">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                  style={{ position: 'absolute', top: 0, left: 0, zIndex: 2 }}
                />
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

                {hearts.map((heart) => (
                  <div
                    key={heart.id}
                    className="absolute pointer-events-none text-3xl"
                    style={{
                      left: `${heart.x}%`,
                      bottom: '0',
                      animation: 'float-up 3s ease-out forwards',
                      zIndex: 20
                    }}
                  >
                    ❤️
                  </div>
                ))}
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

              <div className="bg-gray-800 rounded-lg p-4 mb-4">
                <h3 className="font-semibold mb-4">Add Product/Ad</h3>
                <select 
                  value={newProduct.type}
                  onChange={(e) => setNewProduct({...newProduct, type: e.target.value})}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 mb-2 focus:outline-none focus:border-blue-500"
                >
                  <option value="product">Product</option>
                  <option value="ad">Ad</option>
                </select>
                <input
                  placeholder="Name"
                  value={newProduct.name}
                  onChange={(e) => setNewProduct({...newProduct, name: e.target.value})}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 mb-2 focus:outline-none focus:border-blue-500"
                />
                <input
                  placeholder="Description"
                  value={newProduct.description}
                  onChange={(e) => setNewProduct({...newProduct, description: e.target.value})}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 mb-2 focus:outline-none focus:border-blue-500"
                />
                <input
                  type="number"
                  placeholder="Price"
                  value={newProduct.price}
                  onChange={(e) => setNewProduct({...newProduct, price: parseFloat(e.target.value)})}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 mb-2 focus:outline-none focus:border-blue-500"
                />
                <input
                  placeholder="Image URL"
                  value={newProduct.imageUrl}
                  onChange={(e) => setNewProduct({...newProduct, imageUrl: e.target.value})}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 mb-2 focus:outline-none focus:border-blue-500"
                />
                <input
                  placeholder="Link (for ad or product)"
                  value={newProduct.link}
                  onChange={(e) => setNewProduct({...newProduct, link: e.target.value})}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 mb-2 focus:outline-none focus:border-blue-500"
                />
                <button
                  onClick={addProductViaSocket}
                  className="w-full bg-blue-600 hover:bg-blue-700 py-2 rounded-lg font-semibold mt-2"
                >
                  Add via Socket
                </button>
                
                <div className="mt-4">
                  <h4 className="font-semibold mb-2">Added Items ({products.length})</h4>
                  {products.length === 0 ? (
                    <p className="text-gray-400 text-sm">No products added yet</p>
                  ) : (
                    products.map((p, i) => (
                      <div key={i} className="bg-gray-700 rounded-lg p-2 mb-2">
                        <span>{p.name} - ${p.price} ({Math.ceil(p.price * 100)} coins)</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="bg-gray-800 rounded-lg p-4">
                <h3 className="font-semibold mb-2">Orders ({orders.length})</h3>
                {orders.length === 0 ? (
                  <p className="text-gray-400">No orders yet</p>
                ) : (
                  orders.map((o, i) => (
                    <div key={i} className="bg-gray-700 rounded-lg p-2 mb-2">
                      <span>{products[o.productIndex]?.name} - Qty: {o.quantity} by {o.buyerUsername}</span>
                    </div>
                  ))
                )}
              </div>

              <div className="bg-gray-800 rounded-lg p-4 mt-4">
                <h3 className="font-semibold mb-2">Stream Details</h3>
                <div className="space-y-2 text-sm">
                  <p className="text-gray-400">Stream ID: <span className="text-white font-mono text-xs">{streamData?.streamId}</span></p>
                  <p className="text-gray-400">Status: <span className="text-green-400">● Live</span></p>
                  <p className="text-gray-400">Room: <span className="text-white">Connected</span></p>
                  <p className="text-gray-400">Active Viewers: <span className="text-white">{viewerCount}</span></p>
                  <p className="text-gray-400">Stream Earnings: <span className="text-yellow-400">{streamEarnings} coins</span></p>
                </div>
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
                      <span className="font-semibold text-blue-400">@{c.username}: </span>
                      <span className="text-gray-300">{c.text}</span>
                    </div>
                  ))}
                  {comments.length === 0 && (
                    <div className="text-center text-gray-500 mt-20">
                      <MessageCircle className="w-12 h-12 mx-auto mb-3 text-gray-600" />
                      <p className="text-sm">Waiting for comments...</p>
                    </div>
                  )}
                  <div ref={commentsEndRef} />
                </div>

                <div className="p-4 border-t border-gray-700">
                  <div className="flex items-center gap-2 text-gray-400 text-xs">
                    <Heart className="w-4 h-4 text-pink-500" />
                    <span>Viewers can send hearts and comments</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <button
        onClick={onBack}
        className="mb-4 bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded-lg"
      >
        ← Back to Streams
      </button>

      <div className="max-w-md mx-auto mt-10">
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

export default HostLiveStream;