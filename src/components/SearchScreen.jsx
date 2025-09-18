import React, { useState, useEffect } from 'react';
import { Search, TrendingUp, Hash, User, Play, Heart, UserCheck, UserPlus, MessageCircle, Shield } from 'lucide-react';

const SearchScreen = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('Top');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [userFollowStatus, setUserFollowStatus] = useState({});

  const API_BASE_URL = 'https://theclipstream-backend.onrender.com/api';

  const filters = ['Top', 'Users', 'Videos', 'Sounds', 'LIVE', 'Hashtags'];

  const trendingHashtags = [
    { tag: '#fyp', videos: '15.2B', color: 'from-pink-500 to-red-500' },
    { tag: '#viral', videos: '8.7B', color: 'from-purple-500 to-blue-500' },
    { tag: '#dance', videos: '12.4B', color: 'from-green-500 to-teal-500' },
    { tag: '#comedy', videos: '9.8B', color: 'from-yellow-500 to-orange-500' },
    { tag: '#food', videos: '6.3B', color: 'from-red-500 to-pink-500' },
    { tag: '#travel', videos: '4.9B', color: 'from-blue-500 to-purple-500' }
  ];

  const trendingCreators = [
    { username: 'creator1', followers: '2.3M', verified: true },
    { username: 'dancer_pro', followers: '1.8M', verified: true },
    { username: 'chef_amazing', followers: '3.1M', verified: false },
    { username: 'comedian_king', followers: '1.2M', verified: true }
  ];

  // Helper function to get auth headers
  const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  };

  // Load current user
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      setCurrentUser(JSON.parse(storedUser));
    }
  }, []);

  // Search users function
  const searchUsers = async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setSearchLoading(true);
    try {
      // Try dedicated search endpoint first, fallback to getting all users
      let users = [];

      try {
        // Try dedicated search endpoint first (using findUsers endpoint to avoid conflicts)
        const searchResponse = await fetch(
          `${API_BASE_URL}/auth/searchUsers?q=${encodeURIComponent(query)}`,
          { headers: getAuthHeaders() }
        );

        if (searchResponse.ok) {
          const resJson = await searchResponse.json();
          users = resJson.data || [];   // ✅ correctly grab array
        } else if (searchResponse.status === 404) {
          throw new Error('Search endpoint not found');
        }

      } catch (searchError) {
        console.log('Using fallback search method');
        // Fallback: get all users and filter client-side
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
        // Unfollow
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
        }
      } else {
        // Follow
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
        // Navigate to messages with this conversation
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

    // Only search for users when Users filter is active
    if (activeFilter === 'Users' && value.trim()) {
      const timeoutId = setTimeout(() => {
        searchUsers(value);
      }, 300); // Debounce search

      return () => clearTimeout(timeoutId);
    } else if (!value.trim()) {
      setSearchResults([]);
    }
  };

  // Handle filter change
  const handleFilterChange = (filter) => {
    setActiveFilter(filter);
    if (filter === 'Users' && searchTerm.trim()) {
      searchUsers(searchTerm);
    } else {
      setSearchResults([]);
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

  // Format follower count
  const formatNumber = (num) => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(0)}K`;
    }
    return num?.toString() || '0';
  };

  // Render user search results
  const renderUserResults = () => {
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

    if (searchResults.length === 0 && searchTerm.trim()) {
      return (
        <div className="text-center py-8 text-gray-400">
          <User className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p className="text-lg">No users found</p>
          <p className="text-sm">Try searching with a different username</p>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {searchResults.map((user) => {
          const followStatus = userFollowStatus[user._id] || {};

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
                      {followStatus.relationship === 'mutual' && (
                        <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">
                          Mutual
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
                  {/* Message button - only show if can message */}
                  {followStatus.canMessage && (
                    <button
                      onClick={() => startConversation(user)}
                      className="p-2 bg-blue-600 hover:bg-blue-700 rounded-full transition-colors"
                      title="Send Message"
                    >
                      <MessageCircle className="w-4 h-4 text-white" />
                    </button>
                  )}

                  {/* Follow button */}
                  <button
                    onClick={() => handleFollowToggle(user)}
                    disabled={followStatus.hasPendingRequest}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-1 ${getFollowButtonStyle(user._id)}`}
                  >
                    {followStatus.isFollowing ? (
                      <UserCheck className="w-4 h-4" />
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
      <div className="sticky top-0 bg-black/95 backdrop-blur-lg border-b border-gray-800 z-10">
        <div className="p-4">
          {/* Search Bar */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder={activeFilter === 'Users' ? 'Search users...' : 'Search'}
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
        {/* Show user search results when Users filter is active and there's a search term */}
        {activeFilter === 'Users' && (searchTerm.trim() || searchResults.length > 0) ? (
          <div className="mb-8">
            <h2 className="text-xl font-bold mb-4">Users</h2>
            {renderUserResults()}
          </div>
        ) : (
          <>
            {/* Trending Section - show when not actively searching users */}
            <div className="mb-8">
              <h2 className="text-xl font-bold mb-4">Trending</h2>
              <div className="grid grid-cols-2 gap-3">
                {trendingHashtags.map((item) => (
                  <div key={item.tag} className="bg-gray-900 rounded-xl p-4 hover:bg-gray-800 transition-colors cursor-pointer">
                    <div className={`w-8 h-8 rounded-lg bg-gradient-to-r ${item.color} mb-3`}></div>
                    <span className="text-white font-bold text-lg">{item.tag}</span>
                    <p className="text-gray-400 text-sm mt-1">{item.videos} videos</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Suggested Accounts */}
            <div>
              <h2 className="text-xl font-bold mb-4">Suggested accounts</h2>
              <div className="space-y-3">
                {trendingCreators.map((creator, index) => (
                  <div key={creator.username} className="flex items-center justify-between bg-gray-900 p-4 rounded-xl hover:bg-gray-800 transition-colors">
                    <div className="flex items-center space-x-3">
                      <img
                        src={`https://i.pravatar.cc/150?img=${index + 10}`}
                        alt={creator.username}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                      <div>
                        <div className="flex items-center space-x-1">
                          <p className="font-bold">{creator.username}</p>
                          {creator.verified && (
                            <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                        <p className="text-gray-400 text-sm">{creator.followers} followers</p>
                      </div>
                    </div>
                    <button className="bg-red-500 hover:bg-red-600 px-6 py-2 rounded-lg font-bold transition-colors">
                      Follow
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default SearchScreen;