import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Heart, MessageCircle, Share, Bookmark, Send, X, ArrowLeft, Volume2, VolumeX } from "lucide-react";

// Enhanced Skeleton Loading Component with improved shimmer effect
const VideoSkeleton = () => (
  <div className="relative h-screen w-full bg-gray-900 overflow-hidden snap-start flex-shrink-0">
    {/* Video placeholder with shimmer */}
    <div className="absolute inset-0 bg-gradient-to-br from-gray-800 via-gray-700 to-gray-800 animate-shimmer">
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
    </div>

    {/* Right side actions skeleton */}
    <div className="absolute right-3 bottom-24 flex flex-col items-center space-y-6 z-10">
      {/* Profile skeleton */}
      <div className="relative">
        <div className="w-12 h-12 rounded-full bg-gray-700 animate-shimmer"></div>
        <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-6 h-6 rounded-full bg-gray-600 animate-shimmer"></div>
      </div>

      {/* Action buttons skeleton */}
      {[...Array(4)].map((_, i) => (
        <div key={i} className="flex flex-col items-center">
          <div className="w-12 h-12 rounded-full bg-gray-700 animate-shimmer"></div>
          <div className="w-6 h-3 bg-gray-700 rounded mt-1 animate-shimmer"></div>
        </div>
      ))}
    </div>

    {/* Bottom content skeleton */}
    <div className="absolute bottom-4 left-4 right-20 z-10 mb-[80px]">
      <div className="space-y-3">
        <div className="flex items-center space-x-2">
          <div className="w-20 h-4 bg-gray-700 rounded animate-shimmer"></div>
          <div className="w-1 h-1 bg-gray-600 rounded-full animate-shimmer"></div>
          <div className="w-12 h-3 bg-gray-700 rounded animate-shimmer"></div>
        </div>
        <div className="space-y-2">
          <div className="w-full h-3 bg-gray-700 rounded animate-shimmer"></div>
          <div className="w-3/4 h-3 bg-gray-700 rounded animate-shimmer"></div>
        </div>
        <div className="flex gap-2">
          <div className="w-16 h-3 bg-gray-700 rounded animate-shimmer"></div>
          <div className="w-20 h-3 bg-gray-700 rounded animate-shimmer"></div>
        </div>
      </div>
    </div>

    {/* Mute button skeleton */}
    <div className="absolute top-4 left-4 z-20">
      <div className="w-12 h-12 rounded-full bg-gray-700 animate-shimmer"></div>
    </div>

    {/* Loading indicator */}
    <div className="absolute inset-0 flex items-center justify-center bg-black/30 z-30">
      <div className="text-center text-white">
        <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <p className="text-sm font-medium opacity-90">Loading videos...</p>
      </div>
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

  // Enhanced fetching states
  const [retryCount, setRetryCount] = useState(0);
  const [lastFetchTime, setLastFetchTime] = useState(0);
  const [networkError, setNetworkError] = useState(false);

  // Profile navigation state
  const [profileNavigation, setProfileNavigation] = useState(null);

  // Performance optimization refs
  const videoRefs = useRef({});
  const fetchingRef = useRef(false);
  const retryTimeoutRef = useRef(null);
  const containerRef = useRef(null);
  const scrollTimeoutRef = useRef(null);
  const playbackStateRef = useRef({});
  const abortControllerRef = useRef(null);

  // Enhanced constants for better performance
  const PRELOAD_RANGE = 2;
  const MAX_RETRIES = 3;
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  const FETCH_TIMEOUT = 10000; // 10 seconds
  const MIN_FETCH_INTERVAL = 2000; // 2 seconds minimum between fetches

  // Memoized API config with better error handling
  const API_CONFIG = useMemo(() => ({
    baseUrl: 'https://api.theclipstream.com/api',
    getHeaders: () => {
      const token = localStorage.getItem('token');
      return {
        ...(token && { 'Authorization': `Bearer ${token}` }),
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      };
    }
  }), []);

    // ✅ put formatCount inside
  const formatCount = (count) => {
    if (!count) return "0";
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  // Get current user data
  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        setCurrentUser(JSON.parse(userData));
      } catch (error) {
        console.error('Error parsing user data:', error);
        localStorage.removeItem('user'); // Clean up corrupted data
      }
    }
  }, []);

  // Enhanced fetch function with better retry logic and error handling
  const fetchWithRetry = useCallback(async (url, options = {}) => {
    // Cancel any existing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    const timeoutId = setTimeout(() => {
      controller.abort();
    }, FETCH_TIMEOUT);

    try {
      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
          console.log(`Fetch attempt ${attempt}/${MAX_RETRIES} for ${url}`);

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
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
          }

          const data = await response.json();
          setNetworkError(false);
          return data;

        } catch (error) {
          if (error.name === 'AbortError') {
            throw new Error('Request cancelled or timed out');
          }

          console.warn(`Attempt ${attempt}/${MAX_RETRIES} failed:`, error.message);

          if (attempt === MAX_RETRIES) {
            setNetworkError(true);
            throw error;
          }

          // Progressive backoff: 1s, 2s, 4s
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 4000);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    } finally {
      clearTimeout(timeoutId);
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
    }
  }, [API_CONFIG]);

  // Enhanced mock data generator with better diversity
  const generateMockVideos = useCallback(() => {
    const mockUsers = [
      { _id: '1', username: 'johndoe', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150' },
      { _id: '2', username: 'janesmth', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150' },
      { _id: '3', username: 'mikech', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150' },
      { _id: '4', username: 'sarahwilson', avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b550?w=150' },
      { _id: '5', username: 'alexchen', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150' },
      { _id: '6', username: 'emmadavis', avatar: 'https://images.unsplash.com/photo-1544725176-7c40e5a71c5e?w=150' },
      { _id: '7', username: 'ryanlee', avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150' },
      { _id: '8', username: 'sophiabrown', avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150' }
    ];

    const mockVideos = [
      'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
      'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
      'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
      'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4',
      'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
      'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
      'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
      'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4'
    ];

    const descriptions = [
      'Amazing nature documentary! 🌟 Check out this incredible wildlife footage #nature #wildlife #amazing',
      'Creative animation showcase ✨ Follow for more artistic content! #animation #creative #art #digital',
      'Epic action sequence! What do you think? 🔥 #action #epic #cinematic #movie',
      'Adventure time with the Subaru! 🚗 Perfect for outdoor enthusiasts #adventure #outdoor #travel #cars',
      'Stunning visuals and storytelling 🎬 A masterpiece of independent cinema #cinema #visual #story #indie',
      'Escape into this beautiful journey ✈️ Travel goals! #escape #travel #beautiful #wanderlust',
      'Fun times ahead! Ready for some excitement? 🎉 #fun #exciting #entertainment #joy',
      'The ultimate joyride experience! 🏎️ Speed and thrills combined #joyride #speed #thrills #racing'
    ];

    const hashtags = [
      ['#nature', '#wildlife', '#amazing', '#documentary'],
      ['#animation', '#creative', '#art', '#digital'],
      ['#action', '#epic', '#cinematic', '#movie'],
      ['#adventure', '#outdoor', '#travel', '#cars'],
      ['#cinema', '#visual', '#story', '#indie'],
      ['#escape', '#travel', '#beautiful', '#wanderlust'],
      ['#fun', '#exciting', '#entertainment', '#joy'],
      ['#joyride', '#speed', '#thrills', '#racing']
    ];

    return mockVideos.map((url, index) => ({
      _id: `video_${Date.now()}_${index}`,
      url,
      thumbnail: `https://images.unsplash.com/photo-${1516035069371 + index}?w=400&h=600&fit=crop`,
      user: mockUsers[index % mockUsers.length],
      description: descriptions[index % descriptions.length],
      hashtags: hashtags[index % hashtags.length],
      likesCount: Math.floor(Math.random() * 10000) + 500,
      commentsCount: Math.floor(Math.random() * 500) + 25,
      views: Math.floor(Math.random() * 50000) + 1000,
      createdAt: new Date(Date.now() - Math.random() * 86400000 * 30).toISOString(),
      isLiked: Math.random() > 0.6,
      isSaved: Math.random() > 0.8,
      duration: Math.floor(Math.random() * 180) + 30 // 30-210 seconds
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

  // Enhanced video fetching with improved caching and error recovery
  const fetchVideos = useCallback(async () => {
    const now = Date.now();

    // Prevent too frequent fetches
    if (now - lastFetchTime < MIN_FETCH_INTERVAL && videos.length > 0) {
      console.log('Fetch throttled, using existing videos');
      return;
    }

    if (fetchingRef.current) {
      console.log('Fetch already in progress');
      return;
    }

    fetchingRef.current = true;
    setLoading(true);
    setLastFetchTime(now);

    try {
      // Check cache first
      const cacheKey = 'cachedVideos_v2'; // Version cache key
      const timestampKey = 'videoCacheTime_v2';
      const cachedVideos = sessionStorage.getItem(cacheKey);
      const cacheTimestamp = sessionStorage.getItem(timestampKey);

      if (cachedVideos && cacheTimestamp && (now - parseInt(cacheTimestamp)) < CACHE_DURATION) {
        console.log('Loading videos from cache');
        const parsedVideos = JSON.parse(cachedVideos);
        if (Array.isArray(parsedVideos) && parsedVideos.length > 0) {
          setVideos(parsedVideos);
          setLoading(false);
          fetchingRef.current = false;
          setRetryCount(0);
          return;
        }
      }

      console.log('Fetching fresh videos from API...');

      // Show minimum loading time for better UX
      const minLoadingTime = new Promise(resolve => setTimeout(resolve, 1000));

      try {
        const [apiData] = await Promise.all([
          fetchWithRetry(`${API_CONFIG.baseUrl}/videos`),
          minLoadingTime
        ]);

        if (apiData && Array.isArray(apiData) && apiData.length > 0) {
          // Validate video data
          const validVideos = apiData.filter(video =>
            video &&
            video._id &&
            video.url &&
            video.user
          );

          if (validVideos.length > 0) {
            sessionStorage.setItem(cacheKey, JSON.stringify(validVideos));
            sessionStorage.setItem(timestampKey, now.toString());
            setVideos(validVideos);
            setRetryCount(0);
            console.log(`Successfully loaded ${validVideos.length} videos from API`);
            return;
          }
        }

        throw new Error('Invalid or empty API response');

      } catch (apiError) {
        console.warn(`API fetch failed (attempt ${retryCount + 1}):`, apiError.message);

        if (retryCount < MAX_RETRIES) {
          setRetryCount(prev => prev + 1);

          // Exponential backoff for retry
          const retryDelay = Math.min(2000 * Math.pow(2, retryCount), 10000);
          console.log(`Retrying in ${retryDelay}ms...`);

          retryTimeoutRef.current = setTimeout(() => {
            fetchVideos();
          }, retryDelay);

          return;
        }

        // After max retries, try cache or use mock data
        if (cachedVideos) {
          console.log('Using stale cache after API failure');
          const parsedVideos = JSON.parse(cachedVideos);
          setVideos(parsedVideos);
        } else {
          console.log('Using mock data after API failure');
          const mockVideos = generateMockVideos();
          setVideos(mockVideos);
          sessionStorage.setItem(cacheKey, JSON.stringify(mockVideos));
          sessionStorage.setItem(timestampKey, now.toString());
        }

        setRetryCount(0);
      }

    } catch (error) {
      console.error("Critical error in fetchVideos:", error);

      // Last resort fallback
      const mockVideos = generateMockVideos();
      setVideos(mockVideos);
      setRetryCount(0);
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, [API_CONFIG, fetchWithRetry, generateMockVideos, retryCount, lastFetchTime, videos.length]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Enhanced video playback management (Safari/iOS safe)
  const manageVideoPlayback = useCallback((newCurrentVideo) => {
    console.log("Managing video playback for video:", newCurrentVideo);

    const videosToPreload = [];
    for (
      let i = Math.max(0, newCurrentVideo - PRELOAD_RANGE);
      i <= Math.min(videos.length - 1, newCurrentVideo + PRELOAD_RANGE);
      i++
    ) {
      videosToPreload.push(i);
    }

    Object.entries(videoRefs.current).forEach(([index, videoElement]) => {
      if (!videoElement) return;

      const videoIndex = parseInt(index);

      if (videoIndex === newCurrentVideo) {
        // Active video
        videoElement.muted = true; // always keep muted for Safari autoplay
        if (videoElement.paused) {
          videoElement
            .play()
            .catch((err) => {
              console.warn("Active video play failed, retrying muted:", err);
              videoElement.muted = true;
              videoElement.play().catch((e) =>
                console.error("Muted autoplay retry also failed:", e)
              );
            });
        }

        playbackStateRef.current[videoIndex] = {
          isPlaying: true,
          currentTime: videoElement.currentTime,
        };
      } else if (videosToPreload.includes(videoIndex)) {
        // Adjacent videos → preload but don’t force playback
        videoElement.pause();
        // Let preload attribute handle buffering; don’t call .load() unless needed
        playbackStateRef.current[videoIndex] = {
          isPlaying: false,
          currentTime: videoElement.currentTime,
        };
      } else {
        // Distant videos → pause & keep lightweight
        videoElement.pause();
        playbackStateRef.current[videoIndex] = {
          isPlaying: false,
          currentTime: 0,
        };
      }
    });
  }, [videos.length]);


  // Enhanced mute toggle
  const toggleMute = useCallback(() => {
    const newMutedState = !isMuted;
    setIsMuted(newMutedState);

    const currentVideoElement = videoRefs.current[currentVideo];
    if (currentVideoElement) {
      const wasPlaying = !currentVideoElement.paused;
      currentVideoElement.muted = newMutedState;

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
          }, 50);

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
      }, 200);

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
      // Enhanced mock comments
      const mockComments = [
        {
          _id: `${videoId}-1`,
          text: "This is absolutely amazing! 🔥",
          user: {
            _id: "user1",
            username: "viewer1",
            avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150"
          },
          createdAt: new Date(Date.now() - 300000).toISOString(),
          likes: Math.floor(Math.random() * 50)
        },
        {
          _id: `${videoId}-2`,
          text: "Love this content! Keep it up 💯",
          user: {
            _id: "user2",
            username: "fan2023",
            avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150"
          },
          createdAt: new Date(Date.now() - 3600000).toISOString(),
          likes: Math.floor(Math.random() * 30)
        },
        {
          _id: `${videoId}-3`,
          text: "Where was this filmed? Looks incredible!",
          user: {
            _id: "user3",
            username: "explorer_mike",
            avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150"
          },
          createdAt: new Date(Date.now() - 7200000).toISOString(),
          likes: Math.floor(Math.random() * 20)
        }
      ];

      setComments(prev => ({
        ...prev,
        [videoId]: mockComments
      }));
    }
  }, [comments, API_CONFIG, fetchWithRetry]);

  // Enhanced like handler
  const handleLike = useCallback(async (videoId) => {
    const currentVideoData = videos.find(v => v._id === videoId);
    if (!currentVideoData) return;

    const wasLiked = currentVideoData.isLiked;
    const newLikesCount = wasLiked
      ? Math.max(0, (currentVideoData.likesCount || 0) - 1)
      : (currentVideoData.likesCount || 0) + 1;

    const currentVideoElement = videoRefs.current[currentVideo];
    const wasPlaying = currentVideoElement && !currentVideoElement.paused;

    // Optimistic update
    setVideos(prev => prev.map(video =>
      video._id === videoId
        ? { ...video, isLiked: !wasLiked, likesCount: newLikesCount }
        : video
    ));

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
          ? {
            ...video,
            likes: data.likes,
            isLiked: data.isLiked,
            likesCount: data.likesCount || newLikesCount
          }
          : video
      ));
    } catch (error) {
      console.error("Error liking video:", error);
    }
  }, [videos, API_CONFIG, fetchWithRetry, currentVideo]);

  // Enhanced save handler
  const handleSave = useCallback(async (videoId) => {
    const currentVideoData = videos.find(v => v._id === videoId);
    if (!currentVideoData) return;

    const wasSaved = currentVideoData.isSaved;
    const currentVideoElement = videoRefs.current[currentVideo];
    const wasPlaying = currentVideoElement && !currentVideoElement.paused;

    setVideos(prev => prev.map(video =>
      video._id === videoId
        ? { ...video, isSaved: !wasSaved }
        : video
    ));

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
      title: `Check out @${video.user?.username}'s video!`,
      text: video.description || 'Amazing video content!',
      url: `${window.location.origin}/video/${video._id}`
    };

    try {
      if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(shareData.url);
        // Could show a toast notification here
        console.log('Video link copied to clipboard!');
      }
    } catch (error) {
      console.error('Error sharing:', error);
      try {
        await navigator.clipboard.writeText(shareData.url);
        console.log('Fallback: Video link copied to clipboard!');
      } catch (clipboardErr) {
        console.error('Clipboard error:', clipboardErr);
      }
    }
  }, []);

  // Enhanced comment submission
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
      createdAt: new Date().toISOString(),
      likes: 0
    };

    const currentVideoElement = videoRefs.current[currentVideo];
    const wasPlaying = currentVideoElement && !currentVideoElement.paused;

    setComments(prev => ({
      ...prev,
      [activeVideoId]: [optimisticComment, ...(prev[activeVideoId] || [])]
    }));

    setNewComment("");
    setCommentLoading(true);

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
    const [isLoading, setIsLoading] = useState(true);
    const [imageError, setImageError] = useState(false);
    const [isFollowing, setIsFollowing] = useState(false);

    const isLiked = video.isLiked || false;
    const isSaved = video.isSaved || false;
    const likesCount = video.likesCount || 0;
    const commentsCount = video.commentsCount || 0;
    const viewsCount = video.views || 0;
      // ✅ define handler here
  const handleImageError = useCallback(() => {
    setImageError(true);
  }, []);



    return (
      <div className="relative h-screen w-full bg-black overflow-hidden snap-start flex-shrink-0">
        {/* Video */}
        <video
          ref={(el) => {
            if (el) videoRefs.current[index] = el;
          }}
          className="absolute inset-0 w-full h-full object-cover"
          src={video?.url}
          muted={true}
          autoPlay={isActive}
          playsInline
          loop
          preload={isActive ? "auto" : "metadata"}
          poster={video?.thumbnail}
          onCanPlay={() => {
            if (isActive && index === currentVideo) {
              const videoElement = videoRefs.current[index];
              if (videoElement && videoElement.paused) {
                videoElement.play().catch(() => {
                  videoElement.muted = true;
                  videoElement.play().catch(() => { });
                });
              }
            }
            setIsLoading(false); // hide skeleton when ready
          }}
          onWaiting={() => setIsLoading(true)} // show again if buffering
          onError={() => setIsLoading(false)}
        />
        {/* Skeleton shimmer loader (full bleed, TikTok-style) */}
        {isLoading && (
          <div className="absolute inset-0 bg-black">
            <div className="absolute inset-0 animate-shimmer bg-gradient-to-r from-gray-800 via-gray-700 to-gray-800" />
            <div className="absolute inset-0 bg-black/40" />

            {/* Optional spinner in center for feedback */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-12 h-12 border-4 border-white/70 border-t-transparent rounded-full animate-spin"></div>
            </div>
          </div>
        )}

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

        {/* Back Button (only shown when coming from profile) */}
        {profileNavigation && (
          <div className="absolute top-4 left-4 z-20">
            <button
              onClick={handleBackToProfile}
              className="p-3 rounded-full bg-black/50 backdrop-blur-sm hover:bg-black/70 transition-all duration-200"
            >
              <ArrowLeft className="w-6 h-6 text-white" />
            </button>
          </div>
        )}

        {/* Source Indicator */}
        {profileNavigation && (
          <div className="absolute top-4 right-4 z-20">
            <div className="px-3 py-1.5 rounded-full bg-black/50 backdrop-blur-sm border border-white/20">
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
            <div className="px-2 py-1 rounded-full bg-black/50 backdrop-blur-sm border border-white/10">
              <span className="text-white text-xs font-medium">
                {index + 1} / {videos.length}
              </span>
            </div>
          </div>
        )}

        {/* Mute/Unmute Button */}
        <div className="absolute top-4 left-4 z-20">
          <button
            onClick={toggleMute}
            className="p-3 rounded-full bg-black/50 backdrop-blur-sm hover:bg-black/70 transition-all duration-200 border border-white/20"
          >
            {isMuted ? (
              <VolumeX className="w-6 h-6 text-white" />
            ) : (
              <Volume2 className="w-6 h-6 text-white" />
            )}
          </button>
        </div>

        {/* Network Error Indicator */}
        {networkError && (
          <div className="absolute top-20 left-4 z-20">
            <div className="px-3 py-2 rounded-lg bg-red-500/90 backdrop-blur-sm">
              <span className="text-white text-sm font-medium">Network Error</span>
            </div>
          </div>
        )}

        {/* Right Side Actions */}
        <div className="absolute right-3 bottom-24 flex flex-col items-center space-y-6 z-10">
          {/* Profile Avatar */}
          <div className="relative">
            {!imageError ? (
              <img
                src={video?.user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(video?.user?.username || 'User')}&background=random&color=fff&size=200&bold=true`}
                alt={video?.user?.username || "user"}
                className="w-14 h-14 rounded-full border-2 border-white object-cover shadow-lg"
                loading="lazy"
                onError={handleImageError}
              />
            ) : (
              <div className="w-14 h-14 rounded-full border-2 border-white bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-lg">
                  {(video?.user?.username || 'U').charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <button
              onClick={() => setIsFollowing(!isFollowing)}
              className={`absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-7 h-7 rounded-full border-2 border-white flex items-center justify-center text-sm font-bold transition-all duration-200 shadow-lg ${isFollowing
                ? "bg-gray-600 text-white hover:bg-gray-700"
                : "bg-red-500 text-white hover:bg-red-600"
                }`}
            >
              {isFollowing ? "✓" : "+"}
            </button>
          </div>

          {/* Like Button */}
          <div className="flex flex-col items-center">
            <button
              onClick={() => handleLike(video._id)}
              className="p-3 rounded-full bg-black/30 backdrop-blur-sm hover:bg-black/50 transition-all duration-200 active:scale-95 border border-white/10"
            >
              <Heart
                className={`w-8 h-8 transition-all duration-200 ${isLiked ? "text-red-500 fill-red-500 scale-110" : "text-white hover:scale-105"
                  }`}
              />
            </button>
            <span className="text-white text-xs mt-1 font-bold drop-shadow-lg">
              {formatCount(likesCount)}
            </span>
          </div>

          {/* Comment Button */}
          <div className="flex flex-col items-center">
            <button
              onClick={() => openCommentModal(video._id)}
              className="p-3 rounded-full bg-black/30 backdrop-blur-sm hover:bg-black/50 transition-all duration-200 active:scale-95 border border-white/10"
            >
              <MessageCircle className="w-8 h-8 text-white hover:scale-105 transition-transform duration-200" />
            </button>
            <span className="text-white text-xs mt-1 font-bold drop-shadow-lg">
              {formatCount(commentsCount)}
            </span>
          </div>

          {/* Share Button */}
          <div className="flex flex-col items-center">
            <button
              onClick={() => handleShare(video)}
              className="p-3 rounded-full bg-black/30 backdrop-blur-sm hover:bg-black/50 transition-all duration-200 active:scale-95 border border-white/10"
            >
              <Share className="w-8 h-8 text-white hover:scale-105 transition-transform duration-200" />
            </button>
            <span className="text-white text-xs mt-1 font-bold drop-shadow-lg">
              Share
            </span>
          </div>

          {/* Save Button */}
          <div className="flex flex-col items-center">
            <button
              onClick={() => handleSave(video._id)}
              className="p-3 rounded-full bg-black/30 backdrop-blur-sm hover:bg-black/50 transition-all duration-200 active:scale-95 border border-white/10"
            >
              <Bookmark
                className={`w-8 h-8 transition-all duration-200 ${isSaved ? "text-yellow-400 fill-yellow-400 scale-110" : "text-white hover:scale-105"
                  }`}
              />
            </button>
            <span className="text-white text-xs mt-1 font-bold drop-shadow-lg">
              {isSaved ? "Saved" : "Save"}
            </span>
          </div>
        </div>

        {/* Bottom Content */}
        <div className="absolute bottom-4 left-4 right-20 text-white z-10">
          <div className="space-y-3 mb-[80px]">
            <div className="flex items-center space-x-3">
              <span className="font-bold text-lg drop-shadow-lg">
                @{video?.user?.username || "unknown"}
              </span>
              <span className="text-sm opacity-80">•</span>
              <span className="text-sm opacity-80">
                {video.createdAt ? new Date(video.createdAt).toLocaleDateString() : '2h ago'}
              </span>
              {viewsCount > 0 && (
                <>
                  <span className="text-sm opacity-80">•</span>
                  <span className="text-sm opacity-80">
                    {formatCount(viewsCount)} views
                  </span>
                </>
              )}
            </div>
            <p className="text-sm leading-tight pr-4 drop-shadow-lg line-clamp-3">
              {video?.description || ""}
            </p>
            {video?.hashtags && video.hashtags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {video.hashtags.slice(0, 4).map((tag, index) => (
                  <span key={index} className="text-sm text-blue-300 font-medium hover:text-blue-200 cursor-pointer drop-shadow-lg">
                    {tag}
                  </span>
                ))}
                {video.hashtags.length > 4 && (
                  <span className="text-sm text-gray-300">
                    +{video.hashtags.length - 4} more
                  </span>
                )}
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
      <div className="fixed inset-0 bg-black/60 z-50 flex items-end backdrop-blur-sm">
        <div className="bg-white w-full h-2/3 rounded-t-3xl flex flex-col shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <h3 className="text-lg font-semibold text-gray-800">
                Comments
              </h3>
              <span className="bg-gray-100 px-2 py-1 rounded-full text-sm text-gray-600">
                {videoComments.length}
              </span>
            </div>
            <button
              onClick={closeCommentModal}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors"
            >
              <X className="w-6 h-6 text-gray-600" />
            </button>
          </div>

          {/* Comments List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {videoComments.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <MessageCircle className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium">No comments yet</p>
                <p className="text-sm">Be the first to share your thoughts!</p>
              </div>
            ) : (
              videoComments.map((comment, index) => (
                <div key={comment._id || index} className="flex space-x-3 p-2 hover:bg-gray-50 rounded-lg transition-colors">
                  <img
                    src={comment.user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(comment.user?.username || 'User')}&background=random&color=fff&size=200&bold=true`}
                    alt={comment.user?.username || "user"}
                    className="w-10 h-10 rounded-full object-cover flex-shrink-0 border-2 border-gray-200"
                    loading="lazy"
                    onError={(e) => {
                      e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(comment.user?.username || 'User')}&background=random&color=fff&size=200&bold=true`;
                    }}
                  />
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="font-semibold text-sm text-gray-800">
                        {comment.user?.username || "Anonymous"}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(comment.createdAt).toLocaleDateString()}
                      </span>
                      {comment.likes > 0 && (
                        <>
                          <span className="text-xs text-gray-300">•</span>
                          <span className="text-xs text-gray-500 flex items-center">
                            <Heart className="w-3 h-3 text-red-500 mr-1" />
                            {comment.likes}
                          </span>
                        </>
                      )}
                    </div>
                    <p className="text-sm text-gray-700 leading-relaxed">
                      {comment.text}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Comment Input */}
          <div className="p-4 border-t bg-gray-50 mb-[73px]">
            <form onSubmit={handleCommentSubmit}>
              <div className="flex items-center space-x-3">
                <img
                  src={currentUser?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser?.username || 'You')}&background=random&color=fff&size=200&bold=true`}
                  alt="You"
                  className="w-10 h-10 rounded-full object-cover flex-shrink-0 border-2 border-gray-200"
                />
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Add a comment..."
                    className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white shadow-sm"
                    disabled={commentLoading}
                    maxLength={500}
                  />
                  <button
                    type="submit"
                    disabled={!newComment.trim() || commentLoading}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2 rounded-full bg-blue-500 text-white disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-blue-600 transition-colors shadow-lg"
                  >
                    {commentLoading ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  });

  // Enhanced loading screen
  if (loading) {
    return (
      <div className="h-screen overflow-hidden">
        {/* Enhanced shimmer CSS */}
        <style jsx>{`
          @keyframes shimmer {
            0% { background-position: -200% 0; }
            100% { background-position: 200% 0; }
          }
          
          .animate-shimmer {
            animation: shimmer 2s infinite linear;
            background: linear-gradient(90deg, #1f2937 25%, #374151 50%, #1f2937 75%);
            background-size: 200% 100%;
          }
        `}</style>

        <VideoSkeleton />
      </div>
    );
  }

  // Enhanced error screen
  if (videos.length === 0) {
    return (
      <div className="h-screen flex items-center justify-center bg-black text-white">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="w-20 h-20 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
            <MessageCircle className="w-10 h-10 text-gray-400" />
          </div>
          <h2 className="text-2xl font-bold mb-3">No Videos Available</h2>
          <p className="text-gray-400 mb-6 leading-relaxed">
            {networkError
              ? "Unable to connect to the server. Please check your internet connection and try again."
              : "We couldn't find any videos to show you right now. Check back later for new content!"
            }
          </p>
          <div className="space-y-3">
            <button
              onClick={() => {
                setRetryCount(0);
                fetchVideos();
              }}
              disabled={fetchingRef.current}
              className="w-full px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {fetchingRef.current ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Loading...</span>
                </>
              ) : (
                <span>Try Again</span>
              )}
            </button>
            {networkError && (
              <button
                onClick={() => window.location.reload()}
                className="w-full px-6 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                Reload Page
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Enhanced shimmer CSS */}
      <style jsx>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        
        .animate-shimmer {
          animation: shimmer 2s infinite linear;
          background: linear-gradient(90deg, #1f2937 25%, #374151 50%, #1f2937 75%);
          background-size: 200% 100%;
        }
        
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        
        .line-clamp-3 {
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>

      <div ref={containerRef} className="h-screen overflow-y-auto snap-y snap-mandatory scrollbar-hide">
        {videos.map((video, index) => (
          <VideoPlayer
            key={`${video._id}-${index}`}
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
<style jsx>{`
  @keyframes shimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }
  .animate-shimmer {
    animation: shimmer 2s infinite linear;
    background-size: 200% 100%;
  }
`}</style>

export default HomeScreen;