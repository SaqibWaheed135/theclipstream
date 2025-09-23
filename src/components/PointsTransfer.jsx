import React, { useState, useEffect, useRef } from 'react';
import { Send, AlertCircle, CheckCircle, Loader2, ArrowUpRight, ArrowDownLeft, User, Calendar, Filter, TrendingUp, Search } from 'lucide-react';

const PointsTransfer = () => {
  // Transfer form state
  const [recipient, setRecipient] = useState('');
  const [points, setPoints] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // History and stats state
  const [transfers, setTransfers] = useState([]);
  const [pagination, setPagination] = useState({});
  const [stats, setStats] = useState({ sent: { amount: 0, count: 0 }, received: { amount: 0, count: 0 } });
  const [currentBalance, setCurrentBalance] = useState(0);
  
  // Filter state
  const [filters, setFilters] = useState({
    type: 'all', // all, credit, debit
    page: 1,
    limit: 20
  });
  
  // Friends and search state
  const [friends, setFriends] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [friendsLoading, setFriendsLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchRef = useRef(null);

  const [historyLoading, setHistoryLoading] = useState(true);

  const API_BASE_URL = 'https://theclipstream-backend.onrender.com/api';

  // API call helper function
  const makeAPICall = async (url, options = {}) => {
    const token = localStorage.getItem('token');
    const defaultOptions = {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...options.headers
      }
    };

    try {
      const response = await fetch(`${API_BASE_URL}${url}`, {
        ...defaultOptions,
        ...options
      });

      if (response.status === 401) {
        localStorage.removeItem('token');
        window.location.href = '/login';
        return;
      }

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.msg || `HTTP error! status: ${response.status}`);
      }

      return data;
    } catch (err) {
      console.error('API call failed:', err);
      throw err;
    }
  };

  // Fetch current balance
  const fetchBalance = async () => {
    try {
      const data = await makeAPICall('/points/balance');
      setCurrentBalance(data.balance || 0);
    } catch (err) {
      console.error('Failed to fetch balance:', err);
    }
  };

  // Fetch transfer history
  const fetchTransferHistory = async (page = 1, type = 'all') => {
    try {
      setHistoryLoading(true);
      const params = new URLSearchParams({ page: page.toString(), limit: filters.limit.toString() });
      if (type !== 'all') params.append('type', type);

      const data = await makeAPICall(`/points/transfer/history?${params}`);

      if (data.transfers) {
        setTransfers(data.transfers);
        setPagination(data.pagination || {});
      } else {
        setTransfers([]);
        setPagination({});
      }
    } catch (err) {
      console.error('Failed to fetch transfer history:', err);
      setError('Failed to fetch transfer history');
    } finally {
      setHistoryLoading(false);
    }
  };

  // Fetch transfer statistics
  const fetchStats = async () => {
    try {
      const data = await makeAPICall('/points/transfer/stats');
      setStats(data);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  // Fetch friends
  const fetchFriends = async () => {
    try {
      setFriendsLoading(true);
      const data = await makeAPICall('/points/transfer/friends?page=1&limit=50');
      setFriends(data.friends || []);
    } catch (err) {
      console.error('Failed to fetch friends:', err);
      setError('Failed to fetch friends');
    } finally {
      setFriendsLoading(false);
    }
  };

  // Search users
  const searchUsers = async (query) => {
    if (!query || query.length < 3) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    try {
      setSearchLoading(true);
      const data = await makeAPICall(`/points/transfer/users/search?query=${encodeURIComponent(query)}`);
      setSearchResults(data.users || []);
      setShowSearchResults(true);
    } catch (err) {
      console.error('Failed to search users:', err);
      setError('Failed to search users');
    } finally {
      setSearchLoading(false);
    }
  };

  // Handle clicking outside search results
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSearchResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Initial data loading
  useEffect(() => {
    fetchBalance();
    fetchTransferHistory();
    fetchStats();
    fetchFriends();
  }, []);

  // Handle filter changes
  useEffect(() => {
    fetchTransferHistory(filters.page, filters.type);
  }, [filters]);

  // Handle recipient search input
  const handleRecipientChange = (e) => {
    const value = e.target.value;
    setRecipient(value);
    searchUsers(value);
  };

  // Handle selecting a user from search results or friends
  const handleSelectUser = (user) => {
    setRecipient(user.username);
    setShowSearchResults(false);
  };

  // Handle transfer submission
  const handleTransfer = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    // Validation
    if (!recipient.trim() || !points) {
      setError('Recipient and points are required');
      setLoading(false);
      return;
    }

    const pointsNum = parseFloat(points);
    if (pointsNum <= 0 || isNaN(pointsNum)) {
      setError('Points must be a valid number greater than 0');
      setLoading(false);
      return;
    }

    if (pointsNum > currentBalance) {
      setError('Insufficient points balance');
      setLoading(false);
      return;
    }

    if (!window.confirm(`Transfer ${pointsNum} points to ${recipient}?`)) {
      setLoading(false);
      return;
    }

    try {
      const data = await makeAPICall('/points/transfer/transfer', {
        method: 'POST',
        body: JSON.stringify({ 
          recipient: recipient.trim(), 
          points: pointsNum,
          message: message.trim() 
        })
      });

      if (data.msg) {
        setSuccess(`Successfully transferred ${pointsNum} points to ${recipient}`);
        setRecipient('');
        setPoints('');
        setMessage('');
        
        // Refresh data
        fetchTransferHistory();
        fetchBalance();
        fetchStats();
      }
    } catch (err) {
      console.error('Transfer error:', err);
      setError(err.message || 'Failed to transfer points');
    } finally {
      setLoading(false);
    }
  };

  // Format date for display
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Handle page changes
  const handlePageChange = (newPage) => {
    setFilters(prev => ({ ...prev, page: newPage }));
  };

  // Handle filter changes
  const handleFilterChange = (type) => {
    setFilters(prev => ({ ...prev, type, page: 1 }));
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-center">Transfer Points</h1>

        {/* Balance and Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Current Balance</h3>
              <TrendingUp className="w-5 h-5 text-green-400" />
            </div>
            <p className="text-2xl font-bold text-green-400 mt-2">
              {currentBalance.toLocaleString()} points
            </p>
          </div>
          
          <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Points Sent</h3>
              <ArrowUpRight className="w-5 h-5 text-red-400" />
            </div>
            <p className="text-2xl font-bold text-red-400 mt-2">
              {stats.sent.amount.toLocaleString()}
            </p>
            <p className="text-sm text-gray-400">{stats.sent.count} transfers</p>
          </div>

          <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Points Received</h3>
              <ArrowDownLeft className="w-5 h-5 text-green-400" />
            </div>
            <p className="text-2xl font-bold text-green-400 mt-2">
              {stats.received.amount.toLocaleString()}
            </p>
            <p className="text-sm text-gray-400">{stats.received.count} transfers</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Transfer Form */}
          <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
            <h2 className="text-xl font-semibold mb-4">Send Points</h2>
            
            <div className="space-y-4" ref={searchRef}>
              <div className="relative">
                <label className="block text-sm font-medium mb-2">
                  Recipient (Username or Email)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={recipient}
                    onChange={handleRecipientChange}
                    onFocus={() => setShowSearchResults(true)}
                    className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent pl-10"
                    placeholder="Enter username or email"
                    disabled={loading}
                  />
                  <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                </div>

                {/* Search Results Dropdown */}
                {showSearchResults && (searchResults.length > 0 || searchLoading) && (
                  <div className="absolute z-10 w-full mt-1 bg-gray-700 border border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {searchLoading ? (
                      <div className="p-3 flex items-center space-x-2 text-gray-400">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Searching...</span>
                      </div>
                    ) : (
                      searchResults.map((user) => (
                        <div
                          key={user._id}
                          onClick={() => handleSelectUser(user)}
                          className="p-3 hover:bg-gray-600 cursor-pointer flex items-center space-x-2"
                        >
                          {user.avatar ? (
                            <img
                              src={user.avatar}
                              alt={user.username}
                              className="w-8 h-8 rounded-full"
                            />
                          ) : (
                            <User className="w-8 h-8 text-gray-400" />
                          )}
                          <div>
                            <p className="font-medium">{user.username}</p>
                            <p className="text-sm text-gray-400">{user.email}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">
                  Points to Transfer
                </label>
                <input
                  type="number"
                  value={points}
                  onChange={(e) => setPoints(e.target.value)}
                  className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter points amount"
                  min="1"
                  max={currentBalance}
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Message (Optional)
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Add a message with your transfer"
                  rows="3"
                  maxLength="200"
                  disabled={loading}
                />
              </div>

              <button
                onClick={handleTransfer}
                disabled={loading || currentBalance <= 0}
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Transferring...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Transfer Points</span>
                  </>
                )}
              </button>
            </div>

            {error && (
              <div className="mt-4 bg-red-900/50 border border-red-500 rounded-lg p-4 flex items-center space-x-2">
                <AlertCircle className="w-5 h-5 text-red-400" />
                <p className="text-red-400">{error}</p>
              </div>
            )}

            {success && (
              <div className="mt-4 bg-green-900/50 border border-green-500 rounded-lg p-4 flex items-center space-x-2">
                <CheckCircle className="w-5 h-5 text-green-400" />
                <p className="text-green-400">{success}</p>
              </div>
            )}
          </div>

          {/* Transfer History and Friends */}
          <div className="space-y-8">
            {/* Friends List */}
            <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Your Friends</h2>
                <User className="w-5 h-5 text-gray-400" />
              </div>

              {friendsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin" />
                  <span className="ml-2">Loading friends...</span>
                </div>
              ) : friends.length === 0 ? (
                <p className="text-gray-400 text-center py-8">No friends found.</p>
              ) : (
                <div className="space-y-3 max-h-48 overflow-y-auto">
                  {friends.map((friend) => (
                    <div
                      key={friend._id}
                      onClick={() => handleSelectUser(friend)}
                      className="p-3 bg-gray-700 rounded border border-gray-600 hover:bg-gray-600 cursor-pointer flex items-center space-x-3"
                    >
                      {friend.avatar ? (
                        <img
                          src={friend.avatar}
                          alt={friend.username}
                          className="w-10 h-10 rounded-full"
                        />
                      ) : (
                        <User className="w-10 h-10 text-gray-400" />
                      )}
                      <div>
                        <p className="font-medium">{friend.username}</p>
                        <p className="text-sm text-gray-400">{friend.email}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Transfer History */}
            <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Transfer History</h2>
                <Filter className="w-5 h-5 text-gray-400" />
              </div>

              {/* Filter Buttons */}
              <div className="flex space-x-2 mb-4">
                {['all', 'debit', 'credit'].map((type) => (
                  <button
                    key={type}
                    onClick={() => handleFilterChange(type)}
                    className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                      filters.type === type
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    {type === 'all' ? 'All' : type === 'debit' ? 'Sent' : 'Received'}
                  </button>
                ))}
              </div>

              {historyLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin" />
                  <span className="ml-2">Loading history...</span>
                </div>
              ) : transfers.length === 0 ? (
                <p className="text-gray-400 text-center py-8">No transfer history found.</p>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {transfers.map((transfer) => (
                    <div
                      key={transfer._id}
                      className="bg-gray-700 p-4 rounded border border-gray-600"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          {transfer.type === 'debit' ? (
                            <ArrowUpRight className="w-5 h-5 text-red-400" />
                          ) : (
                            <ArrowDownLeft className="w-5 h-5 text-green-400" />
                          )}
                          <div>
                            <p className="font-medium">
                              {transfer.type === 'debit' ? 'Sent to' : 'Received from'}{' '}
                              {transfer.counterparty?.username || 'Unknown User'}
                            </p>
                            <p className="text-sm text-gray-400">
                              {formatDate(transfer.createdAt)}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`font-bold ${
                            transfer.type === 'debit' ? 'text-red-400' : 'text-green-400'
                          }`}>
                            {transfer.type === 'debit' ? '-' : '+'}
                            {transfer.amount.toLocaleString()} pts
                          </p>
                          <p className="text-xs text-gray-400">
                            {transfer.status}
                          </p>
                        </div>
                      </div>
                      {transfer.message && (
                        <p className="text-sm text-gray-300 mt-2 italic">
                          "{transfer.message}"
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Pagination */}
              {pagination && pagination.pages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-600">
                  <button
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={!pagination.hasPrev}
                    className="px-3 py-1 bg-gray-700 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-gray-400">
                    Page {pagination.page} of {pagination.pages}
                  </span>
                  <button
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={!pagination.hasNext}
                    className="px-3 py-1 bg-gray-700 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PointsTransfer;