import React, { useState, useEffect } from 'react';
import { Search, TrendingUp, Hash, User, Play, Heart, UserCheck, UserPlus, MessageCircle, Shield, Users, Bell, UserMinus } from 'lucide-react';
import NotificationsScreen from './NotificationsScreen';
import AddFriendsScreen from './AddFriendScreen';
import GoogleAd from './GoogleAd';

const SearchScreen = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('Top');
  const [searchResults, setSearchResults] = useState([]);
  const [hashtagResults, setHashtagResults] = useState([]);
  const [videoResults, setVideoResults] = useState([]);
  const [friendsList, setFriendsList] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [userFollowStatus, setUserFollowStatus] = useState({});
  const [showNotifications, setShowNotifications] = useState(false);
  const [showAddFriends, setShowAddFriends] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);

  const API_BASE_URL = 'https://theclipstream-backend.onrender.com/api';

  const filters = ['Top', 'Users', 'Videos', 'Hashtags', 'LIVE'];

  const trendingHashtags = [
    { tag: '#fyp', videos: '15.2B', color: 'from-pink-500 to-red-500' },
    { tag: '#viral', videos: '8.7B', color: 'from-purple-500 to-blue-500' },
    { tag: '#dance', videos: '12.4B', color: 'from-green-500 to-teal-500' },
    { tag: '#comedy', videos: '9.8B', color: 'from-yellow-500 to-orange-500' },
    { tag: '#food', videos: '6.3B', color: 'from-red-500 to-pink-500' },
    { tag: '#travel', videos: '4.9B', color: 'from-blue-500 to-purple-500' }
  ];

  // Helper function to get auth headers
  const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  };

  // Load current user and notification count
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      setCurrentUser(JSON.parse(storedUser));
    }
    fetchNotificationCount();
  }, []);

  // Fetch notification count
  const fetchNotificationCount = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/follow/requests`, {
        headers: getAuthHeaders()
      });

      if (response.ok) {
        const requests = await response.json();
        setNotificationCount(requests.length);
      }
    } catch (error) {
      console.error('Error fetching notification count:', error);
    }
  };

  // Fetch user's friends
  const fetchUserFriends = async () => {
    setSearchLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/follow/friends`, {
        headers: getAuthHeaders()
      });

      if (response.ok) {
        const friends = await response.json();
        const friendsArray = friends.data || friends;
        setFriendsList(friendsArray);
        
        // Set all friends as mutual followers
        const friendsStatus = {};
        if (Array.isArray(friendsArray)) {
          friendsArray.forEach(friend => {
            friendsStatus[friend._id] = {
              isFollowing: true,
              isFollowedBy: true,
              relationship: 'mutual',
              canMessage: true
            };
          });
        }
        setUserFollowStatus(friendsStatus);
      } else {
        // Fallback: get followers and following, find mutual
        try {
          const [followersRes, followingRes] = await Promise.all([
            fetch(`${API_BASE_URL}/follow/followers`, { headers: getAuthHeaders() }),
            fetch(`${API_BASE_URL}/follow/following`, { headers: getAuthHeaders() })
          ]);

          if (followersRes.ok && followingRes.ok) {
            const followers = await followersRes.json();
            const following = await followingRes.json();
            
            const followersData = followers.data || followers;
            const followingData = following.data || following;
            
            // Find mutual friends
            const mutualFriends = followingData.filter(followedUser =>
              followersData.some(follower => follower._id === followedUser._id)
            );
            
            setFriendsList(mutualFriends);
            
            // Set mutual status
            const friendsStatus = {};
            if (Array.isArray(mutualFriends)) {
              mutualFriends.forEach(friend => {
                friendsStatus[friend._id] = {
                  isFollowing: true,
                  isFollowedBy: true,
                  relationship: 'mutual',
                  canMessage: true
                };
              });
            }
            setUserFollowStatus(friendsStatus);
          }
        } catch (fallbackError) {
          console.error('Fallback friends fetch failed:', fallbackError);
          setFriendsList([]);
        }
      }
    } catch (error) {
      console.error('Error fetching friends:', error);
      setFriendsList([]);
    } finally {
      setSearchLoading(false);
    }
  };

  // Show notifications screen
  if (showNotifications) {
    return (
      <NotificationsScreen 
        onBack={() => {
          setShowNotifications(false);
          fetchNotificationCount(); // Refresh count when coming back
        }} 
      />
    );
  }

  // Show add friends screen
  if (showAddFriends) {
    return (
      <AddFriendsScreen 
        onBack={() => setShowAddFriends(false)} 
      />
    );
  }

  // Search videos by hashtag
  const searchHashtags = async (query) => {
    if (!query.trim()) {
      setHashtagResults([]);
      setVideoResults([]);
      return;
    }

    setSearchLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/videos/`, {
        headers: getAuthHeaders()
      });

      if (response.ok) {
        const videos = await response.json();
        
        // Filter videos by hashtag
        const hashtagQuery = query.startsWith('#') ? query.toLowerCase() : `#${query.toLowerCase()}`;
        const matchingVideos = videos.filter(video => 
          video.hashtags && video.hashtags.some(tag => 
            tag.toLowerCase().includes(hashtagQuery) || 
            tag.toLowerCase().includes(query.toLowerCase())
          )
        );

        // Create hashtag summary
        const hashtagCounts = {};
        videos.forEach(video => {
          if (video.hashtags) {
            video.hashtags.forEach(tag => {
              const lowerTag = tag.toLowerCase();
              if (lowerTag.includes(query.toLowerCase()) || lowerTag.includes(hashtagQuery)) {
                hashtagCounts[tag] = (hashtagCounts[tag] || 0) + 1;
              }
            });
          }
        });

        const hashtagSummary = Object.entries(hashtagCounts).map(([tag, count]) => ({
          tag,
          videoCount: count,
          color: trendingHashtags.find(t => t.tag === tag)?.color || 'from-gray-500 to-gray-600'
        }));

        setHashtagResults(hashtagSummary);
        setVideoResults(matchingVideos);
      }
    } catch (error) {
      console.error('Error searching hashtags:', error);
      setHashtagResults([]);
      setVideoResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  // Search users function
  const searchUsers = async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setSearchLoading(true);
    try {
      let users = [];

      try {
        const searchResponse = await fetch(
          `${API_BASE_URL}/auth/searchUsers?q=${encodeURIComponent(query)}`,
          { headers: getAuthHeaders() }
        );

        if (searchResponse.ok) {
          const resJson = await searchResponse.json();
          users = resJson.data || [];
        } else if (searchResponse.status === 404) {
          throw new Error('Search endpoint not found');
        }

      } catch (searchError) {
        console.log('Using fallback search method');
        try {
          const allUsersResponse = await fetch(`${API_BASE_URL}/auth/getUsers`, {
            headers: getAuthHeaders()
          });

          if (allUsersResponse.ok) {
            const allUsersData = await allUsersResponse.json();
            const allUsers = allUsersData.data || allUsersData;

            users = allUsers.filter(user =>
              user.username.toLowerCase().includes(query.toLowerCase()) &&
              user._id !== currentUser?.id &&
              user._id !== currentUser?._id
            );
          }
        } catch (fallbackError) {
          console.error('Fallback search also failed:', fallbackError);
          users = [];
        }
      }

      setSearchResults(users);

      // Fetch follow status for each user
      for (const user of users) {
        fetchFollowStatus(user._id);
      }
    } catch (error) {
      console.error('Error searching users:', error);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  // Fetch follow status for a user
  const fetchFollowStatus = async (userId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/follow/status/${userId}`, {
        headers: getAuthHeaders()
      });

      if (response.ok) {
        const status = await response.json();
        setUserFollowStatus(prev => ({
          ...prev,
          [userId]: status
        }));
      }
    } catch (error) {
      console.error('Error fetching follow status:', error);
    }
  };

  // Handle follow/unfollow
  const handleFollowToggle = async (user) => {
    const userId = user._id;
    const currentStatus = userFollowStatus[userId] || {};

    try {
      if (currentStatus.isFollowing) {
        const response = await fetch(`${API_BASE_URL}/follow/unfollow/${userId}`, {
          method: 'POST',
          headers: getAuthHeaders()
        });

        if (response.ok) {
          setUserFollowStatus(prev => ({
            ...prev,
            [userId]: {
              ...prev[userId],
              isFollowing: false,
              canMessage: false,
              relationship: prev[userId]?.isFollowedBy ? 'follower' : 'none'
            }
          }));

          // If this was a mutual friend, remove from friends list
          if (currentStatus.relationship === 'mutual') {
            setFriendsList(prev => prev.filter(friend => friend._id !== userId));
          }
        }
      } else {
        const response = await fetch(`${API_BASE_URL}/follow/request/${userId}`, {
          method: 'POST',
          headers: getAuthHeaders()
        });

        if (response.ok) {
          const result = await response.json();

          if (result.requiresApproval) {
            setUserFollowStatus(prev => ({
              ...prev,
              [userId]: {
                ...prev[userId],
                hasPendingRequest: true
              }
            }));
          } else {
            setUserFollowStatus(prev => ({
              ...prev,
              [userId]: {
                ...prev[userId],
                isFollowing: true,
                canMessage: prev[userId]?.isFollowedBy || false,
                relationship: prev[userId]?.isFollowedBy ? 'mutual' : 'following'
              }
            }));
          }
        }
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
    }
  };

  // Start conversation
  const startConversation = async (user) => {
    try {
      const response = await fetch(`${API_BASE_URL}/messages/conversations`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ recipientId: user._id })
      });

      if (response.ok) {
        const conversation = await response.json();
        window.location.href = `/messages/${conversation._id}`;
      } else {
        const error = await response.json();
        alert(error.msg || 'Cannot start conversation. Both users must follow each other to message.');
      }
    } catch (error) {
      console.error('Error starting conversation:', error);
      alert('Failed to start conversation');
    }
  };

  // Navigate to user profile
  const goToProfile = (user) => {
    window.location.href = `/profile/${user._id}`;
  };

  // Handle search input change
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);

    if (value.trim()) {
      const timeoutId = setTimeout(() => {
        if (activeFilter === 'Users') {
          searchUsers(value);
        } else if (activeFilter === 'Hashtags') {
          searchHashtags(value);
        }
      }, 300);

      return () => clearTimeout(timeoutId);
    } else {
      setSearchResults([]);
      setHashtagResults([]);
      setVideoResults([]);
      
      // Show friends when Users filter is active and search is empty
      if (activeFilter === 'Users') {
        fetchUserFriends();
      }
    }
  };

  // Handle filter change
  const handleFilterChange = (filter) => {
    setActiveFilter(filter);
    setSearchResults([]);
    setHashtagResults([]);
    setVideoResults([]);
    
    if (filter === 'Users') {
      if (searchTerm.trim()) {
        searchUsers(searchTerm);
      } else {
        // Show friends when Users tab is selected and no search term
        fetchUserFriends();
      }
    } else if (filter === 'Hashtags' && searchTerm.trim()) {
      searchHashtags(searchTerm);
    }
  };

  // Get follow button text
  const getFollowButtonText = (userId) => {
    const status = userFollowStatus[userId] || {};
    if (status.hasPendingRequest) return "Requested";
    if (status.isFollowing) return "Following";
    return "Follow";
  };

  // Get follow button style
  const getFollowButtonStyle = (userId) => {
    const status = userFollowStatus[userId] || {};
    if (status.hasPendingRequest) {
      return "bg-gray-600 text-white cursor-not-allowed";
    }
    if (status.isFollowing) {
      return "bg-gray-800 text-white border border-gray-600 hover:bg-gray-700";
    }
    return "bg-pink-600 text-white hover:bg-pink-700";
  };

  // Format numbers
  const formatNumber = (num) => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(0)}K`;
    }
    return num?.toString() || '0';
  };

  // Render hashtag results
  const renderHashtagResults = () => {
    if (searchLoading) {
      return (
        <div className="space-y-4">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="bg-gray-900 p-4 rounded-xl animate-pulse">
              <div className="h-6 bg-gray-700 rounded w-32 mb-2"></div>
              <div className="h-4 bg-gray-700 rounded w-20"></div>
            </div>
          ))}
        </div>
      );
    }

    if (hashtagResults.length === 0 && searchTerm.trim()) {
      return (
        <div className="text-center py-8 text-gray-400">
          <Hash className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p className="text-lg">No hashtags found</p>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {hashtagResults.map((hashtag) => (
          <div key={hashtag.tag} className="bg-gray-900 rounded-xl p-4 hover:bg-gray-800 transition-colors cursor-pointer">
            <div className="flex items-center space-x-3">
              <div className={`w-10 h-10 rounded-lg bg-gradient-to-r ${hashtag.color}`}></div>
              <div className="flex-1">
                <p className="font-bold text-white text-lg">{hashtag.tag}</p>
                <p className="text-gray-400 text-sm">{formatNumber(hashtag.videoCount)} videos</p>
              </div>
            </div>
          </div>
        ))}
        
        {videoResults.length > 0 && (
          <div className="mt-6">
            <h3 className="text-lg font-bold mb-3">Videos</h3>
            <div className="grid grid-cols-3 gap-2">
              {videoResults.slice(0, 9).map((video) => (
                <div key={video._id} className="relative aspect-[9/16] bg-gray-800 rounded-lg overflow-hidden cursor-pointer hover:scale-105 transition-transform">
                  <video
                    src={video.url}
                    className="w-full h-full object-cover"
                    muted
                  />
                  <div className="absolute bottom-2 left-2 flex items-center space-x-1 text-white text-xs">
                    <Play className="w-3 h-3" />
                    <span>{formatNumber(video.likesCount || 0)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Render user results (search results or friends list)
  const renderUserResults = () => {
    const usersToShow = searchTerm.trim() ? searchResults : friendsList;
    const isShowingFriends = !searchTerm.trim() && activeFilter === 'Users';

    if (searchLoading) {
      return (
        <div className="space-y-4">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="bg-gray-900 p-4 rounded-xl animate-pulse">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gray-700 rounded-full"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-700 rounded w-24 mb-2"></div>
                  <div className="h-3 bg-gray-700 rounded w-16"></div>
                </div>
                <div className="w-20 h-8 bg-gray-700 rounded"></div>
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (usersToShow.length === 0) {
      return (
        <div className="text-center py-8 text-gray-400">
          <User className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p className="text-lg">
            {isShowingFriends ? 'No friends yet' : 'No users found'}
          </p>
          <p className="text-sm mt-2">
            {isShowingFriends ? 'Start following people to build your friend network!' : 'Try a different search term'}
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {usersToShow.map((user) => {
          const followStatus = userFollowStatus[user._id] || {};
          const isFriend = followStatus.relationship === 'mutual';

          return (
            <div key={user._id} className="bg-gray-900 p-4 rounded-xl hover:bg-gray-800 transition-colors">
              <div className="flex items-center space-x-3">
                <button onClick={() => goToProfile(user)} className="flex items-center space-x-3 flex-1">
                  <div className="relative">
                    <img
                      src={user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.username)}&background=random&color=fff&size=200&bold=true`}
                      alt={user.username}
                      className="w-12 h-12 rounded-full object-cover"
                      onError={(e) => {
                        e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.username)}&background=random&color=fff&size=200&bold=true`;
                      }}
                    />
                    {user.isVerified && (
                      <div className="absolute -bottom-1 -right-1 bg-blue-500 rounded-full p-1">
                        <Shield className="w-2 h-2 text-white" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 text-left">
                    <div className="flex items-center space-x-1">
                      <p className="font-bold text-white">{user.username}</p>
                      {user.isVerified && (
                        <Shield className="w-4 h-4 text-blue-500" />
                      )}
                      {isFriend && (
                        <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">
                          <Users className="w-3 h-3 inline mr-1" />
                          Friends
                        </span>
                      )}
                      {followStatus.relationship === 'following' && (
                        <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full">
                          Following
                        </span>
                      )}
                    </div>
                    <p className="text-gray-400 text-sm">
                      {formatNumber(user.followersCount || 0)} followers
                      {user.bio && <span> • {user.bio.substring(0, 30)}{user.bio.length > 30 ? '...' : ''}</span>}
                    </p>
                  </div>
                </button>

                <div className="flex items-center space-x-2">
                  {/* Message button - show if friends or can message */}
                  {(isFriend || followStatus.canMessage) && (
                    <button
                      onClick={() => startConversation(user)}
                      className="p-2 bg-blue-600 hover:bg-blue-700 rounded-full transition-colors"
                      title="Send Message"
                    >
                      <MessageCircle className="w-4 h-4 text-white" />
                    </button>
                  )}

                  {/* Follow/Unfollow button */}
                  <button
                    onClick={() => handleFollowToggle(user)}
                    disabled={followStatus.hasPendingRequest}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-1 ${getFollowButtonStyle(user._id)}`}
                  >
                    {followStatus.isFollowing ? (
                      followStatus.relationship === 'mutual' ? (
                        <UserMinus className="w-4 h-4" />
                      ) : (
                        <UserCheck className="w-4 h-4" />
                      )
                    ) : (
                      <UserPlus className="w-4 h-4" />
                    )}
                    <span className="text-sm">{getFollowButtonText(user._id)}</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <GoogleAd slot="8700754425" />
      <div className="sticky top-0 bg-black/95 backdrop-blur-lg border-b border-gray-800 z-10">
        <div className="p-4">
          {/* Top bar with title, friends button, and notifications */}
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold">Search</h1>
            <div className="flex items-center space-x-2">
              {/* Add Friends Button */}
              <button
                onClick={() => setShowAddFriends(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-pink-600 hover:bg-pink-700 rounded-full transition-colors"
              >
                <UserPlus className="w-5 h-5" />
                <span className="text-sm font-medium">Add Friends</span>
              </button>
              
              {/* Notifications Button */}
              <button
                onClick={() => setShowNotifications(true)}
                className="relative p-2 bg-gray-800 hover:bg-gray-700 rounded-full transition-colors"
              >
                <Bell className="w-6 h-6" />
                {notificationCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                    {notificationCount > 9 ? '9+' : notificationCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder={
                activeFilter === 'Users' ? 'Search users...' :
                activeFilter === 'Hashtags' ? 'Search hashtags...' : 'Search'
              }
              value={searchTerm}
              onChange={handleSearchChange}
              className="w-full bg-gray-800/50 text-white pl-10 pr-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-white/20 focus:bg-gray-800"
            />
          </div>

          {/* Filter Tabs */}
          <div className="flex space-x-1 overflow-x-auto scrollbar-hide">
            {filters.map((filter) => (
              <button
                key={filter}
                onClick={() => handleFilterChange(filter)}
                className={`px-4 py-2 rounded-full font-semibold whitespace-nowrap transition-colors ${activeFilter === filter
                    ? 'bg-white text-black'
                    : 'bg-gray-800 text-white hover:bg-gray-700'
                  }`}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="p-4">
        {/* Show search results based on active filter */}
        {activeFilter === 'Users' ? (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">
                {searchTerm.trim() ? 'Search Results' : 'Your Friends'}
              </h2>
              {!searchTerm.trim() && (
                <span className="text-sm text-gray-400">
                  {friendsList.length} friends
                </span>
              )}
            </div>
            {renderUserResults()}
          </div>
        ) : activeFilter === 'Hashtags' && (searchTerm.trim() || hashtagResults.length > 0) ? (
          <div className="mb-8">
            <h2 className="text-xl font-bold mb-4">Hashtags</h2>
            {renderHashtagResults()}
          </div>
        ) : (
          <>
            {/* Trending Section */}
            <div className="mb-8">
              <h2 className="text-xl font-bold mb-4">Trending Hashtags</h2>
              <div className="grid grid-cols-2 gap-3">
                {trendingHashtags.map((item) => (
                  <div key={item.tag} className="bg-gray-900 rounded-xl p-4 hover:bg-gray-800 transition-colors cursor-pointer"
                       onClick={() => {
                         setActiveFilter('Hashtags');
                         setSearchTerm(item.tag.substring(1));
                         searchHashtags(item.tag.substring(1));
                       }}>
                    <div className={`w-8 h-8 rounded-lg bg-gradient-to-r ${item.color} mb-3`}></div>
                    <span className="text-white font-bold text-lg">{item.tag}</span>
                    <p className="text-gray-400 text-sm mt-1">{item.videos} videos</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="mb-8">
              <h2 className="text-xl font-bold mb-4">Discover</h2>
              <div className="space-y-3">
                <button 
                  onClick={() => setActiveFilter('Users')}
                  className="w-full bg-gray-900 p-4 rounded-xl hover:bg-gray-800 transition-colors text-left"
                >
                  <div className="flex items-center space-x-3">
                    <User className="w-6 h-6 text-pink-500" />
                    <div>
                      <p className="font-bold">Find People & Friends</p>
                      <p className="text-gray-400 text-sm">Discover new creators and see your friends</p>
                    </div>
                  </div>
                </button>
                
                <button 
                  onClick={() => setActiveFilter('Hashtags')}
                  className="w-full bg-gray-900 p-4 rounded-xl hover:bg-gray-800 transition-colors text-left"
                >
                  <div className="flex items-center space-x-3">
                    <Hash className="w-6 h-6 text-blue-500" />
                    <div>
                      <p className="font-bold">Explore Hashtags</p>
                      <p className="text-gray-400 text-sm">Find trending topics</p>
                    </div>
                  </div>
                </button>

                <button 
                  onClick={() => setShowNotifications(true)}
                  className="w-full bg-gray-900 p-4 rounded-xl hover:bg-gray-800 transition-colors text-left"
                >
                  <div className="flex items-center space-x-3 justify-between">
                    <div className="flex items-center space-x-3">
                      <Bell className="w-6 h-6 text-yellow-500" />
                      <div>
                        <p className="font-bold">Notifications</p>
                        <p className="text-gray-400 text-sm">Follow requests and updates</p>
                      </div>
                    </div>
                    {notificationCount > 0 && (
                      <span className="bg-red-500 text-white text-sm px-2 py-1 rounded-full">
                        {notificationCount}
                      </span>
                    )}
                  </div>
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default SearchScreen;