import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Heart, MessageCircle, Share, Bookmark, Send, X, ArrowLeft, Volume2, VolumeX } from "lucide-react";

// Skeleton Loading Component
const VideoSkeleton = () => (
  <div className="relative h-screen w-full bg-gray-900 overflow-hidden snap-start flex-shrink-0 animate-pulse">
    {/* Video placeholder */}
    <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-900">
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
      
      {/* Shimmer effect */}
      <div className="absolute inset-0 opacity-30">
        <div className="h-full w-full bg-gradient-to-r from-transparent via-white/10 to-transparent transform -skew-x-12 animate-shimmer"></div>
      </div>
    </div>

    {/* Right side actions skeleton */}
    <div className="absolute right-3 bottom-24 flex flex-col items-center space-y-6 z-10">
      {/* Profile skeleton */}
      <div className="relative">
        <div className="w-12 h-12 rounded-full bg-gray-700"></div>
        <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-6 h-6 rounded-full bg-gray-600"></div>
      </div>
      
      {/* Action buttons skeleton */}
      {[...Array(4)].map((_, i) => (
        <div key={i} className="flex flex-col items-center">
          <div className="w-12 h-12 rounded-full bg-gray-700"></div>
          <div className="w-6 h-3 bg-gray-700 rounded mt-1"></div>
        </div>
      ))}
    </div>

    {/* Bottom content skeleton */}
    <div className="absolute bottom-4 left-4 right-20 z-10 mb-[80px]">
      <div className="space-y-3">
        <div className="flex items-center space-x-2">
          <div className="w-20 h-4 bg-gray-700 rounded"></div>
          <div className="w-1 h-1 bg-gray-600 rounded-full"></div>
          <div className="w-12 h-3 bg-gray-700 rounded"></div>
        </div>
        <div className="space-y-2">
          <div className="w-full h-3 bg-gray-700 rounded"></div>
          <div className="w-3/4 h-3 bg-gray-700 rounded"></div>
        </div>
        <div className="flex gap-2">
          <div className="w-16 h-3 bg-gray-700 rounded"></div>
          <div className="w-20 h-3 bg-gray-700 rounded"></div>
        </div>
      </div>
    </div>

    {/* Mute button skeleton */}
    <div className="absolute top-4 left-4 z-20">
      <div className="w-12 h-12 rounded-full bg-gray-700"></div>
    </div>
  </div>
);

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
  const playbackStateRef = useRef({}); // Track playback state for each video

  // Preload adjacent videos for smoother experience
  const PRELOAD_RANGE = 2;

  // Memoized API config
  const API_CONFIG = useMemo(() => ({
    baseUrl: 'https://api.theclipstream.com/api',
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

  // Enhanced fetch function with better error handling and caching
  const fetchWithRetry = useCallback(async (url, options = {}, retries = 2) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout

    try {
      for (let i = 0; i < retries; i++) {
        try {
          const response = await fetch(url, {
            ...options,
            headers: {
              ...API_CONFIG.getHeaders(),
              ...options.headers
            },
            signal: controller.signal
          });
          
          clearTimeout(timeoutId);
          
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
          
          return await response.json();
        } catch (error) {
          if (error.name === 'AbortError') {
            throw new Error('Request timeout');
          }
          console.warn(`Attempt ${i + 1} failed:`, error.message);
          if (i === retries - 1) throw error;
          
          // Shorter backoff for better UX
          await new Promise(resolve => setTimeout(resolve, 500 * (i + 1)));
        }
      }
    } finally {
      clearTimeout(timeoutId);
    }
  }, [API_CONFIG]);

  // Enhanced mock data generator
  const generateMockVideos = useCallback(() => {
    const mockUsers = [
      { _id: '1', username: 'johndoe', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150' },
      { _id: '2', username: 'janesmth', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150' },
      { _id: '3', username: 'mikech', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150' },
      { _id: '4', username: 'sarahwilson', avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b550?w=150' },
      { _id: '5', username: 'alexchen', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150' }
    ];

    const mockVideos = [
      'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
      'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
      'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
      'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4',
      'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4'
    ];

    const descriptions = [
      'Amazing nature documentary clip! 🌟 #nature #wildlife',
      'Creative animation showcase ✨ Follow for more!',
      'Epic action sequence! What do you think? 🔥',
      'Adventure time! Love this content 🚗',
      'Stunning visuals and storytelling 🎬'
    ];

    const hashtags = [
      ['#nature', '#wildlife', '#amazing'],
      ['#animation', '#creative', '#art'],
      ['#action', '#epic', '#fire'],
      ['#adventure', '#outdoor', '#travel'],
      ['#cinema', '#visual', '#story']
    ];

    return mockVideos.map((url, index) => ({
      _id: `${index + 1}`,
      url,
      thumbnail: `https://images.unsplash.com/photo-${1516035069371 + index}?w=400`,
      user: mockUsers[index],
      description: descriptions[index],
      hashtags: hashtags[index],
      likesCount: Math.floor(Math.random() * 5000) + 100,
      commentsCount: Math.floor(Math.random() * 200) + 10,
      createdAt: new Date(Date.now() - Math.random() * 86400000 * 7).toISOString(),
      isLiked: Math.random() > 0.7,
      isSaved: Math.random() > 0.8
    }));
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

  // Enhanced video fetching with better caching and performance
  const fetchVideos = useCallback(async () => {
    if (fetchingRef.current) return;
    
    fetchingRef.current = true;
    setLoading(true);

    try {
      // Check cache first with shorter expiry for fresher content
      const cachedVideos = sessionStorage.getItem('cachedVideos');
      const cacheTimestamp = sessionStorage.getItem('videoCacheTime');
      const now = Date.now();
      const cacheExpiry = 3 * 60 * 1000; // 3 minutes cache
      
      if (cachedVideos && cacheTimestamp && (now - parseInt(cacheTimestamp)) < cacheExpiry) {
        console.log('Loading videos from cache');
        const parsedVideos = JSON.parse(cachedVideos);
        setVideos(parsedVideos);
        setLoading(false);
        fetchingRef.current = false;
        return;
      }

      console.log('Fetching fresh videos...');
      
      // Show skeleton while loading
      setTimeout(() => {
        if (loading) {
          console.log('Loading taking longer, showing skeleton...');
        }
      }, 1000);

      try {
        // Parallel fetch with timeout
        const fetchPromise = fetchWithRetry(`${API_CONFIG.baseUrl}/videos`);
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('API timeout')), 5000)
        );

        const data = await Promise.race([fetchPromise, timeoutPromise]);
        
        if (data && Array.isArray(data) && data.length > 0) {
          sessionStorage.setItem('cachedVideos', JSON.stringify(data));
          sessionStorage.setItem('videoCacheTime', now.toString());
          setVideos(data);
          console.log(`Loaded ${data.length} videos successfully`);
        } else {
          throw new Error('Invalid API response');
        }
      } catch (apiError) {
        console.log('API not available, using mock data:', apiError.message);
        const mockVideos = generateMockVideos();
        setVideos(mockVideos);
        sessionStorage.setItem('cachedVideos', JSON.stringify(mockVideos));
        sessionStorage.setItem('videoCacheTime', now.toString());
      }
      
    } catch (error) {
      console.error("Failed to fetch videos:", error);
      
      // Fallback to cache or mock data
      const cachedVideos = sessionStorage.getItem('cachedVideos');
      if (cachedVideos) {
        console.log('Using cached videos as fallback');
        setVideos(JSON.parse(cachedVideos));
      } else {
        console.log('Using mock data as final fallback');
        setVideos(generateMockVideos());
      }
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, [API_CONFIG, fetchWithRetry, generateMockVideos, loading]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    };
  }, []);

  // Enhanced video playback management with state preservation
  const manageVideoPlayback = useCallback((newCurrentVideo) => {
    console.log('Managing video playback for video:', newCurrentVideo);

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
        // Current video - ensure it plays and respects mute state
        videoElement.muted = isMuted;
        
        // Only reset time if video wasn't playing before (avoid interrupting ongoing playback)
        if (videoElement.paused || videoElement.currentTime === 0) {
          videoElement.currentTime = 0;
        }
        
        const playPromise = videoElement.play();
        if (playPromise !== undefined) {
          playPromise.catch(err => {
            console.warn("Autoplay failed, trying muted:", err);
            videoElement.muted = true;
            setIsMuted(true);
            videoElement.play().catch(e => console.error("Muted autoplay also failed:", e));
          });
        }
        
        // Store playback state
        playbackStateRef.current[videoIndex] = { 
          isPlaying: true, 
          wasMuted: videoElement.muted,
          currentTime: videoElement.currentTime 
        };
      } else if (videosToPreload.includes(videoIndex)) {
        // Adjacent videos - preload but pause
        videoElement.pause();
        if (videoElement.readyState < 2) {
          videoElement.load();
        }
        playbackStateRef.current[videoIndex] = { 
          isPlaying: false,
          currentTime: videoElement.currentTime 
        };
      } else {
        // Distant videos - pause and reset
        videoElement.pause();
        videoElement.currentTime = 0;
        delete playbackStateRef.current[videoIndex];
      }
    });
  }, [isMuted, videos.length]);

  // Enhanced mute toggle that preserves video playback
  const toggleMute = useCallback(() => {
    const newMutedState = !isMuted;
    setIsMuted(newMutedState);

    // Apply to current video immediately without affecting playback
    const currentVideoElement = videoRefs.current[currentVideo];
    if (currentVideoElement) {
      const wasPlaying = !currentVideoElement.paused;
      currentVideoElement.muted = newMutedState;
      
      // Ensure video continues playing if it was playing
      if (wasPlaying && currentVideoElement.paused) {
        currentVideoElement.play().catch(e => console.warn("Resume play failed:", e));
      }
    }

    console.log("Toggled mute:", newMutedState);
  }, [isMuted, currentVideo]);

  // Enhanced scroll handling
  useEffect(() => {
    if (profileNavigation) return;

    const container = containerRef.current;
    if (!container) return;

    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          if (scrollTimeoutRef.current) {
            clearTimeout(scrollTimeoutRef.current);
          }

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
          }, 50); // Reduced debounce for more responsive scrolling

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
      const timer = setTimeout(() => {
        manageVideoPlayback(currentVideo);
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [currentVideo, videos.length, loading, manageVideoPlayback]);

  // Initial auto-play when videos first load
  useEffect(() => {
    if (videos.length > 0 && !loading) {
      const timer = setTimeout(() => {
        console.log('Initial video load, starting playback');
        manageVideoPlayback(currentVideo);
      }, 150);
      
      return () => clearTimeout(timer);
    }
  }, [videos.length, loading, currentVideo, manageVideoPlayback]);

  // Enhanced comment fetching
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
      // Mock comments for demo
      const mockComments = [
        {
          _id: `${videoId}-1`,
          text: "Amazing content! 🔥",
          user: { username: "viewer1", avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150" },
          createdAt: new Date().toISOString()
        },
        {
          _id: `${videoId}-2`,
          text: "Love this! Keep it up 💯",
          user: { username: "fan2023", avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150" },
          createdAt: new Date(Date.now() - 3600000).toISOString()
        }
      ];
      
      setComments(prev => ({
        ...prev,
        [videoId]: mockComments
      }));
    }
  }, [comments, API_CONFIG, fetchWithRetry]);

  // Enhanced like handler that preserves video playback
  const handleLike = useCallback(async (videoId) => {
    const currentVideoData = videos.find(v => v._id === videoId);
    if (!currentVideoData) return;
    
    const wasLiked = currentVideoData.isLiked;
    const newLikesCount = wasLiked 
      ? (currentVideoData.likesCount || 0) - 1 
      : (currentVideoData.likesCount || 0) + 1;

    // Preserve video playback state
    const currentVideoElement = videoRefs.current[currentVideo];
    const wasPlaying = currentVideoElement && !currentVideoElement.paused;

    // Optimistic update
    setVideos(prev => prev.map(video => 
      video._id === videoId 
        ? { ...video, isLiked: !wasLiked, likesCount: newLikesCount }
        : video
    ));

    // Ensure video continues playing if it was playing
    if (wasPlaying && currentVideoElement && currentVideoElement.paused) {
      setTimeout(() => {
        currentVideoElement.play().catch(e => console.warn("Resume after like failed:", e));
      }, 50);
    }

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
      // Error handling - could revert optimistic update here if needed
    }
  }, [videos, API_CONFIG, fetchWithRetry, currentVideo]);

  // Enhanced save handler that preserves video playback
  const handleSave = useCallback(async (videoId) => {
    const currentVideoData = videos.find(v => v._id === videoId);
    if (!currentVideoData) return;
    
    const wasSaved = currentVideoData.isSaved;

    // Preserve video playback state
    const currentVideoElement = videoRefs.current[currentVideo];
    const wasPlaying = currentVideoElement && !currentVideoElement.paused;

    // Optimistic update
    setVideos(prev => prev.map(video => 
      video._id === videoId 
        ? { ...video, isSaved: !wasSaved }
        : video
    ));

    // Ensure video continues playing if it was playing
    if (wasPlaying && currentVideoElement && currentVideoElement.paused) {
      setTimeout(() => {
        currentVideoElement.play().catch(e => console.warn("Resume after save failed:", e));
      }, 50);
    }

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
  }, [videos, API_CONFIG, fetchWithRetry, currentVideo]);

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

  // Enhanced comment submission that preserves video playback
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

    // Preserve video playback state
    const currentVideoElement = videoRefs.current[currentVideo];
    const wasPlaying = currentVideoElement && !currentVideoElement.paused;

    setComments(prev => ({
      ...prev,
      [activeVideoId]: [optimisticComment, ...(prev[activeVideoId] || [])]
    }));
    
    setNewComment("");
    setCommentLoading(true);

    // Ensure video continues playing if it was playing
    if (wasPlaying && currentVideoElement && currentVideoElement.paused) {
      setTimeout(() => {
        currentVideoElement.play().catch(e => console.warn("Resume after comment failed:", e));
      }, 50);
    }

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
  }, [newComment, activeVideoId, commentLoading, currentUser, API_CONFIG, fetchWithRetry, currentVideo]);

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

  // Enhanced VideoPlayer component
  const VideoPlayer = React.memo(({ video, isActive, index }) => {
    const [isFollowing, setIsFollowing] = useState(false);
    
    const isLiked = video.isLiked || false;
    const isSaved = video.isSaved || false;
    const likesCount = video.likesCount || (Array.isArray(video.likes) ? video.likes.length : (video.likes || 0));
    const commentsCount = video.commentsCount || 0;

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
            if (isActive && index === currentVideo) {
              const videoElement = videoRefs.current[index];
              if (videoElement && videoElement.paused) {
                videoElement.play().catch(e => {
                  console.warn('Auto-play failed:', e);
                  videoElement.muted = true;
                  setIsMuted(true);
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

  // Enhanced Comment Modal Component
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

  // Enhanced loading screen with multiple skeletons
  if (loading) {
    return (
      <div className="h-screen overflow-hidden">
        <style jsx>{`
          @keyframes shimmer {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
          }
          .animate-shimmer {
            animation: shimmer 2s infinite;
          }
        `}</style>
        <div className="relative">
          <VideoSkeleton />
          {/* Loading text overlay */}
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 z-20">
            <div className="text-center text-white">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
              <p className="text-sm font-medium">Loading amazing videos...</p>
            </div>
          </div>
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
          <p className="text-sm text-gray-400 mb-4">Check back later for new content</p>
          <button 
            onClick={fetchVideos}
            className="px-6 py-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors disabled:opacity-50"
            disabled={fetchingRef.current}
          >
            {fetchingRef.current ? 'Loading...' : 'Retry'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <style jsx>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animate-shimmer {
          animation: shimmer 2s infinite;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
      
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