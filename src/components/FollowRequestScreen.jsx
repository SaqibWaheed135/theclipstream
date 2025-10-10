import React, { useState, useEffect } from 'react';
import { ArrowLeft, UserPlus, UserCheck, UserX, Clock, Send, Users, Search, User } from 'lucide-react';

const FollowRequestsScreen = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState('received'); // 'received' or 'sent'
  const [receivedRequests, setReceivedRequests] = useState([]);
  const [sentRequests, setSentRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingRequest, setProcessingRequest] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredReceivedRequests, setFilteredReceivedRequests] = useState([]);

  const API_BASE_URL = 'https://theclipstream-backend.onrender.com/api';

  // Helper function to get auth headers
  const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  };

  // Fetch all requests on component mount
  useEffect(() => {
    fetchReceivedRequests();
    // Note: You'll need to implement getSentRequests endpoint in your backend
    // fetchSentRequests();
  }, []);

  // Filter received requests based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredReceivedRequests(receivedRequests);
    } else {
      const filtered = receivedRequests.filter(request =>
        request.requester.username.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredReceivedRequests(filtered);
    }
  }, [searchTerm, receivedRequests]);

  // Fetch received follow requests
  const fetchReceivedRequests = async () => {
    setLoading(true);
    try {
      const response = await fetch(`$s`, {
        headers: getAuthHeaders()
      });

      if (response.ok) {
        const requests = await response.json();
        setReceivedRequests(requests);
        setFilteredReceivedRequests(requests);
      } else {
        console.error('Failed to fetch follow requests');
      }
    } catch (error) {
      console.error('Error fetching follow requests:', error);
    } finally {
      setLoading(false);
    }
  };

  // Accept follow request
  const acceptRequest = async (requestId) => {
    setProcessingRequest(requestId);
    try {
      const response = await fetch(`${API_BASE_URL}/follow/accept/${requestId}`, {
        method: 'POST',
        headers: getAuthHeaders()
      });

      if (response.ok) {
        // Remove the request from both lists
        setReceivedRequests(prev => prev.filter(req => req._id !== requestId));
        setFilteredReceivedRequests(prev => prev.filter(req => req._id !== requestId));
        
        // Show success message
        showSuccessMessage('Follow request accepted!');
      } else {
        const error = await response.json();
        alert(error.msg || 'Failed to accept request');
      }
    } catch (error) {
      console.error('Error accepting request:', error);
      alert('Failed to accept request');
    } finally {
      setProcessingRequest(null);
    }
  };

  // Reject follow request
  const rejectRequest = async (requestId) => {
    setProcessingRequest(requestId);
    try {
      const response = await fetch(`${API_BASE_URL}/follow/reject/${requestId}`, {
        method: 'POST',
        headers: getAuthHeaders()
      });

      if (response.ok) {
        // Remove the request from both lists
        setReceivedRequests(prev => prev.filter(req => req._id !== requestId));
        setFilteredReceivedRequests(prev => prev.filter(req => req._id !== requestId));
        
        // Show success message
        showSuccessMessage('Follow request rejected');
      } else {
        const error = await response.json();
        alert(error.msg || 'Failed to reject request');
      }
    } catch (error) {
      console.error('Error rejecting request:', error);
      alert('Failed to reject request');
    } finally {
      setProcessingRequest(null);
    }
  };

  // Accept all requests
  const acceptAllRequests = async () => {
    if (filteredReceivedRequests.length === 0) return;

    const confirmAccept = window.confirm(`Accept all ${filteredReceivedRequests.length} follow requests?`);
    if (!confirmAccept) return;

    setProcessingRequest('all');
    
    try {
      // Process all requests concurrently
      const promises = filteredReceivedRequests.map(request => 
        fetch(`${API_BASE_URL}/follow/accept/${request._id}`, {
          method: 'POST',
          headers: getAuthHeaders()
        })
      );

      await Promise.all(promises);
      
      // Clear all requests
      setReceivedRequests([]);
      setFilteredReceivedRequests([]);
      
      showSuccessMessage('All follow requests accepted!');
    } catch (error) {
      console.error('Error accepting all requests:', error);
      alert('Failed to accept all requests');
    } finally {
      setProcessingRequest(null);
    }
  };

  // Show success message (you can replace this with a toast notification)
  const showSuccessMessage = (message) => {
    // Simple alert for now - you can integrate with a toast library
    alert(message);
  };

  // Navigate to user profile
  const goToProfile = (userId) => {
    window.location.href = `/profile/${userId}`;
  };

  // Format time ago
  const formatTimeAgo = (date) => {
    const now = new Date();
    const requestDate = new Date(date);
    const diffInMs = now - requestDate;
    const diffInMinutes = Math.floor(diffInMs / 60000);
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInDays < 7) return `${diffInDays}d ago`;
    return requestDate.toLocaleDateString();
  };

  // Render received requests
  const renderReceivedRequests = () => {
    if (loading) {
      return (
        <div className="space-y-4">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="bg-gray-900 p-4 rounded-xl animate-pulse">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gray-700 rounded-full"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-700 rounded w-32 mb-2"></div>
                  <div className="h-3 bg-gray-700 rounded w-24"></div>
                </div>
                <div className="flex space-x-2">
                  <div className="w-20 h-8 bg-gray-700 rounded"></div>
                  <div className="w-20 h-8 bg-gray-700 rounded"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (filteredReceivedRequests.length === 0) {
      return (
        <div className="text-center py-12">
          <div className="bg-gray-800 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
            {searchTerm ? <Search className="w-10 h-10 text-gray-400" /> : <UserPlus className="w-10 h-10 text-gray-400" />}
          </div>
          <h2 className="text-xl font-bold mb-2">
            {searchTerm ? 'No matching requests' : 'No follow requests'}
          </h2>
          <p className="text-gray-400">
            {searchTerm ? 'Try a different search term' : 'New follow requests will appear here'}
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {filteredReceivedRequests.map((request) => (
          <div key={request._id} className="bg-gray-900 p-4 rounded-xl hover:bg-gray-800 transition-colors">
            <div className="flex items-center space-x-3">
              {/* User Avatar and Info */}
              <button
                onClick={() => goToProfile(request.requester._id)}
                className="flex items-center space-x-3 flex-1"
              >
                <img
                  src={request.requester.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(request.requester.username)}&background=random&color=fff&size=200&bold=true`}
                  alt={request.requester.username}
                  className="w-12 h-12 rounded-full object-cover"
                  onError={(e) => {
                    e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(request.requester.username)}&background=random&color=fff&size=200&bold=true`;
                  }}
                />
                <div className="text-left">
                  <p className="font-bold text-white">{request.requester.username}</p>
                  <p className="text-gray-400 text-sm">wants to follow you</p>
                  <div className="flex items-center text-xs text-gray-500 mt-1">
                    <Clock className="w-3 h-3 mr-1" />
                    {formatTimeAgo(request.createdAt)}
                  </div>
                </div>
              </button>

              {/* Action Buttons */}
              <div className="flex space-x-2">
                <button
                  onClick={() => acceptRequest(request._id)}
                  disabled={processingRequest === request._id || processingRequest === 'all'}
                  className="bg-pink-600 hover:bg-pink-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-1 disabled:opacity-50"
                >
                  <UserCheck className="w-4 h-4" />
                  <span>Accept</span>
                </button>
                
                <button
                  onClick={() => rejectRequest(request._id)}
                  disabled={processingRequest === request._id || processingRequest === 'all'}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-1 disabled:opacity-50"
                >
                  <UserX className="w-4 h-4" />
                  <span>Reject</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="sticky top-0 bg-black/95 backdrop-blur-lg border-b border-gray-800 z-10">
        <div className="p-4">
          <div className="flex items-center mb-4">
            <button
              onClick={onBack}
              className="mr-3 p-2 hover:bg-gray-800 rounded-full transition-colors"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div className="flex items-center space-x-2">
              <UserPlus className="w-6 h-6" />
              <h1 className="text-xl font-bold">Follow Requests</h1>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex space-x-1 mb-4">
            <button
              onClick={() => setActiveTab('received')}
              className={`px-4 py-2 rounded-full font-semibold transition-colors flex items-center space-x-2 ${
                activeTab === 'received'
                  ? 'bg-white text-black'
                  : 'bg-gray-800 text-white hover:bg-gray-700'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Received ({receivedRequests.length})</span>
            </button>
            
            <button
              onClick={() => setActiveTab('sent')}
              className={`px-4 py-2 rounded-full font-semibold transition-colors flex items-center space-x-2 ${
                activeTab === 'sent'
                  ? 'bg-white text-black'
                  : 'bg-gray-800 text-white hover:bg-gray-700'
              }`}
            >
              <Send className="w-4 h-4" />
              <span>Sent</span>
            </button>
          </div>

          {/* Search and Actions for Received tab */}
          {activeTab === 'received' && (
            <div className="space-y-3">
              {/* Search bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search follow requests..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-gray-800/50 text-white pl-10 pr-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-white/20 focus:bg-gray-800"
                />
              </div>

              {/* Accept All button */}
              {filteredReceivedRequests.length > 0 && (
                <button
                  onClick={acceptAllRequests}
                  disabled={processingRequest === 'all'}
                  className="w-full bg-pink-600 hover:bg-pink-700 text-white py-3 rounded-xl font-bold transition-colors flex items-center justify-center space-x-2 disabled:opacity-50"
                >
                  <UserCheck className="w-5 h-5" />
                  <span>
                    {processingRequest === 'all' 
                      ? 'Accepting All...' 
                      : `Accept All (${filteredReceivedRequests.length})`
                    }
                  </span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="p-4">
        {activeTab === 'received' ? (
          renderReceivedRequests()
        ) : (
          // Sent requests tab (placeholder for now)
          <div className="text-center py-12">
            <div className="bg-gray-800 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Send className="w-10 h-10 text-gray-400" />
            </div>
            <h2 className="text-xl font-bold mb-2">Sent Requests</h2>
            <p className="text-gray-400 mb-4">Your pending follow requests will appear here</p>
            <p className="text-sm text-gray-500">Feature coming soon!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default FollowRequestsScreen;