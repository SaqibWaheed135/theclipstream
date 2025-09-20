import React, { useState, useEffect } from "react";
import { Heart, Settings, Share, UserCheck, UserPlus, Mail, Calendar, Shield, Play, MessageCircle, Clock, CheckCircle, X } from "lucide-react";

const ProfileScreen = ({ userId: propUserId }) => {
  const [activeTab, setActiveTab] = useState("videos");
  const [user, setUser] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [isOwnProfile, setIsOwnProfile] = useState(true);
  const [loading, setLoading] = useState(true);
  const [videoLoading, setVideoLoading] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [pointsLoading, setPointsLoading] = useState(false);
  const [userPoints, setUserPoints] = useState(0);

  // Follow system states
  const [followStatus, setFollowStatus] = useState({
    isFollowing: false,
    isFollowedBy: false,
    hasPendingRequest: false,
    canMessage: false,
    targetUserIsPrivate: false,
    relationship: 'none'
  });

  // Follow requests states
  const [followRequests, setFollowRequests] = useState([]);
  const [showFollowRequests, setShowFollowRequests] = useState(false);

  // Video data states
  const [userVideos, setUserVideos] = useState([]);
  const [likedVideos, setLikedVideos] = useState([]);
  const [savedVideos, setSavedVideos] = useState([]);

  // Get API base URL
  const API_BASE_URL = 'https://theclipstream-backend.onrender.com/api';

  // Helper function to get auth headers
  const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  };

  // Fetch user points from dedicated endpoint
  const fetchUserPoints = async () => {
    if (!isOwnProfile) return; // Only fetch points for own profile
    
    try {
      setPointsLoading(true);
      const response = await fetch(`${API_BASE_URL}/users/points/balance`, {
        headers: getAuthHeaders()
      });

      if (response.ok) {
        const pointsData = await response.json();
        setUserPoints(pointsData.balance || 0);
      }
    } catch (error) {
      console.error('Error fetching user points:', error);
    } finally {
      setPointsLoading(false);
    }
  };

  // Fetch follow status
  const fetchFollowStatus = async (targetUserId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/follow/status/${targetUserId}`, {
        headers: getAuthHeaders()
      });

      if (response.ok) {
        const status = await response.json();
        setFollowStatus(status);
      }
    } catch (error) {
      console.error('Error fetching follow status:', error);
    }
  };

  // Fetch follow requests
  const fetchFollowRequests = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/follow/requests`, {
        headers: getAuthHeaders()
      });

      if (response.ok) {
        const requests = await response.json();
        setFollowRequests(requests);
      }
    } catch (error) {
      console.error('Error fetching follow requests:', error);
    }
  };

  // Handle follow/unfollow
  const handleFollowToggle = async () => {
    if (followLoading || !user) return;
    setFollowLoading(true);

    try {
      if (followStatus.isFollowing) {
        // 🔴 Unfollow
        const response = await fetch(`${API_BASE_URL}/follow/unfollow/${user._id || user.id}`, {
          method: 'POST',
          headers: getAuthHeaders()
        });

        if (response.ok) {
          setFollowStatus(prev => ({
            ...prev,
            isFollowing: false,
            canMessage: false,
            relationship: prev.isFollowedBy ? 'follower' : 'none'
          }));

          // Update local state counts
          setUser(prev => ({
            ...prev,
            followers: prev.followers?.filter(f => f !== currentUser._id) || []
          }));
        }
      } else {
        // 🟢 Follow
        const response = await fetch(`${API_BASE_URL}/follow/request/${user._id || user.id}`, {
          method: 'POST',
          headers: getAuthHeaders()
        });

        if (response.ok) {
          const result = await response.json();

          if (result.requiresApproval) {
            setFollowStatus(prev => ({
              ...prev,
              hasPendingRequest: true
            }));
          } else {
            setFollowStatus(prev => ({
              ...prev,
              isFollowing: true,
              canMessage: prev.isFollowedBy,
              relationship: prev.isFollowedBy ? 'mutual' : 'following'
            }));

            // Update local state counts
            setUser(prev => ({
              ...prev,
              followers: [...(prev.followers || []), currentUser._id]
            }));
          }
        }
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
    } finally {
      setFollowLoading(false);
    }
  };

  // Handle follow request response
  const handleFollowRequest = async (requestId, action) => {
    try {
      const response = await fetch(`${API_BASE_URL}/follow/${action}/${requestId}`, {
        method: 'POST',
        headers: getAuthHeaders()
      });

      if (response.ok) {
        // Remove request from list
        setFollowRequests(prev => prev.filter(req => req._id !== requestId));

        if (action === 'accept') {
          // Update user's follower count
          setUser(prev => ({
            ...prev,
            followersCount: (prev.followersCount || 0) + 1
          }));
        }
      }
    } catch (error) {
      console.error(`Error ${action}ing follow request:`, error);
    }
  };

  // Start conversation
  const startConversation = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/messages/conversations`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ recipientId: user._id || user.id })
      });

      if (response.ok) {
        const conversation = await response.json();
        // Navigate to messages with this conversation
        window.location.href = `/messages/${conversation._id}`;
      } else {
        const error = await response.json();
        alert(error.msg || 'Cannot start conversation');
      }
    } catch (error) {
      console.error('Error starting conversation:', error);
      alert('Failed to start conversation');
    }
  };

  // Fetch user data
  const fetchUserData = async (targetUserId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/users/${targetUserId}`, {
        headers: getAuthHeaders()
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      } else {
        console.error('Failed to fetch user data');
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  // Fetch user videos with improved error handling
  const fetchUserVideos = async () => {
    if (!user) return;
    
    try {
      setVideoLoading(true);
      let currentUserVideos = [];

      try {
        const userVideosResponse = await fetch(`${API_BASE_URL}/videos/user/${user._id || user.id}`, {
          headers: getAuthHeaders()
        });

        if (userVideosResponse.ok) {
          currentUserVideos = await userVideosResponse.json();
        }
      } catch (userVideoError) {
        console.log('User-specific endpoint not available, using fallback');
      }

      if (currentUserVideos.length === 0) {
        const response = await fetch(`${API_BASE_URL}/videos`, {
          headers: getAuthHeaders()
        });

        if (response.ok) {
          const allVideos = await response.json();
          currentUserVideos = allVideos.filter(video => {
            const videoUserId = video.user?._id || video.user;
            const currentUserId = user?._id || user?.id;
            return videoUserId === currentUserId;
          });
        }
      }

      setUserVideos(currentUserVideos);
    } catch (error) {
      console.error('Error fetching user videos:', error);
    } finally {
      setVideoLoading(false);
    }
  };

  const fetchLikedVideos = async () => {
    try {
      setVideoLoading(true);

      try {
        const response = await fetch(`${API_BASE_URL}/videos/liked`, {
          headers: getAuthHeaders()
        });

        if (response.ok) {
          const likedVideosData = await response.json();
          setLikedVideos(likedVideosData);
          return;
        }
      } catch (endpointError) {
        console.log('Dedicated liked endpoint not available, using fallback');
      }

      const response = await fetch(`${API_BASE_URL}/videos`, {
        headers: getAuthHeaders()
      });

      if (response.ok) {
        const allVideos = await response.json();
        const likedByUser = allVideos.filter(video => video.isLiked === true);
        setLikedVideos(likedByUser);
      }
    } catch (error) {
      console.error('Error fetching liked videos:', error);
    } finally {
      setVideoLoading(false);
    }
  };

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

  // Initialize component
  useEffect(() => {
    const initializeProfile = async () => {
      setLoading(true);
      const storedUser = localStorage.getItem("user");
      
      if (storedUser) {
        const userData = JSON.parse(storedUser);
        setCurrentUser(userData);

        if (propUserId && propUserId !== userData._id && propUserId !== userData.id) {
          // Viewing someone else's profile
          setIsOwnProfile(false);
          await fetchUserData(propUserId);
          await fetchFollowStatus(propUserId);
        } else {
          // Own profile → fetch from backend
          setIsOwnProfile(true);
          await fetchUserData(userData._id || userData.id);
          await fetchFollowRequests();
          await fetchUserPoints(); // Fetch points for own profile
        }
      } else {
        console.log("No user found, would redirect to login");
      }
      setLoading(false);
    };

    initializeProfile();
  }, [propUserId]);

  // Fetch videos when tab changes or user is loaded
  useEffect(() => {
    if (user && !loading) {
      switch (activeTab) {
        case "videos":
          fetchUserVideos();
          break;
        case "liked":
          if (isOwnProfile) fetchLikedVideos();
          break;
        case "saved":
          if (isOwnProfile) fetchSavedVideos();
          break;
        default:
          break;
      }
    }
  }, [activeTab, user, loading]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = '/login';
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
    const videoIndex = videosList.findIndex(v => v._id === videoId);
    const navigationData = {
      videos: videosList,
      startIndex: videoIndex >= 0 ? videoIndex : 0,
      source: activeTab,
      timestamp: Date.now(),
      fromProfile: true
    };

    sessionStorage.setItem('profileVideoNavigation', JSON.stringify(navigationData));
    window.location.href = '/';
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
              {activeTab === "videos" && (isOwnProfile ? "No videos yet" : `${user?.username || 'User'} hasn't posted any videos`)}
              {activeTab === "liked" && "No liked videos yet"}
              {activeTab === "saved" && "No saved videos yet"}
            </p>
            <p className="text-sm">
              {activeTab === "videos" && (isOwnProfile ? "Start creating to share your content!" : "Check back later for new content")}
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
            {/* Video Thumbnail */}
            {video.thumbnailUrl ? (
              <img
                src={video.thumbnailUrl}
                alt="Video thumbnail"
                className="w-full h-full object-cover"
                onError={(e) => {
                  // Fallback to gradient if thumbnail fails
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                }}
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center">
                <Play className="w-8 h-8 text-white opacity-70" />
              </div>
            )}
            
            {/* Fallback gradient (hidden by default) */}
            <div className="hidden w-full h-full bg-gradient-to-br from-purple-600 to-pink-600 items-center justify-center absolute inset-0">
              <Play className="w-8 h-8 text-white opacity-70" />
            </div>

            {/* Play button overlay */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
              <Play className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
            </div>

            {/* Video info overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent">
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

              <div className="absolute bottom-2 right-2 flex items-center space-x-1">
                <Heart className={`w-3 h-3 ${video.isLiked ? 'text-red-500 fill-current' : 'text-white'}`} />
                <span className="text-white text-xs font-medium">
                  {formatNumber(video.likesCount || video.likes?.length || 0)}
                </span>
              </div>

              {video.duration && (
                <div className="absolute top-2 right-2 bg-black/60 rounded px-1 py-0.5">
                  <span className="text-white text-xs">
                    {Math.floor(video.duration / 60)}:{(video.duration % 60).toString().padStart(2, '0')}
                  </span>
                </div>
              )}
            </div>

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

  // Follow Requests Modal
  const FollowRequestsModal = () => (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-xl w-full max-w-md max-h-96">
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <h3 className="text-lg font-bold">Follow Requests</h3>
          <button
            onClick={() => setShowFollowRequests(false)}
            className="p-2 hover:bg-gray-800 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 max-h-80 overflow-y-auto">
          {followRequests.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <UserPlus className="w-12 h-12 mx-auto mb-2" />
              <p>No follow requests</p>
            </div>
          ) : (
            <div className="space-y-3">
              {followRequests.map((request) => (
                <div key={request._id} className="flex items-center space-x-3 p-3 bg-gray-800 rounded-lg">
                  <img
                    src={request.requester.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(request.requester.username)}&background=random&color=fff&size=200&bold=true`}
                    alt={request.requester.username}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                  <div className="flex-1">
                    <p className="font-semibold">{request.requester.username}</p>
                    <p className="text-sm text-gray-400">
                      {new Date(request.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleFollowRequest(request._id, 'accept')}
                      className="p-2 bg-green-600 hover:bg-green-700 rounded-full transition-colors"
                    >
                      <CheckCircle className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleFollowRequest(request._id, 'reject')}
                      className="p-2 bg-red-600 hover:bg-red-700 rounded-full transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // Loading screen
  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500 mx-auto mb-6"></div>
          <p className="text-gray-400 text-lg mb-2">Loading profile...</p>
          <p className="text-gray-500 text-sm">Fetching user data from server</p>
        </div>
      </div>
    );
  }

  // If no user data after loading, show error
  if (!loading && !user) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 mb-4">
            <X className="w-16 h-16 mx-auto mb-4" />
          </div>
          <p className="text-gray-400 text-lg mb-2">Failed to load profile</p>
          <p className="text-gray-500 text-sm mb-4">Unable to fetch user data</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-pink-600 hover:bg-pink-700 px-6 py-2 rounded-lg transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const getFollowButtonText = () => {
    if (followStatus.hasPendingRequest) return "Requested";
    if (followStatus.isFollowing) return "Following";
    return "Follow";
  };

  const getFollowButtonStyle = () => {
    if (followStatus.hasPendingRequest) {
      return "bg-gray-600 text-white cursor-not-allowed";
    }
    if (followStatus.isFollowing) {
      return "bg-gray-800 text-white border border-gray-600 hover:bg-gray-700";
    }
    return "bg-pink-600 text-white hover:bg-pink-700";
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="sticky top-0 bg-black/95 backdrop-blur-lg border-b border-gray-800 z-10 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <h1 className="text-xl font-bold">{user.username}</h1>
            {user.isVerified && (
              <Shield className="w-5 h-5 text-blue-500" />
            )}
            {user.isPrivate && (
              <div className="bg-gray-700 px-2 py-1 rounded-full">
                <span className="text-xs">Private</span>
              </div>
            )}
          </div>
          <div className="flex items-center space-x-3">
            {isOwnProfile && followRequests.length > 0 && (
              <button
                onClick={() => setShowFollowRequests(true)}
                className="relative p-2 hover:bg-gray-800 rounded-full transition-colors"
              >
                <UserPlus className="w-5 h-5" />
                <div className="absolute -top-1 -right-1 bg-red-500 text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {followRequests.length}
                </div>
              </button>
            )}
            <button className="p-2 hover:bg-gray-800 rounded-full transition-colors">
              <Share className="w-5 h-5" />
            </button>
            {isOwnProfile && (
              <button
                onClick={() => window.location.href = '/recharge-points'}
                className="py-2 px-4 rounded-lg font-medium bg-gray-800 text-white border border-gray-600 hover:bg-gray-700 transition-colors"
              >
                Recharge Points
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
              src={user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.username)}&background=random&color=fff&size=200&bold=true`}
              alt={`${user.username}'s profile`}
              className="w-24 h-24 rounded-full object-cover border-2 border-gray-700"
              onError={(e) => {
                e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.username)}&background=random&color=fff&size=200&bold=true`;
              }}
            />
            {user.isVerified && (
              <div className="absolute -bottom-1 -right-1 bg-blue-500 rounded-full p-1">
                <Shield className="w-3 h-3 text-white" />
              </div>
            )}
            {!isOwnProfile && user.isOnline && (
              <div className="absolute -bottom-1 -left-1 bg-green-500 rounded-full w-4 h-4 border-2 border-black"></div>
            )}
          </div>

          <div className="flex-1">
            <div className="flex items-center space-x-4 mb-4">
              <div className="text-center">
                <p className="font-bold text-lg">{user?.following?.length || 0}</p>
                <p className="text-gray-400 text-sm">Following</p>
              </div>
              <div className="text-center">
                <p className="font-bold text-lg">{user?.followers?.length || 0}</p>
                <p className="text-gray-400 text-sm">Followers</p>
              </div>
              <div>
                <div className="flex items-center justify-center space-x-2 mb-1">
                  <p className="font-bold text-lg text-yellow-400">
                    {pointsLoading ? (
                      <div className="w-4 h-4 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      formatNumber(isOwnProfile ? userPoints : (user?.points || 0))
                    )}
                  </p>
                  {isOwnProfile && (
                    <button
                      onClick={() => window.location.href = '/withdraw-points'}
                      className="px-2 py-1 bg-yellow-600 hover:bg-yellow-700 text-white text-xs rounded-full transition-colors flex items-center space-x-1"
                    >
                      <svg
                        className="w-3 h-3"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
                        />
                      </svg>
                      <span>Withdraw</span>
                    </button>
                  )}
                </div>
                <p className="text-yellow-400 text-sm">Points</p>
              </div>
            </div>

            <div className="flex space-x-2">
              {isOwnProfile ? (
                <>
                  <button
                    onClick={() => window.location.href = '/edit-profile'}
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
                <>
                  <button
                    onClick={handleFollowToggle}
                    disabled={followLoading || followStatus.hasPendingRequest}
                    className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2 ${getFollowButtonStyle()}`}
                  >
                    {followLoading ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : followStatus.isFollowing ? (
                      <UserCheck className="w-4 h-4" />
                    ) : (
                      <UserPlus className="w-4 h-4" />
                    )}
                    <span>{getFollowButtonText()}</span>
                  </button>

                  {followStatus.canMessage && (
                    <button
                      onClick={startConversation}
                      className="py-2 px-4 rounded-lg font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors flex items-center space-x-2"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>Message</span>
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Bio Section */}
        <div className="mb-6">
          <div className="flex items-center space-x-2 mb-3">
            <h2 className="text-lg font-semibold">{user.username}</h2>
            {user.isVerified && (
              <div className="flex items-center space-x-1 bg-blue-500/20 px-2 py-1 rounded-full">
                <Shield className="w-3 h-3 text-blue-400" />
                <span className="text-xs text-blue-400">Verified</span>
              </div>
            )}
            {followStatus.relationship === 'mutual' && !isOwnProfile && (
              <div className="flex items-center space-x-1 bg-green-500/20 px-2 py-1 rounded-full">
                <Heart className="w-3 h-3 text-green-400" />
                <span className="text-xs text-green-400">Mutual</span>
              </div>
            )}
          </div>

          {user.bio && (
            <p className="text-sm text-gray-300 mb-3 leading-relaxed">
              {user.bio}
            </p>
          )}

          <div className="flex flex-col space-y-2 text-sm text-gray-400">
            {user.email && isOwnProfile && (
              <div className="flex items-center space-x-2">
                <Mail className="w-4 h-4" />
                <span>{user.email}</span>
              </div>
            )}

            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4" />
              <span>{formatJoinDate(user.createdAt)}</span>
            </div>

            {!isOwnProfile && !user.isOnline && user.lastSeen && (
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4" />
                <span>Last seen {new Date(user.lastSeen).toLocaleDateString()}</span>
              </div>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-gray-900 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-pink-500">{user.totalVideos || userVideos.length || 0}</p>
            <p className="text-sm text-gray-400">Videos Created</p>
          </div>
          <div className="bg-gray-900 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-purple-500 capitalize">
              {isOwnProfile ? (user.savedVideosCount || savedVideos.length || 0) : (followStatus.relationship || 'none')}
            </p>
            <p className="text-sm text-gray-400">{isOwnProfile ? 'Videos Saved' : 'Relationship'}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-800 mb-4">
          <button
            onClick={() => setActiveTab("videos")}
            className={`flex-1 py-3 text-center font-semibold transition-colors ${activeTab === "videos"
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

          {isOwnProfile && (
            <>
              <button
                onClick={() => setActiveTab("liked")}
                className={`flex-1 py-3 text-center font-semibold transition-colors ${activeTab === "liked"
                  ? "border-b-2 border-pink-500 text-white"
                  : "text-gray-400 hover:text-gray-200"
                  }`}
              >
                <span className="flex flex-col items-center">
                  <Heart className="w-5 h-5 mb-1" />
                  <span className="text-xs">Liked</span>
                </span>
              </button>

              <button
                onClick={() => setActiveTab("saved")}
                className={`flex-1 py-3 text-center font-semibold transition-colors ${activeTab === "saved"
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
                  <span className="text-xs">Saved</span>
                </span>
              </button>
            </>
          )}
        </div>

        {/* Content Based on Active Tab */}
        {activeTab === "videos" && renderVideoGrid(userVideos)}
        {activeTab === "liked" && isOwnProfile && renderVideoGrid(likedVideos)}
        {activeTab === "saved" && isOwnProfile && renderVideoGrid(savedVideos)}
      </div>

      {/* Follow Requests Modal */}
      {showFollowRequests && <FollowRequestsModal />}
    </div>
  );
};

export default ProfileScreen;