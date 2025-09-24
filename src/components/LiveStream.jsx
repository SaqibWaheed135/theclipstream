import { useState, useRef, useEffect } from 'react';
import { Room } from 'livekit-client';
import io from 'socket.io-client';

const LiveScreen = () => {
  const [liveTitle, setLiveTitle] = useState('');
  const [isLive, setIsLive] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [streamId, setStreamId] = useState(null);
  const [currentStream, setCurrentStream] = useState(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const streamRef = useRef(null);
  const socketRef = useRef(null);
  const liveKitRoom = useRef(null);

  useEffect(() => {
    socketRef.current = io('https://theclipstream-backend.onrender.com', {
      transports: ['websocket'],
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
      stopStream();
    };
  }, []);

  const stopStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (liveKitRoom.current) {
      liveKitRoom.current.disconnect();
      liveKitRoom.current = null;
    }
    setIsStreaming(false);
    setIsLive(false);
    setConnectionStatus('disconnected');
  };

  const startLive = async () => {
    if (!liveTitle.trim()) {
      alert('Please enter a title for your live stream');
      return;
    }

    try {
      setConnectionStatus('connecting');
      if (!streamRef.current) {
        streamRef.current = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      }

      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch('https://theclipstream-backend.onrender.com/api/live/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
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
        throw new Error(`Invalid publishToken: ${JSON.stringify(streamData.publishToken)}`);
      }

      setStreamId(streamData.streamId);
      setCurrentStream(streamData.stream);
      localStorage.setItem('publishToken', streamData.publishToken);

      // Connect to LiveKit room
      const room = new Room();
      console.log('Connecting to room with URL:', streamData.roomUrl, 'Token:', streamData.publishToken.substring(0, 20) + '...');
      await room.connect(streamData.roomUrl, streamData.publishToken);

      // Publish local tracks
      for (const track of streamRef.current.getTracks()) {
        await room.localParticipant.publishTrack(track);
      }

      liveKitRoom.current = room;
      setIsStreaming(true);

      socketRef.current.emit('join-stream', {
        streamId: streamData.streamId,
        isStreamer: true,
        title: liveTitle,
      });

      setIsLive(true);
      setConnectionStatus('live');
    } catch (error) {
      console.error('Error starting live stream:', error);
      setConnectionStatus('error');
      alert('Failed to start live stream: ' + error.message);
      stopStream();
    }
  };

  return (
    <div>
      <h1>Go Live</h1>
      <input
        type="text"
        value={liveTitle}
        onChange={(e) => setLiveTitle(e.target.value)}
        placeholder="Enter live stream title"
        disabled={isLive}
      />
      <button onClick={startLive} disabled={isLive}>
        Go LIVE
      </button>
      {isLive && (
        <button onClick={async () => {
          await fetch(`https://theclipstream-backend.onrender.com/api/live/${streamId}/end`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
          });
          stopStream();
        }}>
          End
        </button>
      )}
      <p>Status: {connectionStatus}</p>
    </div>
  );
};

export default LiveScreen;