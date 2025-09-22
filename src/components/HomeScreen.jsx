import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Heart, MessageCircle, Share, Bookmark, Send, X, ArrowLeft, Volume2, VolumeX } from "lucide-react";

const HomeScreen = () => {
  const [currentVideo, setCurrentVideo] = useState(0);
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [activeVideoId, setActiveVideoId] = useState(null);
  const [comments, setComments] = useState({});
  const [newComment, setNewComment] = useState("");
  const [commentLoading, setCommentLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [isMuted, setIsMuted] = useState(true);
  
  // Profile navigation state
  const [profileNavigation, setProfileNavigation] = useState(null);
  
  // Performance optimization refs
  const videoRefs = useRef({});
  const fetchingRef = useRef(false);
  const retryTimeoutRef = useRef(null);
  const containerRef = useRef(null);
  const scrollTimeoutRef = useRef(null);

  // Preload adjacent videos for smoother experience
  const PRELOAD_RANGE = 2; // Preload 2 videos before and after current

  // Memoized API config
  const API_CONFIG = useMemo(() => ({
    baseUrl: 'https://theclipstream-backend.onrender.com/api',
    getHeaders: () => {
      const token = localStorage.getItem('token');
      return {
        ...(token && { 'Authorization': `Bearer ${token}` }),
        'Content-Type': 'application/json'
      };
    }
  }), []);

  // Get current user data
  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        setCurrentUser(JSON.parse(userData));
      } catch (error) {
        console.error('Error parsing user data:', error);
      }
    }
  }, []);

  // Optimized fetch function with retry logic
  const fetchWithRetry = useCallback(async (url, options = {}, retries = 3) => {
    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetch(url, {
          ...options,
          headers: {
            ...API_CONFIG.getHeaders(),
            ...options.headers
          }
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        return await response.json();
      } catch (error) {
        console.warn(`Attempt ${i + 1} failed:`, error.message);
        if (i === retries - 1) throw error;
        
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
      }
    }
  }, [API_CONFIG]);

  // Mock data for demo purposes
  const generateMockVideos = useCallback(() => {
    return [
      {
        _id: '1',
        url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
        thumbnail: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=400',
        user: { _id: '1', username: 'johndoe', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150' },
        description: 'Amazing nature documentary clip! 🌟 #nature #wildlife',
        hashtags: ['#nature', '#wildlife', '#amazing'],
        likesCount: 1234,
        commentsCount: 56,
        createdAt: new Date().toISOString(),
        isLiked: false,
        isSaved: false
      },
      {
        _id: '2',
        url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
        thumbnail: 'https://images.unsplash.com/photo-1526336024174-e58f5cdd8e13?w=400',
        user: { _id: '2', username: 'janesmth', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150' },
        description: 'Creative animation showcase ✨ Follow for more!',
        hashtags: ['#animation', '#creative', '#art'],
        likesCount: 2567,
        commentsCount: 89,
        createdAt: new Date(Date.now() - 3600000).toISOString(),
        isLiked: true,
        isSaved: false
      },
      {
        _id: '3',
        url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
        thumbnail: 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=400',
        user: { _id: '3', username: 'mikech', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150' },
        description: 'Epic action sequence! What do you think? 🔥',
        hashtags: ['#action', '#epic', '#fire'],
        likesCount: 3890,
        commentsCount: 134,
        createdAt: new Date(Date.now() - 7200000).toISOString(),
        isLiked: false,
        isSaved: true
      }
    ];
  }, []);

  // Check for profile navigation data on component mount
  useEffect(() => {
    const checkProfileNavigation = () => {
      const storedData = sessionStorage.getItem('profileVideoNavigation');
      if (storedData) {
        try {
          const data = JSON.parse(storedData);
          if (Date.now() - data.timestamp < 5 * 60 * 1000) {
            console.log('Loading videos from profile navigation');
            setProfileNavigation(data);
            setVideos(data.videos);
            setCurrentVideo(data.startIndex);
            setLoading(false);
            sessionStorage.removeItem('profileVideoNavigation');
            return true;
          }
        } catch (error) {
          console.error('Error parsing profile navigation data:', error);
        }
        sessionStorage.removeItem('profileVideoNavigation');
      }
      return false;
    };

    if (!checkProfileNavigation()) {
      fetchVideos();
    }
  }, []);

  // Optimized video fetching
  const fetchVideos = useCallback(async () => {
    if (fetchingRef.current) return;
    
    fetchingRef.current = true;
    setLoading(true);

    try {
      const cachedVideos = sessionStorage.getItem('cachedVideos');
      const cacheTimestamp = sessionStorage.getItem('videoCacheTime');
      const now = Date.now();
      
      if (cachedVideos && cacheTimestamp && (now - parseInt(cacheTimestamp)) < 5 * 60 * 1000) {
        console.log('Loading videos from cache');
        const parsedVideos = JSON.parse(cachedVideos);
        setVideos(parsedVideos);
        setLoading(false);
        fetchingRef.current = false;
        return;
      }

      console.log('Fetching fresh videos from API');
      
      try {
        const data = await fetchWithRetry(`${API_CONFIG.baseUrl}/videos`);
        sessionStorage.setItem('cachedVideos', JSON.stringify(data));
        sessionStorage.setItem('videoCacheTime', now.toString());
        setVideos(data);
        console.log(`Loaded ${data.length} videos successfully`);
      } catch (apiError) {
        console.log('API not available, using mock data for demo');
        const mockVideos = generateMockVideos();
        setVideos(mockVideos);
        sessionStorage.setItem('cachedVideos', JSON.stringify(mockVideos));
        sessionStorage.setItem('videoCacheTime', now.toString());
      }
      
    } catch (error) {
      console.error("Failed to fetch videos:", error);
      
      const cachedVideos = sessionStorage.getItem('cachedVideos');
      if (cachedVideos) {
        console.log('Using cached videos as fallback');
        setVideos(JSON.parse(cachedVideos));
      } else {
        setVideos(generateMockVideos());
      }
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, [API_CONFIG, fetchWithRetry, generateMockVideos]);

  // Cleanup retry timeout on unmount
  useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  // Optimized video playback management
  const manageVideoPlayback = useCallback((newCurrentVideo) => {
    console.log('Managing video playback for video:', newCurrentVideo);

    // Get videos to preload (current + adjacent)
    const videosToPreload = [];
    for (let i = Math.max(0, newCurrentVideo - PRELOAD_RANGE); 
         i <= Math.min(videos.length - 1, newCurrentVideo + PRELOAD_RANGE); 
         i++) {
      videosToPreload.push(i);
    }

    Object.entries(videoRefs.current).forEach(([index, videoElement]) => {
      if (!videoElement) return;
      
      const videoIndex = parseInt(index);
      
      if (videoIndex === newCurrentVideo) {
        // Current video - play it
        videoElement.muted = isMuted;
        videoElement.currentTime = 0; // Reset to start for better UX
        
        const playPromise = videoElement.play();
        if (playPromise !== undefined) {
          playPromise.catch(err => {
            console.warn("Autoplay failed, trying muted:", err);
            videoElement.muted = true;
            setIsMuted(true);
            videoElement.play().catch(e => console.error("Muted autoplay also failed:", e));
          });
        }
      } else if (videosToPreload.includes(videoIndex)) {
        // Adjacent videos - preload but don't play
        videoElement.pause();
        if (videoElement.readyState < 2) { // If not loaded enough
          videoElement.load(); // Trigger preloading
        }
      } else {
        // Distant videos - pause and reset
        videoElement.pause();
        videoElement.currentTime = 0;
      }
    });
  }, [isMuted, videos.length]);

  // Handle mute/unmute functionality
  const toggleMute = useCallback(() => {
    const newMutedState = !isMuted;
    setIsMuted(newMutedState);

    // Apply to current video only for better performance
    const currentVideoElement = videoRefs.current[currentVideo];
    if (currentVideoElement) {
      currentVideoElement.muted = newMutedState;
    }

    console.log("Toggled mute:", newMutedState);
  }, [isMuted, currentVideo]);

  // Optimized scroll handling with debouncing
  useEffect(() => {
    if (profileNavigation) return;

    const container = containerRef.current;
    if (!container) return;

    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          // Clear existing timeout
          if (scrollTimeoutRef.current) {
            clearTimeout(scrollTimeoutRef.current);
          }

          // Debounce the video change
          scrollTimeoutRef.current = setTimeout(() => {
            const scrollPosition = container.scrollTop;
            const windowHeight = window.innerHeight;
            const newCurrentVideo = Math.round(scrollPosition / windowHeight);

            if (
              newCurrentVideo !== currentVideo &&
              newCurrentVideo < videos.length &&
              newCurrentVideo >= 0
            ) {
              console.log("Scroll detected, changing from video", currentVideo, "to", newCurrentVideo);
              setCurrentVideo(newCurrentVideo);
            }
          }, 100); // Debounce by 100ms

          ticking = false;
        });
        ticking = true;
      }
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      container.removeEventListener("scroll", handleScroll);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [currentVideo, videos.length, profileNavigation]);

  // Auto-play management when currentVideo changes
  useEffect(() => {
    if (videos.length > 0 && !loading) {
      // Immediate playback change for better responsiveness
      manageVideoPlayback(currentVideo);
    }
  }, [currentVideo, videos.length, loading, manageVideoPlayback]);

  // Initial auto-play when videos first load
  useEffect(() => {
    if (videos.length > 0 && !loading) {
      const timer = setTimeout(() => {
        console.log('Initial video load, starting playback');
        manageVideoPlayback(currentVideo);
      }, 200); // Reduced timeout
      
      return () => clearTimeout(timer);
    }
  }, [videos.length, loading, currentVideo, manageVideoPlayback]);

  // Optimized comment fetching with caching
  const fetchComments = useCallback(async (videoId) => {
    if (comments[videoId]) return;

    try {
      const data = await fetchWithRetry(`${API_CONFIG.baseUrl}/videos/${videoId}/comments`);
      setComments(prev => ({
        ...prev,
        [videoId]: data
      }));
    } catch (error) {
      console.error("Error fetching comments:", error);
      setComments(prev => ({
        ...prev,
        [videoId]: []
      }));
    }
  }, [comments, API_CONFIG, fetchWithRetry]);

  // Optimized like handler with optimistic updates
  const handleLike = useCallback(async (videoId) => {
    const currentVideoData = videos.find(v => v._id === videoId);
    if (!currentVideoData) return;
    
    const wasLiked = currentVideoData.isLiked;
    const newLikesCount = wasLiked 
      ? (currentVideoData.likesCount || 0) - 1 
      : (currentVideoData.likesCount || 0) + 1;

    setVideos(prev => prev.map(video => 
      video._id === videoId 
        ? { ...video, isLiked: !wasLiked, likesCount: newLikesCount }
        : video
    ));

    try {
      const data = await fetchWithRetry(`${API_CONFIG.baseUrl}/videos/${videoId}/like`, {
        method: "POST"
      });
      
      setVideos(prev => prev.map(video => 
        video._id === videoId 
          ? { ...video, likes: data.likes, isLiked: data.isLiked, likesCount: data.likesCount }
          : video
      ));
    } catch (error) {
      console.error("Error liking video:", error);
    }
  }, [videos, API_CONFIG, fetchWithRetry]);

  // Optimized save handler with optimistic updates
  const handleSave = useCallback(async (videoId) => {
    const currentVideoData = videos.find(v => v._id === videoId);
    if (!currentVideoData) return;
    
    const wasSaved = currentVideoData.isSaved;

    setVideos(prev => prev.map(video => 
      video._id === videoId 
        ? { ...video, isSaved: !wasSaved }
        : video
    ));

    try {
      const data = await fetchWithRetry(`${API_CONFIG.baseUrl}/videos/${videoId}/save`, {
        method: "POST"
      });
      
      setVideos(prev => prev.map(video => 
        video._id === videoId 
          ? { ...video, isSaved: data.isSaved }
          : video
      ));
    } catch (error) {
      console.error("Error saving video:", error);
    }
  }, [videos, API_CONFIG, fetchWithRetry]);

  // Handle share functionality
  const handleShare = useCallback(async (video) => {
    const shareData = {
      title: video.title || 'Check out this video!',
      text: video.description || 'Amazing video content!',
      url: `${window.location.origin}/video/${video._id}`
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(shareData.url);
        console.log('Video link copied to clipboard!');
      }
    } catch (error) {
      console.error('Error sharing:', error);
      try {
        await navigator.clipboard.writeText(shareData.url);
        console.log('Video link copied to clipboard!');
      } catch (clipboardErr) {
        console.error('Clipboard error:', clipboardErr);
      }
    }
  }, []);

  // Optimized comment submission
  const handleCommentSubmit = useCallback(async (e) => {
    e.preventDefault();
    if (!newComment.trim() || !activeVideoId || commentLoading) return;

    const commentText = newComment.trim();
    const tempId = `temp-${Date.now()}`;
    
    const optimisticComment = {
      _id: tempId,
      text: commentText,
      user: {
        _id: currentUser?._id || 'demo',
        username: currentUser?.username || 'You',
        avatar: currentUser?.avatar || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150'
      },
      createdAt: new Date().toISOString()
    };

    setComments(prev => ({
      ...prev,
      [activeVideoId]: [optimisticComment, ...(prev[activeVideoId] || [])]
    }));
    
    setNewComment("");
    setCommentLoading(true);

    try {
      const data = await fetchWithRetry(`${API_CONFIG.baseUrl}/videos/${activeVideoId}/comments`, {
        method: "POST",
        body: JSON.stringify({ text: commentText })
      });

      setComments(prev => ({
        ...prev,
        [activeVideoId]: prev[activeVideoId].map(comment => 
          comment._id === tempId ? data : comment
        )
      }));
      
      setVideos(prev => prev.map(video => 
        video._id === activeVideoId 
          ? { ...video, commentsCount: (video.commentsCount || 0) + 1 }
          : video
      ));
    } catch (error) {
      console.error("Error posting comment:", error);
      setVideos(prev => prev.map(video => 
        video._id === activeVideoId 
          ? { ...video, commentsCount: (video.commentsCount || 0) + 1 }
          : video
      ));
    } finally {
      setCommentLoading(false);
    }
  }, [newComment, activeVideoId, commentLoading, currentUser, API_CONFIG, fetchWithRetry]);

  const openCommentModal = useCallback((videoId) => {
    setActiveVideoId(videoId);
    setShowCommentModal(true);
    fetchComments(videoId);
  }, [fetchComments]);

  const closeCommentModal = useCallback(() => {
    setShowCommentModal(false);
    setActiveVideoId(null);
    setNewComment("");
  }, []);

  const handleBackToProfile = useCallback(() => {
    window.location.href = '/profile';
  }, []);

  // Optimized VideoPlayer component
  const VideoPlayer = React.memo(({ video, isActive, index }) => {
    const [isFollowing, setIsFollowing] = useState(false);
    
    const isLiked = video.isLiked || false;
    const isSaved = video.isSaved || false;
    const likesCount = video.likesCount || (Array.isArray(video.likes) ? video.likes.length : (video.likes || 0));
    const commentsCount = video.commentsCount || 0;

    // Determine preload strategy
    const shouldPreload = Math.abs(index - currentVideo) <= PRELOAD_RANGE;
    const preloadValue = shouldPreload ? "auto" : "metadata";

    return (
      <div className="relative h-screen w-full bg-black overflow-hidden snap-start flex-shrink-0">
        <video
          ref={(el) => {
            if (el) {
              videoRefs.current[index] = el;
              console.log('Video ref set for index:', index);
            }
          }}
          className="absolute inset-0 w-full h-full object-cover"
          src={video?.url}
          muted={isMuted}
          loop
          playsInline
          preload={preloadValue}
          poster={video?.thumbnail}
          onLoadedData={() => {
            console.log('Video loaded for index:', index, 'isActive:', isActive);
          }}
          onCanPlay={() => {
            // Only auto-play if this is the current active video
            if (isActive && index === currentVideo) {
              const videoElement = videoRefs.current[index];
              if (videoElement && videoElement.paused) {
                videoElement.play().catch(e => {
                  console.warn('Auto-play failed:', e);
                  videoElement.muted = true;
                  videoElement.play().catch(err => console.error('Muted autoplay failed:', err));
                });
              }
            }
          }}
          onPlay={() => console.log('Video playing:', index)}
          onPause={() => console.log('Video paused:', index)}
          onError={(e) => console.error('Video error:', e)}
        />

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

        {/* Back Button (only shown when coming from profile) */}
        {profileNavigation && (
          <div className="absolute top-4 left-4 z-20">
            <button
              onClick={handleBackToProfile}
              className="p-3 rounded-full bg-black/40 backdrop-blur-sm hover:bg-black/60 transition-all duration-200"
            >
              <ArrowLeft className="w-6 h-6 text-white" />
            </button>
          </div>
        )}

        {/* Source Indicator */}
        {profileNavigation && (
          <div className="absolute top-4 right-4 z-20">
            <div className="px-3 py-1 rounded-full bg-black/40 backdrop-blur-sm">
              <span className="text-white text-sm font-medium capitalize">
                {profileNavigation.source === 'videos' ? 'My Videos' : 
                 profileNavigation.source === 'liked' ? 'Liked Videos' : 'Saved Videos'}
              </span>
            </div>
          </div>
        )}

        {/* Video Counter */}
        {profileNavigation && (
          <div className="absolute top-16 right-4 z-20">
            <div className="px-2 py-1 rounded-full bg-black/40 backdrop-blur-sm">
              <span className="text-white text-xs">
                {index + 1} / {videos.length}
              </span>
            </div>
          </div>
        )}

        {/* Mute/Unmute Button */}
        <div className="absolute top-4 left-4 z-20">
          <button
            onClick={toggleMute}
            className="p-3 rounded-full bg-black/40 backdrop-blur-sm hover:bg-black/60 transition-all duration-200"
          >
            {isMuted ? (
              <VolumeX className="w-6 h-6 text-white" />
            ) : (
              <Volume2 className="w-6 h-6 text-white" />
            )}
          </button>
        </div>

        {/* Right Side Actions */}
        <div className="absolute right-3 bottom-24 flex flex-col items-center space-y-6 z-10">
          {/* Profile Avatar */}
          <div className="relative">
            <img
              src={video?.user?.avatar || "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150"}
              alt={video?.user?.username || "user"}
              className="w-12 h-12 rounded-full border-2 border-white object-cover"
              loading="lazy"
            />
            <button
              onClick={() => setIsFollowing(!isFollowing)}
              className={`absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-6 h-6 rounded-full border-2 border-white flex items-center justify-center text-xs font-bold transition-colors ${
                isFollowing ? "bg-gray-600" : "bg-red-500"
              }`}
            >
              {isFollowing ? "✓" : "+"}
            </button>
          </div>

          {/* Like Button */}
          <div className="flex flex-col items-center">
            <button
              onClick={() => handleLike(video._id)}
              className="p-3 rounded-full bg-black/20 backdrop-blur-sm hover:bg-black/40 transition-all duration-200 active:scale-95"
            >
              <Heart
                className={`w-7 h-7 transition-colors ${
                  isLiked ? "text-red-500 fill-red-500" : "text-white"
                }`}
              />
            </button>
            <span className="text-white text-xs mt-1 font-semibold">
              {likesCount.toLocaleString()}
            </span>
          </div>

          {/* Comment Button */}
          <div className="flex flex-col items-center">
            <button
              onClick={() => openCommentModal(video._id)}
              className="p-3 rounded-full bg-black/20 backdrop-blur-sm hover:bg-black/40 transition-all duration-200 active:scale-95"
            >
              <MessageCircle className="w-7 h-7 text-white" />
            </button>
            <span className="text-white text-xs mt-1 font-semibold">
              {commentsCount.toLocaleString()}
            </span>
          </div>

          {/* Share Button */}
          <div className="flex flex-col items-center">
            <button
              onClick={() => handleShare(video)}
              className="p-3 rounded-full bg-black/20 backdrop-blur-sm hover:bg-black/40 transition-all duration-200 active:scale-95"
            >
              <Share className="w-7 h-7 text-white" />
            </button>
            <span className="text-white text-xs mt-1 font-semibold">
              Share
            </span>
          </div>

          {/* Save Button */}
          <div className="flex flex-col items-center">
            <button
              onClick={() => handleSave(video._id)}
              className="p-3 rounded-full bg-black/20 backdrop-blur-sm hover:bg-black/40 transition-all duration-200 active:scale-95"
            >
              <Bookmark
                className={`w-7 h-7 transition-colors ${
                  isSaved ? "text-yellow-400 fill-yellow-400" : "text-white"
                }`}
              />
            </button>
            <span className="text-white text-xs mt-1 font-semibold">
              {isSaved ? "Saved" : "Save"}
            </span>
          </div>
        </div>

        {/* Bottom Content */}
        <div className="absolute bottom-4 left-4 right-20 text-white z-10">
          <div className="space-y-2 mb-[80px]">
            <div className="flex items-center space-x-2">
              <span className="font-bold text-lg">
                @{video?.user?.username || "unknown"}
              </span>
              <span className="text-sm opacity-80">•</span>
              <span className="text-sm opacity-80">
                {video.createdAt ? new Date(video.createdAt).toLocaleDateString() : '2h ago'}
              </span>
            </div>
            <p className="text-sm leading-tight pr-4">
              {video?.description || ""}
            </p>
            {video?.hashtags && video.hashtags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {video.hashtags.map((tag, index) => (
                  <span key={index} className="text-xs text-blue-300 font-medium">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  });

  // Memoized Comment Modal Component
  const CommentModal = React.memo(() => {
    const activeVideo = videos.find(v => v._id === activeVideoId);
    const videoComments = comments[activeVideoId] || [];

    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
        <div className="bg-white w-full h-2/3 rounded-t-3xl flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <h3 className="text-lg font-semibold text-gray-800">
              {videoComments.length} Comments
            </h3>
            <button
              onClick={closeCommentModal}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          {/* Comments List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {videoComments.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <MessageCircle className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>No comments yet</p>
                <p className="text-sm">Be the first to comment!</p>
              </div>
            ) : (
              videoComments.map((comment, index) => (
                <div key={comment._id || index} className="flex space-x-3">
                  <img
                    src={comment.user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(comment.user?.username || 'User')}&background=random&color=fff&size=200`}
                    alt={comment.user?.username || "user"}
                    className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                    loading="lazy"
                  />
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold text-sm text-gray-800">
                        {comment.user?.username || "Anonymous"}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(comment.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 mt-1">
                      {comment.text}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Comment Input */}
          <div className="p-4 border-t bg-gray-50 mb-[78px]">
            <div className="flex items-center space-x-3">
              <img
                src={currentUser?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser?.username || 'You')}&background=random&color=fff&size=200`}
                alt="You"
                className="w-8 h-8 rounded-full object-cover flex-shrink-0"
              />
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleCommentSubmit(e);
                    }
                  }}
                  placeholder="Add a comment..."
                  className="w-full px-4 py-2 pr-12 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={commentLoading}
                  maxLength={500}
                />
                <button
                  onClick={handleCommentSubmit}
                  disabled={!newComment.trim() || commentLoading}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1.5 rounded-full bg-blue-500 text-white disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-blue-600 transition-colors"
                >
                  {commentLoading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  });

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-black text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-lg mb-2">Loading videos...</p>
          <p className="text-sm text-gray-400">Optimizing your experience</p>
        </div>
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <div className="h-screen flex items-center justify-center bg-black text-white">
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <MessageCircle className="w-8 h-8 text-gray-400" />
          </div>
          <p className="text-lg mb-2">No videos available</p>
          <p className="text-sm text-gray-400">Check back later for new content</p>
          <button 
            onClick={fetchVideos}
            className="mt-4 px-6 py-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div ref={containerRef} className="h-screen overflow-y-auto snap-y snap-mandatory scrollbar-hide">
        {videos.map((video, index) => (
          <VideoPlayer
            key={video._id}
            video={video}
            index={index}
            isActive={index === currentVideo}
          />
        ))}
      </div>

      {/* Comment Modal */}
      {showCommentModal && <CommentModal />}
    </>
  );
};

export default HomeScreen;