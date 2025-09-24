

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
