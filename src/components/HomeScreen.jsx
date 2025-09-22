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
  const intersectionObserver = useRef(null);

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

  // Enhanced fetch with better error handling and connection detection
  const fetchWithRetry = useCallback(async (url, options = {}, retries = 2) => {
    // Check connection first
    if (!navigator.onLine) {
      throw new Error('No internet connection');
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetch(url, {
          ...options,
          signal: controller.signal,
          headers: {
            ...API_CONFIG.getHeaders(),
            ...options.headers
          }
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          // Handle specific HTTP errors
          if (response.status === 504 || response.status === 502) {
            throw new Error('Server temporarily unavailable');
          }
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        return await response.json();
      } catch (error) {
        clearTimeout(timeoutId);
        console.warn(`Attempt ${i + 1} failed:`, error.message);
        
        if (error.name === 'AbortError') {
          throw new Error('Request timeout - slow connection detected');
        }
        
        if (i === retries - 1) throw error;
        
        // Shorter backoff for free hosting
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
      }
    }
  }, [API_CONFIG]);

  // Optimized mock data with smaller, faster-loading videos
  const generateMockVideos = useCallback(() => {
    return [
      {
        _id: '1',
        url: 'https://sample-videos.com/zip/10/mp4/SampleVideo_640x360_1mb.mp4',
        thumbnail: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=400&q=75&auto=format',
        user: { _id: '1', username: 'johndoe', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&q=75&auto=format' },
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
        url: 'https://sample-videos.com/zip/10/mp4/SampleVideo_640x360_2mb.mp4',
        thumbnail: 'https://images.unsplash.com/photo-1526336024174-e58f5cdd8e13?w=400&q=75&auto=format',
        user: { _id: '2', username: 'janesmth', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&q=75&auto=format' },
        description: 'Creative animation showcase ✨ Follow for more!',
        hashtags: ['#animation', '#creative', '#art'],
        likesCount: 2567,
        commentsCount: 89,
        createdAt: new Date(Date.now() - 3600000).toISOString(),
        isLiked: true,
        isSaved: false
      }
    ];
  }, []);

  // Keep Render backend warm
  useEffect(() => {
    const keepWarm = () => {
      fetch(`${API_CONFIG.baseUrl}/health`, { 
        method: 'GET',
        headers: API_CONFIG.getHeaders()
      }).catch(() => {}); // Silent fail
    };

    // Initial ping
    keepWarm();
    
    // Keep warm every 10 minutes
    const interval = setInterval(keepWarm, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, [API_CONFIG]);

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

  // Enhanced video fetching with progressive loading
  const fetchVideos = useCallback(async () => {
    if (fetchingRef.current) return;
    
    fetchingRef.current = true;
    setLoading(true);

    try {
      // Check cache first - longer cache for free hosting
      const cachedVideos = sessionStorage.getItem('cachedVideos');
      const cacheTimestamp = sessionStorage.getItem('videoCacheTime');
      const now = Date.now();
      
      // Use cache if it's less than 15 minutes old (longer for free hosting)
      if (cachedVideos && cacheTimestamp && (now - parseInt(cacheTimestamp)) < 15 * 60 * 1000) {
        console.log('Loading videos from cache');
        const parsedVideos = JSON.parse(cachedVideos);
        setVideos(parsedVideos);
        setLoading(false);
        fetchingRef.current = false;
        return;
      }

      console.log('Fetching fresh videos from API');
      
      try {
        // Show loading state with mock data first for better UX
        const mockVideos = generateMockVideos();
        setVideos(mockVideos);
        setLoading(false);
        
        // Then fetch real data in background
        const data = await fetchWithRetry(`${API_CONFIG.baseUrl}/videos`, {}, 1); // Only 1 retry for speed
        
        if (data && Array.isArray(data)) {
          // Optimize video URLs and thumbnails
          const optimizedVideos = data.map(video => ({
            ...video,
            // Add size parameter to reduce bandwidth
            url: video.url + (video.url.includes('?') ? '&' : '?') + 'quality=720p',
            thumbnail: video.thumbnail || `${video.url}#t=1`, // Use video frame as thumbnail
            user: {
              ...video.user,
              // Optimize avatar size
              avatar: video.user?.avatar ? 
                video.user.avatar.replace(/w=\d+/, 'w=100').replace(/h=\d+/, 'h=100') : 
                `https://ui-avatars.com/api/?name=${encodeURIComponent(video.user?.username || 'User')}&size=100&background=random&color=fff`
            }
          }));

          sessionStorage.setItem('cachedVideos', JSON.stringify(optimizedVideos));
          sessionStorage.setItem('videoCacheTime', now.toString());
          setVideos(optimizedVideos);
          console.log(`Loaded ${optimizedVideos.length} videos successfully`);
        }
      } catch (apiError) {
        console.log('API error, using mock data:', apiError.message);
        // Keep mock data that was already loaded
      }
      
    } catch (error) {
      console.error("Failed to fetch videos:", error);
      
      // Try cached data as fallback
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

  // Optimized video preloading with intersection observer
  useEffect(() => {
    intersectionObserver.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const video = entry.target;
          if (entry.isIntersecting) {
            // Preload video when it's about to come into view
            video.preload = 'metadata';
            if (video.readyState === 0) {
              video.load();
            }
          } else {
            // Unload video when it's far from view to save memory
            if (!video.paused) {
              video.pause();
            }
            // Clear video data for better memory management
            if (Math.abs(parseInt(entry.target.dataset.index) - currentVideo) > 2) {
              video.src = '';
              video.preload = 'none';
            }
          }
        });
      },
      {
        rootMargin: '50px 0px', // Start preloading 50px before video enters viewport
        threshold: 0.1
      }
    );

    return () => {
      if (intersectionObserver.current) {
        intersectionObserver.current.disconnect();
      }
    };
  }, [currentVideo]);

  // Enhanced video playback management
  const manageVideoPlayback = useCallback((newCurrentVideo) => {
    console.log('Managing video playback for video:', newCurrentVideo);

    Object.entries(videoRefs.current).forEach(([index, videoElement]) => {
      if (!videoElement) return;
      
      const videoIndex = parseInt(index);
      
      if (videoIndex === newCurrentVideo) {
        // Current video - play it
        videoElement.muted = isMuted;
        videoElement.currentTime = 0; // Reset to beginning
        
        const playPromise = videoElement.play();
        if (playPromise !== undefined) {
          playPromise.catch(err => {
            console.warn("Autoplay failed:", err);
            videoElement.muted = true;
            setIsMuted(true);
            videoElement.play().catch(e => console.error("Muted autoplay also failed:", e));
          });
        }
      } else if (Math.abs(videoIndex - newCurrentVideo) <= 1) {
        // Adjacent videos - preload but pause
        videoElement.pause();
        if (videoElement.preload !== 'metadata') {
          videoElement.preload = 'metadata';
        }
      } else {
        // Far videos - stop and unload
        videoElement.pause();
        videoElement.currentTime = 0;
        if (Math.abs(videoIndex - newCurrentVideo) > 2) {
          videoElement.preload = 'none';
        }
      }
    });
  }, [isMuted]);

  // Handle mute/unmute functionality
  const toggleMute = useCallback(() => {
    const newMutedState = !isMuted;
    setIsMuted(newMutedState);

    // Apply only to current video for better performance
    const currentVideoElement = videoRefs.current[currentVideo];
    if (currentVideoElement) {
      currentVideoElement.muted = newMutedState;
    }

    console.log("Toggled mute:", newMutedState);
  }, [isMuted, currentVideo]);

  // Optimized scroll handling with better throttling
  useEffect(() => {
    if (profileNavigation) return;

    const container = containerRef.current;
    if (!container) return;

    let ticking = false;
    let lastScrollTime = 0;

    const handleScroll = () => {
      const now = Date.now();
      if (now - lastScrollTime < 100) return; // Throttle to 10fps
      
      if (!ticking) {
        requestAnimationFrame(() => {
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
          ticking = false;
          lastScrollTime = now;
        });
        ticking = true;
      }
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, [currentVideo, videos.length, profileNavigation]);

  // Auto-play management when currentVideo changes
  useEffect(() => {
    if (videos.length > 0 && !loading) {
      const timer = setTimeout(() => {
        manageVideoPlayback(currentVideo);
      }, 200); // Slightly longer delay for free hosting
      
      return () => clearTimeout(timer);
    }
  }, [currentVideo, videos.length, loading, manageVideoPlayback]);

  // Initial auto-play when videos first load
  useEffect(() => {
    if (videos.length > 0 && !loading && currentVideo === 0) {
      const timer = setTimeout(() => {
        console.log('Initial video load, starting playback');
        manageVideoPlayback(0);
      }, 1000); // Longer delay for initial load
      
      return () => clearTimeout(timer);
    }
  }, [videos.length, loading, currentVideo, manageVideoPlayback]);

  // Simplified comment fetching
  const fetchComments = useCallback(async (videoId) => {
    if (comments[videoId]) return;

    try {
      const data = await fetchWithRetry(`${API_CONFIG.baseUrl}/videos/${videoId}/comments`, {}, 1);
      setComments(prev => ({
        ...prev,
        [videoId]: data || []
      }));
    } catch (error) {
      console.error("Error fetching comments:", error);
      setComments(prev => ({
        ...prev,
        [videoId]: []
      }));
    }
  }, [comments, API_CONFIG, fetchWithRetry]);

  // Optimized handlers with debouncing
  const handleLike = useCallback(async (videoId) => {
    const currentVideoData = videos.find(v => v._id === videoId);
    if (!currentVideoData) return;
    
    const wasLiked = currentVideoData.isLiked;
    const newLikesCount = wasLiked 
      ? Math.max(0, (currentVideoData.likesCount || 0) - 1)
      : (currentVideoData.likesCount || 0) + 1;

    // Optimistic update
    setVideos(prev => prev.map(video => 
      video._id === videoId 
        ? { ...video, isLiked: !wasLiked, likesCount: newLikesCount }
        : video
    ));

    // Background API call with no retry for speed
    try {
      await fetchWithRetry(`${API_CONFIG.baseUrl}/videos/${videoId}/like`, {
        method: "POST"
      }, 1);
    } catch (error) {
      console.error("Error liking video:", error);
    }
  }, [videos, API_CONFIG, fetchWithRetry]);

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
      await fetchWithRetry(`${API_CONFIG.baseUrl}/videos/${videoId}/save`, {
        method: "POST"
      }, 1);
    } catch (error) {
      console.error("Error saving video:", error);
    }
  }, [videos, API_CONFIG, fetchWithRetry]);

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
      }
    } catch (error) {
      console.error('Error sharing:', error);
    }
  }, []);

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
        avatar: currentUser?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser?.username || 'You')}&size=100&background=random&color=fff`
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
      await fetchWithRetry(`${API_CONFIG.baseUrl}/videos/${activeVideoId}/comments`, {
        method: "POST",
        body: JSON.stringify({ text: commentText })
      }, 1);
      
      setVideos(prev => prev.map(video => 
        video._id === activeVideoId 
          ? { ...video, commentsCount: (video.commentsCount || 0) + 1 }
          : video
      ));
    } catch (error) {
      console.error("Error posting comment:", error);
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
    const [videoError, setVideoError] = useState(false);
    const [videoLoaded, setVideoLoaded] = useState(false);
    
    const isLiked = video.isLiked || false;
    const isSaved = video.isSaved || false;
    const likesCount = video.likesCount || 0;
    const commentsCount = video.commentsCount || 0;

    return (
      <div className="relative h-screen w-full bg-black overflow-hidden snap-start flex-shrink-0">
        {!videoLoaded && !videoError && (
          <div className="absolute inset-0 bg-gray-900 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
              <p className="text-white text-sm">Loading video...</p>
            </div>
          </div>
        )}

        {videoError && (
          <div className="absolute inset-0 bg-gray-900 flex items-center justify-center">
            <div className="text-center">
              <p className="text-white text-lg mb-2">Video unavailable</p>
              <p className="text-gray-400 text-sm">This video couldn't be loaded</p>
            </div>
          </div>
        )}

        <video
          ref={(el) => {
            if (el) {
              videoRefs.current[index] = el;
              // Set up intersection observer
              if (intersectionObserver.current) {
                el.dataset.index = index;
                intersectionObserver.current.observe(el);
              }
            }
          }}
          className="absolute inset-0 w-full h-full object-cover"
          src={video?.url}
          loop
          playsInline
          preload="none" // Start with no preload for better initial performance
          poster={video?.thumbnail}
          onLoadedData={() => {
            setVideoLoaded(true);
            console.log('Video loaded for index:', index);
          }}
          onError={(e) => {
            console.error('Video error:', e);
            setVideoError(true);
          }}
          onPlay={() => console.log('Video playing:', index)}
          onPause={() => console.log('Video paused:', index)}
        />

        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

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

        {profileNavigation && (
          <div className="absolute top-16 right-4 z-20">
            <div className="px-2 py-1 rounded-full bg-black/40 backdrop-blur-sm">
              <span className="text-white text-xs">
                {index + 1} / {videos.length}
              </span>
            </div>
          </div>
        )}

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

        <div className="absolute right-3 bottom-24 flex flex-col items-center space-y-6 z-10">
          <div className="relative">
            <img
              src={video?.user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(video?.user?.username || 'User')}&size=100&background=random&color=fff`}
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

  // Simplified Comment Modal
  const CommentModal = React.memo(() => {
    const videoComments = comments[activeVideoId] || [];

    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
        <div className="bg-white w-full h-2/3 rounded-t-3xl flex flex-col">
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
                    src={comment.user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(comment.user?.username || 'User')}&background=random&color=fff&size=100`}
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

          <div className="p-4 border-t bg-gray-50 mb-[78px]">
            <div className="flex items-center space-x-3">
              <img
                src={currentUser?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser?.username || 'You')}&background=random&color=fff&size=100`}
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
          <p className="text-sm text-gray-400">Preparing content...</p>
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
          <p className="text-sm text-gray-400">Check your connection and try again</p>
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

      {showCommentModal && <CommentModal />}
    </>
  );
};

export default HomeScreen;