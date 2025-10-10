import React, { useState, useEffect } from 'react';
import { Play, Users, Clock, Search, Filter } from 'lucide-react';

const LiveBrowse = () => {
  const [liveStreams, setLiveStreams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('viewers'); // viewers, recent, duration
  const [error, setError] = useState(null);

  // Skeleton components
  const Skeleton = ({ className = "", children, ...props }) => (
    <div
      className={`animate-pulse bg-gradient-to-r from-gray-800 via-gray-700 to-gray-800 bg-[length:200%_100%] animate-shimmer rounded ${className}`}
      {...props}
    >
      {children}
    </div>
  );

  const LiveBrowseSkeleton = () => (
    <div className="min-h-screen bg-black text-white">
      {/* Custom styles for shimmer effect */}
      <style jsx>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        
        @keyframes shimmer-slide {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        
        .animate-shimmer {
          animation: shimmer 2s infinite linear;
          background: linear-gradient(90deg, #1f2937 25%, #374151 50%, #1f2937 75%);
          background-size: 200% 100%;
        }
        
        .animate-shimmer-slide {
          animation: shimmer-slide 2s infinite;
        }
      `}</style>

      {/* Header Skeleton */}
      <div className="sticky top-0 bg-black/95 backdrop-blur-lg border-b border-gray-800 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Skeleton className="w-3 h-3 rounded-full" />
              <Skeleton className="h-8 w-24" />
              <Skeleton className="h-6 w-8" />
            </div>
            <Skeleton className="h-10 w-20 rounded-full" />
          </div>

          {/* Search and Filter Skeleton */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Skeleton className="h-10 w-full rounded-full" />
            </div>
            <Skeleton className="h-10 w-40 rounded-full" />
          </div>
        </div>
      </div>

      {/* Live Streams Grid Skeleton */}
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-gray-900 rounded-xl overflow-hidden relative">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] animate-shimmer-slide"></div>
              
              {/* Stream Thumbnail Skeleton */}
              <div className="aspect-video relative">
                <Skeleton className="w-full h-full" />
                {/* Live Badge Skeleton */}
                <div className="absolute top-3 left-3">
                  <Skeleton className="w-12 h-6 rounded-full" />
                </div>
                {/* Viewer Count Skeleton */}
                <div className="absolute top-3 right-3">
                  <Skeleton className="w-8 h-6 rounded-full" />
                </div>
                {/* Duration Skeleton */}
                <div className="absolute bottom-3 right-3">
                  <Skeleton className="w-12 h-6 rounded-full" />
                </div>
              </div>
              
              {/* Stream Info Skeleton */}
              <div className="p-4">
                <div className="flex items-start space-x-3">
                  <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <Skeleton className="h-5 w-3/4 mb-1" />
                    <Skeleton className="h-4 w-1/2 mb-2" />
                    <div className="flex items-center space-x-4">
                      <Skeleton className="h-3 w-16" />
                      <Skeleton className="h-3 w-12" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Refresh Indicator Skeleton */}
      <div className="fixed bottom-4 right-4 bg-gray-800 rounded-full px-4 py-2">
        <div className="flex items-center space-x-2">
          <Skeleton className="w-2 h-2 rounded-full" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>
    </div>
  );

  // Fetch live streams
  useEffect(() => {
    const fetchLiveStreams = async () => {
      try {
        setLoading(true);
        const response = await fetch('https://theclipstream-backend.onrender.com/api/live', {
          credentials: 'include'
        });

        if (!response.ok) {
          throw new Error('Failed to fetch live streams');
        }

        const streams = await response.json();
        setLiveStreams(streams);
      } catch (err) {
        console.error('Error fetching live streams:', err);
        setError(err.message);
        // Set mock data for demonstration
        setLiveStreams([
          {
            _id: '1',
            title: 'Gaming Session - Call of Duty',
            streamer: { username: 'gamer123', avatar: null },
            currentViewers: 1234,
            startedAt: new Date(Date.now() - 3600000).toISOString()
          },
          {
            _id: '2',
            title: 'Music Production Live',
            streamer: { username: 'musicmaker', avatar: null },
            currentViewers: 567,
            startedAt: new Date(Date.now() - 7200000).toISOString()
          }
        ]);
        setError(null); // Clear error for demo
      } finally {
        setLoading(false);
      }
    };

    fetchLiveStreams();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchLiveStreams, 30000);
    return () => clearInterval(interval);
  }, []);

  // Filter and sort streams
  const filteredAndSortedStreams = liveStreams
    .filter(stream => 
      stream.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      stream.streamer.username.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      switch (sortBy) {
        case 'viewers':
          return (b.currentViewers || 0) - (a.currentViewers || 0);
        case 'recent':
          return new Date(b.startedAt) - new Date(a.startedAt);
        case 'duration':
          const aDuration = a.startedAt ? Date.now() - new Date(a.startedAt).getTime() : 0;
          const bDuration = b.startedAt ? Date.now() - new Date(b.startedAt).getTime() : 0;
          return bDuration - aDuration;
        default:
          return 0;
      }
    });

  // Calculate stream duration
  const getStreamDuration = (startedAt) => {
    if (!startedAt) return '0:00';
    const duration = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000);
    const hours = Math.floor(duration / 3600);
    const minutes = Math.floor((duration % 3600) / 60);
    return hours > 0 ? `${hours}:${minutes.toString().padStart(2, '0')}:00` : `${minutes}:${(duration % 60).toString().padStart(2, '0')}`;
  };

  // Show skeleton loading
  if (loading) {
    return <LiveBrowseSkeleton />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black text-white">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-500 rounded-full mx-auto mb-4 flex items-center justify-center">
                <span className="text-2xl">⚠️</span>
              </div>
              <p className="text-lg mb-2">Error loading live streams</p>
              <p className="text-gray-400">{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Custom styles for shimmer effect */}
      <style jsx>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        
        @keyframes shimmer-slide {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        
        .animate-shimmer {
          animation: shimmer 2s infinite linear;
          background: linear-gradient(90deg, #1f2937 25%, #374151 50%, #1f2937 75%);
          background-size: 200% 100%;
        }
        
        .animate-shimmer-slide {
          animation: shimmer-slide 2s infinite;
        }
      `}</style>

      {/* Header */}
      <div className="sticky top-0 bg-black/95 backdrop-blur-lg border-b border-gray-800 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold flex items-center space-x-2">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
              <span>Live Now</span>
              <span className="text-lg text-gray-400">({liveStreams.length})</span>
            </h1>
            <button
              onClick={() => window.location.href = '/live'}
              className="bg-red-500 hover:bg-red-600 px-6 py-2 rounded-full font-semibold transition-colors"
            >
              Go Live
            </button>
          </div>

          {/* Search and Filter */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search live streams..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-900 border border-gray-700 rounded-full focus:outline-none focus:ring-2 focus:ring-red-500 text-white placeholder-gray-400"
              />
            </div>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="pl-10 pr-8 py-2 bg-gray-900 border border-gray-700 rounded-full focus:outline-none focus:ring-2 focus:ring-red-500 text-white appearance-none cursor-pointer"
              >
                <option value="viewers">Most Viewers</option>
                <option value="recent">Recently Started</option>
                <option value="duration">Longest Running</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Live Streams Grid */}
      <div className="container mx-auto px-4 py-6">
        {filteredAndSortedStreams.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-gray-800 rounded-full mx-auto mb-4 flex items-center justify-center">
              <Play className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold mb-2">
              {searchTerm ? 'No streams found' : 'No live streams right now'}
            </h3>
            <p className="text-gray-400 mb-6">
              {searchTerm 
                ? `No streams match "${searchTerm}"`
                : 'Be the first to go live and connect with your audience!'
              }
            </p>
            <button
              onClick={() => window.location.href = '/live/create'}
              className="inline-block bg-red-500 hover:bg-red-600 px-8 py-3 rounded-full font-semibold transition-colors"
            >
              Start Streaming
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredAndSortedStreams.map((stream) => (
              <button
                key={stream._id}
                onClick={() => window.location.href = `/live/${stream._id}`}
                className="group block w-full text-left"
              >
                <div className="bg-gray-900 rounded-xl overflow-hidden hover:bg-gray-800 transition-all duration-300 transform hover:scale-105">
                  {/* Stream Thumbnail */}
                  <div className="relative aspect-video bg-gradient-to-br from-red-500 to-purple-600">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <Play className="w-12 h-12 text-white mb-2 mx-auto" />
                        <p className="text-white font-semibold">{stream.title}</p>
                      </div>
                    </div>
                    
                    {/* Live Badge */}
                    <div className="absolute top-3 left-3 bg-red-500 px-2 py-1 rounded-full flex items-center space-x-1">
                      <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                      <span className="text-white text-xs font-bold">LIVE</span>
                    </div>
                    
                    {/* Viewer Count */}
                    <div className="absolute top-3 right-3 bg-black/50 backdrop-blur-sm px-2 py-1 rounded-full flex items-center space-x-1">
                      <Users className="w-3 h-3 text-white" />
                      <span className="text-white text-xs font-semibold">
                        {stream.currentViewers || 0}
                      </span>
                    </div>
                    
                    {/* Duration */}
                    <div className="absolute bottom-3 right-3 bg-black/50 backdrop-blur-sm px-2 py-1 rounded-full flex items-center space-x-1">
                      <Clock className="w-3 h-3 text-white" />
                      <span className="text-white text-xs font-semibold">
                        {getStreamDuration(stream.startedAt)}
                      </span>
                    </div>
                  </div>
                  
                  {/* Stream Info */}
                  <div className="p-4">
                    <div className="flex items-start space-x-3">
                      <img
                        src={stream.streamer.avatar || `https://i.pravatar.cc/150?u=${stream.streamer.username}`}
                        alt={stream.streamer.username}
                        className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-white truncate group-hover:text-red-400 transition-colors">
                          {stream.title}
                        </h3>
                        <p className="text-gray-400 text-sm truncate">
                          @{stream.streamer.username}
                        </p>
                        <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                          <span className="flex items-center space-x-1">
                            <Users className="w-3 h-3" />
                            <span>{(stream.currentViewers || 0).toLocaleString()} watching</span>
                          </span>
                          <span className="flex items-center space-x-1">
                            <Clock className="w-3 h-3" />
                            <span>{getStreamDuration(stream.startedAt)}</span>
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
      
      {/* Refresh Indicator */}
      <div className="fixed bottom-4 right-4 bg-gray-800 rounded-full px-4 py-2 flex items-center space-x-2">
        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
        <span className="text-sm text-gray-300">Auto-refreshing</span>
      </div>
    </div>
  );
};

export default LiveBrowse;