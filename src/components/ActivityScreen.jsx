import React, { useState, useEffect } from 'react';
import { Heart, MessageCircle, Users, UserPlus, Play, Gift, Share2, Bell, Filter } from 'lucide-react';

const ActivityScreen = () => {
  const [activeTab, setActiveTab] = useState('all');
  const [activities, setActivities] = useState([]);
  const [unreadCount, setUnreadCount] = useState(5);

  // Sample activity data
  const sampleActivities = [
    {
      id: 1,
      type: 'like',
      user: {
        username: 'dance_queen',
        avatar: 'https://images.unsplash.com/photo-1494790108755-2616b88e77c3?w=150&h=150&fit=crop&crop=faces',
        verified: true
      },
      action: 'liked your video',
      content: {
        type: 'video',
        thumbnail: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=100&h=150&fit=crop',
        title: 'Amazing dance moves!'
      },
      timestamp: Date.now() - 120000, // 2 minutes ago
      isRead: false
    },
    {
      id: 2,
      type: 'comment',
      user: {
        username: 'tech_guru',
        avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=faces',
        verified: true
      },
      action: 'commented on your video',
      comment: 'This is absolutely amazing! How did you do this? 🔥',
      content: {
        type: 'video',
        thumbnail: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=100&h=150&fit=crop',
        title: 'Cool tech trick'
      },
      timestamp: Date.now() - 300000, // 5 minutes ago
      isRead: false
    },
    {
      id: 3,
      type: 'follow',
      user: {
        username: 'newuser789',
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop&crop=faces',
        verified: false
      },
      action: 'started following you',
      timestamp: Date.now() - 600000, // 10 minutes ago
      isRead: false
    },
    {
      id: 4,
      type: 'mention',
      user: {
        username: 'creator_star',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=faces',
        verified: true
      },
      action: 'mentioned you in a comment',
      comment: '@username check this out!',
      content: {
        type: 'video',
        thumbnail: 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=100&h=150&fit=crop',
        title: 'Viral content'
      },
      timestamp: Date.now() - 1800000, // 30 minutes ago
      isRead: true
    },
    {
      id: 5,
      type: 'gift',
      user: {
        username: 'generous_fan',
        avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=faces',
        verified: false
      },
      action: 'sent you a gift',
      gift: { name: 'Rose', emoji: '🌹', value: 5 },
      content: {
        type: 'livestream',
        title: 'Your live stream'
      },
      timestamp: Date.now() - 3600000, // 1 hour ago
      isRead: true
    },
    {
      id: 6,
      type: 'share',
      user: {
        username: 'viral_maker',
        avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=faces',
        verified: false
      },
      action: 'shared your video',
      content: {
        type: 'video',
        thumbnail: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=100&h=150&fit=crop',
        title: 'Dance tutorial'
      },
      timestamp: Date.now() - 7200000, // 2 hours ago
      isRead: true
    },
    {
      id: 7,
      type: 'collaboration',
      user: {
        username: 'collab_partner',
        avatar: 'https://images.unsplash.com/photo-1494790108755-2616b88e77c3?w=150&h=150&fit=crop&crop=faces',
        verified: true
      },
      action: 'wants to collaborate with you',
      timestamp: Date.now() - 86400000, // 1 day ago
      isRead: true
    }
  ];

  useEffect(() => {
    setActivities(sampleActivities);
  }, []);

  const getTimeAgo = (timestamp) => {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  const getActivityIcon = (type) => {
    switch (type) {
      case 'like':
        return <Heart className="w-6 h-6 text-red-500 fill-current" />;
      case 'comment':
      case 'mention':
        return <MessageCircle className="w-6 h-6 text-blue-500" />;
      case 'follow':
        return <UserPlus className="w-6 h-6 text-green-500" />;
      case 'gift':
        return <Gift className="w-6 h-6 text-yellow-500" />;
      case 'share':
        return <Share2 className="w-6 h-6 text-purple-500" />;
      case 'collaboration':
        return <Users className="w-6 h-6 text-pink-500" />;
      default:
        return <Bell className="w-6 h-6 text-gray-500" />;
    }
  };

  const filteredActivities = activities.filter(activity => {
    if (activeTab === 'all') return true;
    if (activeTab === 'likes') return activity.type === 'like';
    if (activeTab === 'comments') return activity.type === 'comment' || activity.type === 'mention';
    if (activeTab === 'follows') return activity.type === 'follow';
    return true;
  });

  const markAsRead = (activityId) => {
    setActivities(prev => 
      prev.map(activity => 
        activity.id === activityId ? { ...activity, isRead: true } : activity
      )
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllAsRead = () => {
    setActivities(prev => prev.map(activity => ({ ...activity, isRead: true })));
    setUnreadCount(0);
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="sticky top-0 bg-black/90 backdrop-blur-sm z-10 pt-12 pb-4">
        <div className="px-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl font-bold">Activity</h1>
              {unreadCount > 0 && (
                <div className="bg-red-500 text-white text-xs px-2 py-1 rounded-full min-w-6 h-6 flex items-center justify-center">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </div>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <button 
                onClick={markAllAsRead}
                className="text-pink-500 text-sm font-medium hover:text-pink-400 transition-colors"
                disabled={unreadCount === 0}
              >
                Mark all read
              </button>
              <button className="p-2 hover:bg-gray-800 rounded-full transition-colors">
                <Filter className="w-5 h-5 text-gray-400" />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex space-x-2 overflow-x-auto hide-scrollbar">
            {[
              { id: 'all', label: 'All', count: activities.length },
              { id: 'likes', label: 'Likes', count: activities.filter(a => a.type === 'like').length },
              { id: 'comments', label: 'Comments', count: activities.filter(a => a.type === 'comment' || a.type === 'mention').length },
              { id: 'follows', label: 'Followers', count: activities.filter(a => a.type === 'follow').length }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-full font-bold whitespace-nowrap flex items-center space-x-2 transition-all duration-200 ${
                  activeTab === tab.id
                    ? 'bg-pink-500 text-white'
                    : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'
                }`}
              >
                <span>{tab.label}</span>
                {tab.count > 0 && (
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    activeTab === tab.id ? 'bg-pink-600' : 'bg-gray-700'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Activity Feed */}
      <div className="pb-20">
        {filteredActivities.length === 0 ? (
          <div className="text-center py-16">
            <Bell className="w-16 h-16 text-gray-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-400 mb-2">No activity yet</h3>
            <p className="text-gray-500">When people interact with your content, you'll see it here</p>
          </div>
        ) : (
          <div className="space-y-1">
            {filteredActivities.map((activity) => (
              <div
                key={activity.id}
                onClick={() => !activity.isRead && markAsRead(activity.id)}
                className={`p-4 hover:bg-gray-900/50 transition-colors cursor-pointer ${
                  !activity.isRead ? 'bg-pink-500/5 border-l-4 border-pink-500' : ''
                }`}
              >
                <div className="flex items-start space-x-3">
                  {/* User Avatar */}
                  <div className="relative flex-shrink-0">
                    <img
                      src={activity.user.avatar}
                      alt={activity.user.username}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                    {activity.user.verified && (
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                        <div className="w-3 h-3 text-white text-xs">✓</div>
                      </div>
                    )}
                    {/* Activity Type Icon */}
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-black rounded-full flex items-center justify-center border-2 border-black">
                      {getActivityIcon(activity.type)}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-white">
                          <span className="font-bold">@{activity.user.username}</span>
                          {' '}
                          <span className="text-gray-300">{activity.action}</span>
                        </p>
                        
                        {/* Additional content based on type */}
                        {activity.comment && (
                          <p className="text-gray-300 mt-1 text-sm bg-gray-800 p-2 rounded-lg">
                            "{activity.comment}"
                          </p>
                        )}
                        
                        {activity.gift && (
                          <div className="flex items-center space-x-2 mt-1">
                            <span className="text-2xl">{activity.gift.emoji}</span>
                            <span className="text-yellow-400 font-bold">{activity.gift.name}</span>
                            <span className="text-gray-400 text-sm">({activity.gift.value} coins)</span>
                          </div>
                        )}
                        
                        <p className="text-gray-500 text-sm mt-1">{getTimeAgo(activity.timestamp)}</p>
                      </div>

                      {/* Content Thumbnail */}
                      {activity.content && (
                        <div className="ml-3 flex-shrink-0">
                          {activity.content.type === 'video' ? (
                            <div className="relative">
                              <img
                                src={activity.content.thumbnail}
                                alt={activity.content.title}
                                className="w-12 h-16 rounded-lg object-cover"
                              />
                              <div className="absolute inset-0 flex items-center justify-center">
                                <Play className="w-4 h-4 text-white drop-shadow" />
                              </div>
                            </div>
                          ) : (
                            <div className="w-12 h-12 bg-red-500 rounded-lg flex items-center justify-center">
                              <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center space-x-4 mt-3">
                      {activity.type === 'follow' && (
                        <button className="bg-pink-500 text-white px-4 py-1.5 rounded-full text-sm font-bold hover:bg-pink-600 transition-colors">
                          Follow Back
                        </button>
                      )}
                      
                      {activity.type === 'collaboration' && (
                        <div className="flex space-x-2">
                          <button className="bg-green-500 text-white px-4 py-1.5 rounded-full text-sm font-bold hover:bg-green-600 transition-colors">
                            Accept
                          </button>
                          <button className="bg-gray-600 text-white px-4 py-1.5 rounded-full text-sm font-bold hover:bg-gray-700 transition-colors">
                            Decline
                          </button>
                        </div>
                      )}
                      
                      {(activity.type === 'comment' || activity.type === 'mention') && (
                        <button className="text-gray-400 hover:text-white text-sm font-medium transition-colors">
                          Reply
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style jsx>{`
        .hide-scrollbar {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
};

export default ActivityScreen;