import React, { useState, useRef, useEffect } from 'react';
import { Heart, MessageCircle, Share2, Bookmark, MoreHorizontal, Play, Pause, Volume2, VolumeX } from 'lucide-react';

const LiveScreen = () => {
  const [isLive, setIsLive] = useState(false);
  const [viewers, setViewers] = useState(0);
  const [liveTitle, setLiveTitle] = useState('');

  const startLive = () => {
    if (!liveTitle.trim()) {
      alert('Please enter a title for your live stream');
      return;
    }
    
    setIsLive(true);
    setViewers(1);
    
    // Simulate viewer count changes
    const interval = setInterval(() => {
      setViewers(prev => {
        const change = Math.floor(Math.random() * 10) - 4; // Random change between -4 and +5
        return Math.max(1, prev + change);
      });
    }, 2000);
    
    // Clean up after demo
    setTimeout(() => {
      clearInterval(interval);
    }, 60000);
  };

  const stopLive = () => {
    setIsLive(false);
    setViewers(0);
    setLiveTitle('');
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {!isLive ? (
        <>
          {/* Header */}
          <div className="sticky top-0 bg-black/95 backdrop-blur-lg border-b border-gray-800 z-10 p-4">
            <h1 className="text-xl font-bold text-center">Go LIVE</h1>
          </div>

          <div className="p-4">
            {/* Camera Preview */}
            <div className="relative bg-gray-900 rounded-xl aspect-[9/16] mb-6 overflow-hidden">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-16 h-16 bg-red-500 rounded-full mx-auto mb-4 flex items-center justify-center">
                    <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M2 6a2 2 0 012-2h6l2 2h6a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM5 8a1 1 0 011-1h1a1 1 0 010 2H6a1 1 0 01-1-1zm6 1a1 1 0 100-2 1 1 0 000 2z" />
                    </svg>
                  </div>
                  <p className="text-gray-400">Camera preview will appear here</p>
                </div>
              </div>
              
              {/* Camera controls overlay */}
              <div className="absolute top-4 right-4 flex space-x-2">
                <button className="w-10 h-10 bg-black/50 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4 5a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1.586l-.707-.707A1 1 0 0013 4H7a1 1 0 00-.707.293L5.586 5H4zm6 9a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                  </svg>
                </button>
                <button className="w-10 h-10 bg-black/50 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M7 4V2a1 1 0 011-1h4a1 1 0 011 1v2h3a1 1 0 000-2H16a3 3 0 00-3-3H7a3 3 0 00-3 3H1a1 1 0 000 2h3v12a2 2 0 002 2h8a2 2 0 002-2V4h-9z" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Live Title Input */}
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
              disabled={!liveTitle.trim()}
              className="w-full bg-red-500 hover:bg-red-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white py-4 rounded-xl font-bold text-lg transition-colors"
            >
              Go LIVE
            </button>

            {/* Live Tips */}
            <div className="mt-8 bg-gray-900 rounded-xl p-4">
              <h3 className="font-bold mb-3 text-center">Tips for going live</h3>
              <div className="space-y-3 text-sm text-gray-300">
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-red-500 rounded-full mt-2"></div>
                  <p>Ensure you have a strong internet connection</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-red-500 rounded-full mt-2"></div>
                  <p>Find good lighting for the best video quality</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-red-500 rounded-full mt-2"></div>
                  <p>Interact with your viewers to keep them engaged</p>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Live Stream Interface */}
          <div className="relative h-screen bg-gray-900">
            {/* Live indicator */}
            <div className="absolute top-4 left-4 z-20">
              <div className="bg-red-500 px-3 py-1 rounded-full flex items-center space-x-2">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                <span className="text-white font-bold text-sm">LIVE</span>
                <span className="text-white font-bold text-sm">{viewers}</span>
              </div>
            </div>

            {/* End Live button */}
            <div className="absolute top-4 right-4 z-20">
              <button
                onClick={stopLive}
                className="bg-black/50 backdrop-blur-sm px-4 py-2 rounded-full text-white font-semibold"
              >
                End
              </button>
            </div>

            {/* Camera feed placeholder */}
            <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
              <div className="text-center">
                <div className="w-20 h-20 bg-red-500 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2 6a2 2 0 012-2h6l2 2h6a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM5 8a1 1 0 011-1h1a1 1 0 010 2H6a1 1 0 01-1-1zm6 1a1 1 0 100-2 1 1 0 000 2z" />
                  </svg>
                </div>
                <p className="text-white text-lg font-semibold">{liveTitle}</p>
                <p className="text-gray-300">You're live!</p>
              </div>
            </div>

            {/* Live comments overlay */}
            <div className="absolute bottom-20 left-0 right-0 p-4">
              <div className="bg-black/30 backdrop-blur-sm rounded-xl p-3 max-h-40 overflow-y-auto">
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 bg-blue-500 rounded-full"></div>
                    <span className="text-white font-semibold text-sm">viewer123</span>
                    <span className="text-gray-300 text-sm">Great stream! 🔥</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 bg-green-500 rounded-full"></div>
                    <span className="text-white font-semibold text-sm">fan456</span>
                    <span className="text-gray-300 text-sm">Hello from Brazil! 🇧🇷</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 bg-purple-500 rounded-full"></div>
                    <span className="text-white font-semibold text-sm">music_lover</span>
                    <span className="text-gray-300 text-sm">❤️❤️❤️</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Live controls */}
            <div className="absolute bottom-4 left-4 right-4 flex justify-center space-x-4">
              <button className="w-12 h-12 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.82L4.067 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.067l4.316-3.82z" clipRule="evenodd" />
                </svg>
              </button>
              <button className="w-12 h-12 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M7 4V2a1 1 0 011-1h4a1 1 0 011 1v2h3a1 1 0 000-2H16a3 3 0 00-3-3H7a3 3 0 00-3 3H1a1 1 0 000 2h3v12a2 2 0 002 2h8a2 2 0 002-2V4h-9z" />
                </svg>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
export default LiveScreen;