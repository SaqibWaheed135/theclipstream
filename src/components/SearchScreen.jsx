import React, { useState, useEffect } from 'react';
import { Search, TrendingUp, Hash, User, Play, Heart } from 'lucide-react';

const SearchScreen = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('Top');

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
              placeholder="Search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-gray-800/50 text-white pl-10 pr-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-white/20 focus:bg-gray-800"
            />
          </div>
          
          {/* Filter Tabs */}
          <div className="flex space-x-1 overflow-x-auto scrollbar-hide">
            {filters.map((filter) => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`px-4 py-2 rounded-full font-semibold whitespace-nowrap transition-colors ${
                  activeFilter === filter 
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
        {/* Trending Section */}
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4">Trending</h2>
          <div className="grid grid-cols-2 gap-3">
            {trendingHashtags.map((item) => (
              <div key={item.tag} className="bg-gray-900 rounded-xl p-4 hover:bg-gray-800 transition-colors">
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
              <div key={creator.username} className="flex items-center justify-between bg-gray-900 p-4 rounded-xl">
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
      </div>
    </div>
  );
};

export default SearchScreen;