

import { useEffect, useRef } from 'react';
import { connect } from 'livekit-client';

export default function LiveViewer({ roomName }) {
  const videoRef = useRef(null);

  useEffect(() => {
    const join = async () => {
      const resp = await fetch(`/api/live/${roomName}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identity: 'viewer_123' }),
      });
      const { token } = await resp.json();

      const room = await connect(process.env.REACT_APP_LIVEKIT_URL, token);

      // when remote track is published
      room.on('trackSubscribed', (track) => {
        if (track.kind === 'video') {
          const ms = new MediaStream([track.mediaStreamTrack]);
          if (videoRef.current) {
            videoRef.current.srcObject = ms;
            videoRef.current.play();
          }
        }
      });
    };

    join();
  }, [roomName]);

  return <video ref={videoRef} autoPlay playsInline className="w-full h-full" />;
}
