import React, { useState, useEffect, useRef } from 'react';
import { Heart, MessageCircle, Share2, Users, Send, ArrowLeft, Camera } from 'lucide-react';
import io from 'socket.io-client';
import { useParams, useNavigate } from 'react-router-dom';
import { Room, RoomEvent, Track } from 'livekit-client';

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
  const videoRefs = useRef({});
  const commentsEndRef = useRef(null);

  const LIVEKIT_URL =
    process.env.REACT_APP_LIVEKIT_URL || 'wss://theclipstream-q0jt88zr.livekit.cloud';

  // Initialize socket and join stream
  useEffect(() => {
    const initializeStream = async () => {
      try {
        setIsLoading(true);

        const response = await fetch(
          `https://theclipstream-backend.onrender.com/api/live/${streamId}`,
          { credentials: 'include' }
        );

        if (!response.ok) throw new Error('Stream not found');

        const streamData = await response.json();
        console.log('Fetched stream data:', streamData);
        setStream(streamData);

        const token = localStorage.getItem('token');
        socketRef.current = io('https://theclipstream-backend.onrender.com', {
          withCredentials: true,
          auth: token ? { token } : {},
        });

        socketRef.current.on('connect', () => {
          console.log('Socket connected');
          setIsConnected(true);
          socketRef.current.emit('join-stream', { streamId, isStreamer: false });
        });

        socketRef.current.on('disconnect', () => {
          setIsConnected(false);
        });

        socketRef.current.on('joined-stream', async (data) => {
          console.log('Joined stream data:', data);
          setViewers(data.viewerCount);
          setStream(data.stream);
          setIsLoading(false);

          const viewerToken = streamData.viewerToken || data.stream?.viewerToken;
          const roomUrl = streamData.roomUrl || data.stream?.roomUrl || LIVEKIT_URL;

          if (viewerToken) {
            await connectToLiveKitRoom(roomUrl, viewerToken);
          } else {
            await fetchViewerToken();
          }
        });

        socketRef.current.on('viewer-joined', (data) => setViewers(data.viewerCount));
        socketRef.current.on('viewer-left', (data) => setViewers(data.viewerCount));
        socketRef.current.on('new-comment', (comment) =>
          setComments((prev) => [...prev, comment])
        );
        socketRef.current.on('heart-sent', () => addHeart());

        socketRef.current.on('stream-ended', () => {
          setError('This live stream has ended');
          setTimeout(() => navigate('/'), 3000);
        });

        if (streamData.viewerToken) {
          const roomUrl = streamData.roomUrl || LIVEKIT_URL;
          await connectToLiveKitRoom(roomUrl, streamData.viewerToken);
          setIsLoading(false);
        }
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
      // Clean up audio elements
      document.querySelectorAll('audio[data-participant]').forEach(el => el.remove());
    };
  }, [streamId, navigate]);

  const fetchViewerToken = async () => {
    try {
      const response = await fetch(
        `https://theclipstream-backend.onrender.com/api/live/${streamId}/token`,
        { credentials: 'include' }
      );
      if (response.ok) {
        const data = await response.json();
        console.log('Fetched viewer token:', data);
        await connectToLiveKitRoom(data.roomUrl, data.viewerToken);
      }
    } catch (error) {
      console.error('Error fetching viewer token:', error);
    }
  };

  // const connectToLiveKitRoom = async (roomUrl, viewerToken) => {
  //   try {
  //     if (!viewerToken || typeof viewerToken !== 'string') {
  //       console.error('Invalid viewer token:', viewerToken);
  //       setError('Invalid viewer token');
  //       return;
  //     }

  //     console.log('Connecting to LiveKit as viewer:', {
  //       roomUrl,
  //       tokenLength: viewerToken.length,
  //     });

  //     const room = new Room();
  //     await room.connect(roomUrl, viewerToken);
  //     setLiveKitRoom(room);

  //     // Subscribe to new remote tracks with FIXED AUDIO HANDLING
  //     room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
  //       console.log(
  //         'Subscribed to track from:',
  //         participant.identity,
  //         'Kind:',
  //         track.kind,
  //         'Track enabled:',
  //         track.mediaStreamTrack?.enabled
  //       );

  //       if (track.kind === Track.Kind.Video) {
  //         let videoEl = videoRefs.current[participant.identity];
  //         if (!videoEl) {
  //           const containers = document.querySelectorAll('[data-participant-video]');
  //           const availableContainer = Array.from(containers).find(
  //             (c) => !c.querySelector('video[data-participant]')
  //           );

  //           if (availableContainer) {
  //             videoEl = availableContainer.querySelector('video');
  //             if (videoEl) {
  //               videoEl.setAttribute('data-participant', participant.identity);
  //               videoRefs.current[participant.identity] = videoEl;
  //             }
  //           }
  //         }

  //         if (videoEl) {
  //           track.attach(videoEl);
  //           videoEl.muted = false;
  //           videoEl.volume = 1.0;
  //           videoEl.play().catch((err) => {
  //             console.warn('Video autoplay failed:', err);
  //             videoEl.muted = true;
  //             videoEl.play().then(() => {
  //               setTimeout(() => { videoEl.muted = false; }, 100);
  //             }).catch(console.error);
  //           });
  //         }
  //       }

  //       // 🔊 FIXED AUDIO TRACK HANDLING
  //       if (track.kind === Track.Kind.Audio) {
  //         // Remove any existing audio element for this participant
  //         const existingAudio = document.querySelector(
  //           `audio[data-participant="${participant.identity}"]`
  //         );
  //         if (existingAudio) {
  //           existingAudio.remove();
  //         }

  //         const audioEl = document.createElement('audio');
  //         audioEl.autoplay = true;
  //         audioEl.playsInline = true;
  //         audioEl.muted = false;
  //         audioEl.volume = 1.0;
  //         audioEl.dataset.participant = participant.identity;

  //         track.attach(audioEl);
  //         document.body.appendChild(audioEl);

  //         audioEl.play()
  //           .then(() => console.log('✅ Audio track playing for', participant.identity))
  //           .catch((err) => {
  //             console.error('❌ Audio autoplay failed:', err);
  //             // Try to play on next user interaction
  //             const playOnClick = () => {
  //               audioEl.play()
  //                 .then(() => {
  //                   console.log('✅ Audio started after user interaction');
  //                   document.removeEventListener('click', playOnClick);
  //                 })
  //                 .catch(console.error);
  //             };
  //             document.addEventListener('click', playOnClick, { once: true });
  //           });
  //       }
  //     });

  //     room.on(RoomEvent.TrackUnsubscribed, (track, publication, participant) => {
  //       console.log('Unsubscribed from track:', participant.identity);

  //       if (track.kind === Track.Kind.Video) {
  //         track.detach();
  //         const videoEl = videoRefs.current[participant.identity];
  //         if (videoEl) {
  //           videoEl.removeAttribute('data-participant');
  //           videoEl.srcObject = null;
  //         }
  //       }

  //       if (track.kind === Track.Kind.Audio) {
  //         const audioEls = document.querySelectorAll(
  //           `audio[data-participant="${participant.identity}"]`
  //         );
  //         audioEls.forEach((el) => el.remove());
  //         track.detach();
  //       }
  //     });

  //     room.on(RoomEvent.ParticipantConnected, (participant) => {
  //       console.log('New participant joined:', participant.identity);
  //       subscribeToNewTracks();
  //     });

  //     room.on(RoomEvent.ParticipantDisconnected, (participant) => {
  //       console.log('Participant left:', participant.identity);
  //       const videoEl = videoRefs.current[participant.identity];
  //       if (videoEl) {
  //         videoEl.removeAttribute('data-participant');
  //         videoEl.srcObject = null;
  //       }
  //       delete videoRefs.current[participant.identity];

  //       // Remove audio elements
  //       const audioEls = document.querySelectorAll(
  //         `audio[data-participant="${participant.identity}"]`
  //       );
  //       audioEls.forEach((el) => el.remove());
  //     });

  //     const subscribeToNewTracks = () => {
  //       room.remoteParticipants.forEach((participant) => {
  //         participant.trackPublications.forEach((pub) => {
  //           if (pub.isSubscribed && pub.track?.kind === Track.Kind.Video) {
  //             const track = pub.track;
  //             const videoEl = videoRefs.current[participant.identity];
  //             if (videoEl && !videoEl.srcObject) {
  //               track.attach(videoEl);
  //               videoEl.play().catch(console.error);
  //             }
  //           }
  //         });
  //       });
  //     };

  //     subscribeToNewTracks();

  //     console.log('LiveKit room connected as viewer');
  //   } catch (error) {
  //     console.error('LiveKit viewer connection error:', error);
  //     setError('Failed to connect to live stream: ' + error.message);
  //   }
  // };

  const connectToLiveKitRoom = async (roomUrl, viewerToken) => {
    try {
      if (!viewerToken || typeof viewerToken !== 'string') {
        console.error('Invalid viewer token:', viewerToken);
        setError('Invalid viewer token');
        return;
      }

      console.log('Connecting to LiveKit as viewer:', {
        roomUrl,
        tokenLength: viewerToken.length,
      });

      const room = new Room();
      await room.connect(roomUrl, viewerToken);
      setLiveKitRoom(room);

      room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
        console.log(
          'Subscribed to track from:',
          participant.identity,
          'Kind:',
          track.kind,
          'Track enabled:',
          track.mediaStreamTrack?.enabled
        );

        if (track.kind === Track.Kind.Video) {
          let videoEl = videoRefs.current[participant.identity];
          if (!videoEl) {
            const containers = document.querySelectorAll('[data-participant-video]');
            const availableContainer = Array.from(containers).find(
              (c) => !c.querySelector('video[data-participant]')
            );

            if (availableContainer) {
              videoEl = availableContainer.querySelector('video');
              if (videoEl) {
                videoEl.setAttribute('data-participant', participant.identity);
                videoRefs.current[participant.identity] = videoEl;
              }
            }
          }

          if (videoEl) {
            track.attach(videoEl);
            videoEl.muted = true; // Video elements should not handle audio
            videoEl.volume = 0;
            videoEl.play().catch((err) => {
              console.warn('Video autoplay failed:', err);
              videoEl.play().catch(console.error);
            });
          }
        }

        // if (track.kind === Track.Kind.Audio) {
        //   // Remove any existing audio element for this participant
        //   const existingAudio = document.querySelector(
        //     `audio[data-participant="${participant.identity}"]`
        //   );
        //   if (existingAudio) {
        //     existingAudio.remove();
        //   }

        //   const audioEl = document.createElement('audio');
        //   audioEl.autoplay = true;
        //   audioEl.playsInline = true;
        //   audioEl.muted = false;
        //   audioEl.volume = 1.0;
        //   audioEl.dataset.participant = participant.identity;

        //   track.attach(audioEl);
        //   document.body.appendChild(audioEl);

        //   audioEl.play()
        //     .then(() => console.log('✅ Audio track playing for', participant.identity))
        //     .catch((err) => {
        //       console.error('❌ Audio autoplay failed:', err);
        //       setError('Please click anywhere to enable audio');
        //       const playOnClick = () => {
        //         audioEl.play()
        //           .then(() => {
        //             console.log('✅ Audio started after user interaction');
        //             setError(null);
        //             document.removeEventListener('click', playOnClick);
        //           })
        //           .catch((e) => console.error('Audio play failed after click:', e));
        //       };
        //       document.addEventListener('click', playOnClick, { once: true });
        //     });
        // }

        if (track.kind === Track.Kind.Audio) {
  console.log('🎵 Audio track received from', participant.identity);
  
  // Remove any existing audio element for this participant
  const existingAudio = document.querySelector(
    `audio[data-participant="${participant.identity}"]`
  );
  if (existingAudio) {
    console.log('Removing existing audio element');
    existingAudio.remove();
  }

  const audioEl = document.createElement('audio');
  audioEl.autoplay = true;
  audioEl.playsInline = true;
  audioEl.muted = false;
  audioEl.volume = 1.0;
  audioEl.dataset.participant = participant.identity;

  console.log('Attaching audio track to new audio element');
  track.attach(audioEl);
  document.body.appendChild(audioEl);
  
  console.log('Audio element created:', {
    muted: audioEl.muted,
    volume: audioEl.volume,
    autoplay: audioEl.autoplay,
    srcObject: audioEl.srcObject
  });

  audioEl.play()
    .then(() => {
      console.log('✅ Audio track PLAYING for', participant.identity);
      console.log('Audio element state:', {
        paused: audioEl.paused,
        muted: audioEl.muted,
        volume: audioEl.volume
      });
    })
    .catch((err) => {
      console.error('❌ Audio autoplay failed:', err.name, err.message);
      alert('Click anywhere on the screen to enable audio!');
      
      const playOnClick = () => {
        console.log('User clicked, attempting audio play...');
        audioEl.play()
          .then(() => {
            console.log('✅ Audio started after user interaction');
            document.removeEventListener('click', playOnClick);
            document.removeEventListener('touchstart', playOnClick);
          })
          .catch((e) => console.error('Audio play failed after click:', e));
      };
      
      document.addEventListener('click', playOnClick, { once: true });
      document.addEventListener('touchstart', playOnClick, { once: true });
    });
}
      });

      room.on(RoomEvent.TrackUnsubscribed, (track, publication, participant) => {
        console.log('Unsubscribed from track:', participant.identity);

        if (track.kind === Track.Kind.Video) {
          track.detach();
          const videoEl = videoRefs.current[participant.identity];
          if (videoEl) {
            videoEl.removeAttribute('data-participant');
            videoEl.srcObject = null;
          }
        }

        if (track.kind === Track.Kind.Audio) {
          const audioEls = document.querySelectorAll(
            `audio[data-participant="${participant.identity}"]`
          );
          audioEls.forEach((el) => el.remove());
          track.detach();
        }
      });

      room.on(RoomEvent.ParticipantConnected, (participant) => {
        console.log('New participant joined:', participant.identity);
        subscribeToNewTracks();
      });

      room.on(RoomEvent.ParticipantDisconnected, (participant) => {
        console.log('Participant left:', participant.identity);
        const videoEl = videoRefs.current[participant.identity];
        if (videoEl) {
          videoEl.removeAttribute('data-participant');
          videoEl.srcObject = null;
        }
        delete videoRefs.current[participant.identity];

        const audioEls = document.querySelectorAll(
          `audio[data-participant="${participant.identity}"]`
        );
        audioEls.forEach((el) => el.remove());
      });

      const subscribeToNewTracks = () => {
        room.remoteParticipants.forEach((participant) => {
          participant.trackPublications.forEach((pub) => {
            if (pub.isSubscribed && pub.track?.kind === Track.Kind.Video) {
              const track = pub.track;
              const videoEl = videoRefs.current[participant.identity];
              if (videoEl && !videoEl.srcObject) {
                track.attach(videoEl);
                videoEl.muted = true; // Ensure video element is muted
                videoEl.play().catch(console.error);
              }
            }
          });
        });
      };

      subscribeToNewTracks();

      console.log('LiveKit room connected as viewer');
    } catch (error) {
      console.error('LiveKit viewer connection error:', error);
      setError('Failed to connect to live stream: ' + error.message);
    }
  };

  const addHeart = () => {
    const heartId = Date.now() + Math.random();
    setHearts((prev) => [...prev, { id: heartId, x: Math.random() * 80 + 10 }]);
    setTimeout(() => {
      setHearts((prev) => prev.filter((h) => h.id !== heartId));
    }, 3000);
  };

  const sendComment = (e) => {
    e.preventDefault();
    if (!newComment.trim() || !socketRef.current || !isConnected) return;
    socketRef.current.emit('send-comment', { streamId, text: newComment.trim() });
    setNewComment('');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white">
        <p>Connecting to live stream...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white">
        <p>{error}</p>
        <button onClick={() => navigate('/')}>Go Back</button>
      </div>
    );
  }

  const participants = liveKitRoom
    ? Array.from(liveKitRoom.remoteParticipants.values())
    : [];

  return (
    <div className="min-h-screen bg-black text-white">
      {error && (
        <div className="absolute top-4 left-4 bg-red-500/80 px-4 py-2 rounded text-white text-sm">
          {error}
        </div>
      )}
      <div
        className={`relative aspect-[9/16] bg-gray-900 grid ${participants.length > 1 ? 'grid-cols-2' : 'grid-cols-1'
          }`}
      >
        {participants.length === 0 ? (
          <div className="flex items-center justify-center">
            <p>Waiting for host...</p>
          </div>
        ) : (
          participants.map((p) => {
            const camPub = p.getTrackPublication(Track.Source.Camera);
            const micPub = p.getTrackPublication(Track.Source.Microphone);

            const hasCamera = camPub?.isSubscribed && camPub?.track;
            const hasMic = micPub?.isSubscribed && micPub?.track;

            return (
              <div key={p.identity} className="relative bg-gray-800" data-participant-video>
                <video
                  autoPlay
                  playsInline
                  muted={false}
                  controls={false}
                  className="absolute inset-0 w-full h-full object-cover"
                  ref={(el) => {
                    if (el) {
                      videoRefs.current[p.identity] = el;
                      el.muted = false;
                      el.volume = 1.0;
                      if (hasCamera) {
                        camPub.track.attach(el);
                        el.play().catch((err) => {
                          console.warn('Video play failed:', err);
                          el.muted = true;
                          el.play().then(() => {
                            setTimeout(() => { el.muted = false; }, 100);
                          }).catch(console.error);
                        });
                      }
                    }
                  }}
                />

                <div className="absolute top-2 left-2 bg-black/50 px-2 py-1 rounded text-sm flex items-center gap-2">
                  <span>@{p.identity}</span>
                  {hasMic && <span className="text-green-400">🎤</span>}
                </div>

                {!hasCamera && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 text-gray-400">
                    <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center text-2xl font-bold">
                      {p.identity[0]?.toUpperCase()}
                    </div>
                    <p className="mt-2 text-sm">@{p.identity}</p>
                    {hasMic ? (
                      <p className="text-xs italic">🎤 Audio only</p>
                    ) : (
                      <p className="text-xs italic">No video yet…</p>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {error && (
          <div className="absolute top-4 left-4 bg-red-500/80 px-4 py-2 rounded text-white text-sm">
            {error}
          </div>
        )}
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

      <div className="bg-gray-900 border-t border-gray-800">
        <div className="h-64 overflow-y-auto p-4 space-y-3">
          {comments.map((c, i) => (
            <div key={i} className="text-sm">
              <strong>{c.username || 'User'}:</strong> {c.text}
            </div>
          ))}
          <div ref={commentsEndRef} />
        </div>
        <form onSubmit={sendComment} className="p-4 flex">
          <input
            className="flex-1 p-2 rounded bg-gray-800"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Say something..."
          />
          <button type="submit" className="ml-2 px-4 py-2 bg-red-500 rounded">
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>

      <style>{`
        @keyframes heartFloat {
          0% { transform: translateY(0) scale(1); opacity: 1; }
          50% { transform: translateY(-100px) scale(1.2); opacity: 0.8; }
          100% { transform: translateY(-200px) scale(0.8); opacity: 0; }
        }
      `}</style>
    </div>
  );
};

export default LiveViewer;