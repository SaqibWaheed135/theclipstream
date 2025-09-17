import React, { useState, useEffect } from "react";
import { Heart, Settings, Share, UserCheck, UserPlus, Mail, Calendar, Shield, Play } from "lucide-react";

const ProfileScreen = () => {
  const [activeTab, setActiveTab] = useState("videos");
  const [isFollowing, setIsFollowing] = useState(false);
  const [user, setUser] = useState(null);
  const [isOwnProfile, setIsOwnProfile] = useState(true);
  const [loading, setLoading] = useState(true);
  const [videoLoading, setVideoLoading] = useState(false);
  
  // Video data states
  const [userVideos, setUserVideos] = useState([]);
  const [likedVideos, setLikedVideos] = useState([]);
  const [savedVideos, setSavedVideos] = useState([]);

  // Get API base URL
  const API_BASE_URL = 'http://localhost:5000/api';

  // Helper function to get auth headers
  const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  };

  // Fetch user videos - try specific endpoint first, then fallback to filtering
  const fetchUserVideos = async () => {
    try {
      setVideoLoading(true);
      
      // Try to fetch user-specific videos first (you may need to add this endpoint)
      let currentUserVideos = [];
      
      try {
        const userVideosResponse = await fetch(`${API_BASE_URL}/videos/user/${user._id || user.id}`, {
          headers: getAuthHeaders()
        });
        
        if (userVideosResponse.ok) {
          currentUserVideos = await userVideosResponse.json();
          console.log('User-specific videos:', currentUserVideos);
        }
      } catch (userVideoError) {
        console.log('User-specific endpoint not available, using fallback');
      }
      
      // Fallback: fetch all videos and filter
      if (currentUserVideos.length === 0) {
        const response = await fetch(`${API_BASE_URL}/videos`, {
          headers: getAuthHeaders()
        });
        
        if (response.ok) {
          const allVideos = await response.json();
          console.log('All videos:', allVideos); // Debug log
          console.log('Current user:', user); // Debug log
          
          // Filter videos by current user - handle both populated and non-populated user field
          currentUserVideos = allVideos.filter(video => {
            const videoUserId = video.user?._id || video.user;
            const currentUserId = user?._id || user?.id;
            console.log('Comparing:', videoUserId, 'with:', currentUserId); // Debug log
            return videoUserId === currentUserId;
          });
          
          console.log('Filtered user videos:', currentUserVideos); // Debug log
        } else {
          console.error('Failed to fetch videos:', response.status, response.statusText);
        }
      }
      
      setUserVideos(currentUserVideos);
    } catch (error) {
      console.error('Error fetching user videos:', error);
    } finally {
      setVideoLoading(false);
    }
  };

  // FIXED: Fetch liked videos using dedicated endpoint or proper filtering
  const fetchLikedVideos = async () => {
    try {
      setVideoLoading(true);
      
      // Option 1: Try the dedicated liked videos endpoint (recommended)
      try {
        const response = await fetch(`${API_BASE_URL}/videos/liked`, {
          headers: getAuthHeaders()
        });
        
        if (response.ok) {
          const likedVideosData = await response.json();
          console.log('Liked videos from dedicated endpoint:', likedVideosData);
          setLikedVideos(likedVideosData);
          return;
        }
      } catch (endpointError) {
        console.log('Dedicated liked endpoint not available, using fallback');
      }

      // Option 2: Fallback - fetch all videos and filter for liked ones
      const response = await fetch(`${API_BASE_URL}/videos`, {
        headers: getAuthHeaders()
      });
      
      if (response.ok) {
        const allVideos = await response.json();
        console.log('All videos for likes check:', allVideos);
        
        // Filter videos that are liked by current user
        const likedByUser = allVideos.filter(video => {
          console.log('Video ID:', video._id, 'isLiked:', video.isLiked);
          return video.isLiked === true;
        });
        
        console.log('Filtered liked videos:', likedByUser);
        setLikedVideos(likedByUser);
      } else {
        console.error('Failed to fetch videos:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Error fetching liked videos:', error);
    } finally {
      setVideoLoading(false);
    }
  };

  // Fetch saved videos
  const fetchSavedVideos = async () => {
    try {
      setVideoLoading(true);
      const response = await fetch(`${API_BASE_URL}/videos/saved`, {
        headers: getAuthHeaders()
      });
      
      if (response.ok) {
        const savedVideosData = await response.json();
        setSavedVideos(savedVideosData);
      }
    } catch (error) {
      console.error('Error fetching saved videos:', error);
    } finally {
      setVideoLoading(false);
    }
  };

  useEffect(() => {
    // Load user from localStorage
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      const userData = JSON.parse(storedUser);
      console.log('Loaded user data:', userData); // Debug log
      setUser(userData);
      setIsOwnProfile(true);
      setLoading(false);
    } else {
      // In a real app, you would redirect to login
      console.log("No user found, would redirect to login");
      setLoading(false);
    }
  }, []);

  // Fetch videos when tab changes or user is loaded
  useEffect(() => {
    if (user && !loading) {
      console.log('Fetching videos for tab:', activeTab, 'User:', user._id || user.id); // Debug log
      switch (activeTab) {
        case "videos":
          fetchUserVideos();
          break;
        case "liked":
          fetchLikedVideos();
          break;
        case "saved":
          if (isOwnProfile) {
            fetchSavedVideos();
          }
          break;
        default:
          break;
      }
    }
  }, [activeTab, user, loading]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    // In a real app, you would redirect to login
    console.log("Logged out, would redirect to login");
  };

  const formatJoinDate = (dateString) => {
    if (!dateString) return "Recently joined";
    const date = new Date(dateString);
    return `Joined ${date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`;
  };

  const formatNumber = (num) => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(0)}K`;
    }
    return num.toString();
  };

  const handleVideoClick = (videoId, videosList = []) => {
    // Find the index of the clicked video in the current list
    const videoIndex = videosList.findIndex(v => v._id === videoId);
    
    // Navigate to HomeScreen with the video list and starting index
    // You can implement this navigation based on your routing solution
    // For React Router, it might look like:
    // navigate('/home', { 
    //   state: { 
    //     videos: videosList, 
    //     startIndex: videoIndex >= 0 ? videoIndex : 0,
    //     source: activeTab // 'videos', 'liked', or 'saved'
    //   } 
    // });
    
    // For now, we'll use a custom event or callback
    if (window.navigateToVideoFeed) {
      window.navigateToVideoFeed({
        videos: videosList,
        startIndex: videoIndex >= 0 ? videoIndex : 0,
        source: activeTab
      });
    } else {
      console.log(`Navigate to video feed with video: ${videoId} at index: ${videoIndex}`);
      console.log('Video list:', videosList);
      console.log('Source tab:', activeTab);
    }
  };

  const renderVideoGrid = (videos) => {
    if (videoLoading) {
      return (
        <div className="grid grid-cols-3 gap-1">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="aspect-[9/16] bg-gray-800 rounded-lg animate-pulse" />
          ))}
        </div>
      );
    }

    if (videos.length === 0) {
      return (
        <div className="col-span-3 text-center py-12">
          <div className="text-gray-400 mb-4">
            <svg
              className="w-16 h-16 mx-auto mb-4 opacity-50"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
            <p className="text-lg">
              {activeTab === "videos" && "No videos yet"}
              {activeTab === "liked" && "No liked videos yet"}
              {activeTab === "saved" && "No saved videos yet"}
            </p>
            <p className="text-sm">
              {activeTab === "videos" && "Start creating to share your content!"}
              {activeTab === "liked" && "Videos you like will appear here"}
              {activeTab === "saved" && "Videos you save will appear here"}
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-3 gap-1">
        {videos.map((video) => (
          <div
            key={video._id}
            className="relative aspect-[9/16] bg-gray-800 rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity group"
            onClick={() => handleVideoClick(video._id, videos)}
          >
            {/* Video Thumbnail - you might want to generate thumbnails or use a placeholder */}
            <div className="w-full h-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center">
              <Play className="w-8 h-8 text-white opacity-70 group-hover:opacity-100 transition-opacity" />
            </div>
            
            {/* Video Stats Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent">
              {/* Views */}
              <div className="absolute bottom-2 left-2 flex items-center space-x-1">
                <svg
                  className="w-3 h-3 text-white"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                  <path
                    fillRule="evenodd"
                    d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="text-white text-xs font-medium">
                  {formatNumber(video.views || 0)}
                </span>
              </div>

              {/* Likes */}
              <div className="absolute bottom-2 right-2 flex items-center space-x-1">
                <Heart className={`w-3 h-3 ${video.isLiked ? 'text-red-500 fill-current' : 'text-white'}`} />
                <span className="text-white text-xs font-medium">
                  {formatNumber(video.likesCount || video.likes?.length || 0)}
                </span>
              </div>

              {/* Duration (if available) */}
              {video.duration && (
                <div className="absolute top-2 right-2 bg-black/60 rounded px-1 py-0.5">
                  <span className="text-white text-xs">
                    {Math.floor(video.duration / 60)}:{(video.duration % 60).toString().padStart(2, '0')}
                  </span>
                </div>
              )}
            </div>

            {/* Description overlay on hover */}
            {video.description && (
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <p className="text-white text-xs line-clamp-2">
                  {video.description}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading profile...</p>
        </div>
      </div>
    );
  }

  // Demo user data if no user is loaded
  const demoUser = user || {
    _id: 'demo-user',
    username: 'DemoUser',
    email: 'demo@example.com',
    avatar: null,
    bio: 'This is a demo profile showcasing the video integration features.',
    points: 1250,
    isVerified: true,
    followersCount: 15420,
    followingCount: 892,
    totalLikes: 125000,
    totalVideos: 24,
    savedVideosCount: 8,
    createdAt: '2023-01-15T00:00:00.000Z'
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="sticky top-0 bg-black/95 backdrop-blur-lg border-b border-gray-800 z-10 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <h1 className="text-xl font-bold">{demoUser.username}</h1>
            {demoUser.isVerified && (
              <Shield className="w-5 h-5 text-blue-500" />
            )}
          </div>
          <div className="flex items-center space-x-3">
            <button className="p-2 hover:bg-gray-800 rounded-full transition-colors">
              <Share className="w-5 h-5" />
            </button>
            {isOwnProfile && (
              <button 
                className="p-2 hover:bg-gray-800 rounded-full transition-colors"
                onClick={() => console.log('Navigate to settings')}
              >
                <Settings className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="p-4">
        {/* Profile Info */}
        <div className="flex items-start space-x-4 mb-6">
          <div className="relative">
            <img
              src={demoUser.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(demoUser.username)}&background=random&color=fff&size=200&bold=true`}
              alt={`${demoUser.username}'s profile`}
              className="w-24 h-24 rounded-full object-cover border-2 border-gray-700"
              onError={(e) => {
                e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(demoUser.username)}&background=random&color=fff&size=200&bold=true`;
              }}
            />
            {demoUser.isVerified && (
              <div className="absolute -bottom-1 -right-1 bg-blue-500 rounded-full p-1">
                <Shield className="w-3 h-3 text-white" />
              </div>
            )}
          </div>
          
          <div className="flex-1">
            <div className="flex items-center space-x-4 mb-4">
              <div className="text-center">
                <p className="font-bold text-lg">{demoUser.followingCount || 0}</p>
                <p className="text-gray-400 text-sm">Following</p>
              </div>
              <div className="text-center">
                <p className="font-bold text-lg">{demoUser.followersCount || 0}</p>
                <p className="text-gray-400 text-sm">Followers</p>
              </div>
              <div className="text-center">
                <p className="font-bold text-lg">{demoUser.totalLikes || 0}</p>
                <p className="text-gray-400 text-sm">Likes</p>
              </div>
              <div className="text-center">
                <p className="font-bold text-lg text-yellow-400">{demoUser.points || 0}</p>
                <p className="text-yellow-400 text-sm">Points</p>
              </div>
            </div>

            <div className="flex space-x-2">
              {isOwnProfile ? (
                <>
                  <button
                    onClick={() => console.log('Navigate to edit profile')}
                    className="flex-1 py-2 px-4 rounded-lg font-medium bg-gray-800 text-white border border-gray-600 hover:bg-gray-700 transition-colors"
                  >
                    Edit Profile
                  </button>
                  <button
                    onClick={handleLogout}
                    className="py-2 px-4 rounded-lg font-medium bg-red-600 text-white hover:bg-red-700 transition-colors"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setIsFollowing(!isFollowing)}
                  className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2 ${
                    isFollowing
                      ? "bg-gray-800 text-white border border-gray-600 hover:bg-gray-700"
                      : "bg-pink-600 text-white hover:bg-pink-700"
                  }`}
                >
                  {isFollowing ? <UserCheck className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                  <span>{isFollowing ? "Following" : "Follow"}</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Bio Section */}
        <div className="mb-6">
          <div className="flex items-center space-x-2 mb-3">
            <h2 className="text-lg font-semibold">{demoUser.username}</h2>
            {demoUser.isVerified && (
              <div className="flex items-center space-x-1 bg-blue-500/20 px-2 py-1 rounded-full">
                <Shield className="w-3 h-3 text-blue-400" />
                <span className="text-xs text-blue-400">Verified</span>
              </div>
            )}
          </div>
          
          {demoUser.bio && (
            <p className="text-sm text-gray-300 mb-3 leading-relaxed">
              {demoUser.bio}
            </p>
          )}
          
          <div className="flex flex-col space-y-2 text-sm text-gray-400">
            {demoUser.email && (
              <div className="flex items-center space-x-2">
                <Mail className="w-4 h-4" />
                <span>{demoUser.email}</span>
              </div>
            )}
            
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4" />
              <span>{formatJoinDate(demoUser.createdAt)}</span>
            </div>
            
            {demoUser.googleId && (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-gradient-to-r from-blue-500 via-red-500 to-yellow-500 rounded-sm flex items-center justify-center">
                  <span className="text-xs font-bold text-white">G</span>
                </div>
                <span className="text-blue-400">Connected with Google</span>
              </div>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-gray-900 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-pink-500">{demoUser.totalVideos || userVideos.length || 0}</p>
            <p className="text-sm text-gray-400">Videos Created</p>
          </div>
          <div className="bg-gray-900 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-purple-500">{demoUser.savedVideosCount || savedVideos.length || 0}</p>
            <p className="text-sm text-gray-400">Videos Saved</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-800 mb-4">
          <button
            onClick={() => setActiveTab("videos")}
            className={`flex-1 py-3 text-center font-semibold transition-colors ${
              activeTab === "videos"
                ? "border-b-2 border-pink-500 text-white"
                : "text-gray-400 hover:text-gray-200"
            }`}
          >
            <span className="flex flex-col items-center">
              <svg
                className="w-5 h-5 mb-1"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M2 6a2 2 0 012-2h6l2 2h6a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM5 8a1 1 0 011-1h1a1 1 0 010 2H6a1 1 0 01-1-1zm6 1a1 1 0 100-2 1 1 0 000 2z" />
              </svg>
              <span className="text-xs">Videos ({userVideos.length})</span>
            </span>
          </button>

          <button
            onClick={() => setActiveTab("liked")}
            className={`flex-1 py-3 text-center font-semibold transition-colors ${
              activeTab === "liked"
                ? "border-b-2 border-pink-500 text-white"
                : "text-gray-400 hover:text-gray-200"
            }`}
          >
            <span className="flex flex-col items-center">
              <Heart className="w-5 h-5 mb-1" />
              <span className="text-xs">Liked ({likedVideos.length})</span>
            </span>
          </button>

          {isOwnProfile && (
            <button
              onClick={() => setActiveTab("saved")}
              className={`flex-1 py-3 text-center font-semibold transition-colors ${
                activeTab === "saved"
                  ? "border-b-2 border-pink-500 text-white"
                  : "text-gray-400 hover:text-gray-200"
              }`}
            >
              <span className="flex flex-col items-center">
                <svg
                  className="w-5 h-5 mb-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                  />
                </svg>
                <span className="text-xs">Saved ({savedVideos.length})</span>
              </span>
            </button>
          )}
        </div>

        {/* Content Based on Active Tab */}
        {activeTab === "videos" && renderVideoGrid(userVideos)}
        {activeTab === "liked" && renderVideoGrid(likedVideos)}
        {activeTab === "saved" && isOwnProfile && renderVideoGrid(savedVideos)}
      </div>
    </div>
  );
};

export default ProfileScreen;