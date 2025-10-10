import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Send, ArrowLeft, MoreVertical, Smile, Paperclip, Search, Trash2, Image, Play, X, Mic, Users, Plus, UserPlus, Settings, Crown, Shield, UserMinus, Check, Clock, Globe, Lock, Copy, LogOut } from 'lucide-react';
import io from 'socket.io-client';

// Group List Component
const GroupList = ({ groups, selectedGroup, onSelectGroup, onCreateGroup, onJoinGroup, searchQuery, setSearchQuery }) => {

  const filteredGroups = groups.filter(group =>
    group.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-gray-800">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold flex items-center">
            <Users className="w-5 h-5 mr-2" />
            Groups
          </h2>
          <div className="flex items-center space-x-2">
            <button
              onClick={onJoinGroup}
              className="p-2 bg-gray-700 hover:bg-gray-600 rounded-full transition-colors"
              title="Join Group"
            >
              <UserPlus className="w-5 h-5" />
            </button>
            <button
              onClick={onCreateGroup}
              className="p-2 bg-pink-600 hover:bg-pink-700 rounded-full transition-colors"
              title="Create Group"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search groups..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-900 border border-gray-700 rounded-full focus:outline-none focus:ring-2 focus:ring-pink-500 text-white placeholder-gray-400"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {filteredGroups.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            <Users className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg">No groups yet</p>
            <p className="text-sm">Create or join a group to get started!</p>
          </div>
        ) : (
          <div className="space-y-1">
            {filteredGroups.map((group) => (
              <button
                key={group._id}
                onClick={() => onSelectGroup(group)}
                className={`w-full p-4 text-left hover:bg-gray-900 transition-colors ${selectedGroup?._id === group._id ? 'bg-gray-800' : ''
                  }`}
              >
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <img
                      src={group.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(group.name)}&background=random&color=fff&size=200&bold=true`}
                      alt={group.name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                    {group.type === 'public' ? (
                      <Globe className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full p-0.5" />
                    ) : (
                      <Lock className="absolute -bottom-1 -right-1 w-4 h-4 bg-gray-600 rounded-full p-0.5" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold truncate">{group.name}</h3>
                      {group.conversation?.lastMessage && (
                        <span className="text-xs text-gray-400">
                          {new Date(group.conversation.lastMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-400 truncate">
                      {group.members.length} members
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Create Group Modal
const CreateGroupModal = ({ show, onClose, onCreateGroup }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('private');
  const [creating, setCreating] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    setCreating(true);
    await onCreateGroup({ name: name.trim(), description: description.trim(), type });
    setCreating(false);
    setName('');
    setDescription('');
    setType('private');
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Create New Group</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Group Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter group name"
              maxLength={100}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 text-white"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Description (Optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's this group about?"
              maxLength={500}
              rows={3}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 text-white resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Group Type</label>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setType('private')}
                className={`w-full p-3 text-left border rounded-lg transition-colors ${type === 'private' ? 'border-pink-500 bg-pink-900/20' : 'border-gray-700 hover:border-gray-600'
                  }`}
              >
                <div className="flex items-center">
                  <Lock className="w-5 h-5 mr-3" />
                  <div>
                    <div className="font-medium">Private</div>
                    <div className="text-sm text-gray-400">Only invited members can join</div>
                  </div>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setType('public')}
                className={`w-full p-3 text-left border rounded-lg transition-colors ${type === 'public' ? 'border-pink-500 bg-pink-900/20' : 'border-gray-700 hover:border-gray-600'
                  }`}
              >
                <div className="flex items-center">
                  <Globe className="w-5 h-5 mr-3" />
                  <div>
                    <div className="font-medium">Public</div>
                    <div className="text-sm text-gray-400">Anyone can join with invite code</div>
                  </div>
                </div>
              </button>
            </div>
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim() || creating}
              className="px-6 py-2 bg-pink-600 hover:bg-pink-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg transition-colors"
            >
              {creating ? 'Creating...' : 'Create Group'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Group Info Modal
const GroupInfoModal = ({ show, group, currentUserId, onClose, onUpdateGroup, onLeaveGroup, onDeleteGroup }) => {
  const [showSettings, setShowSettings] = useState(false);
  const [showMembers, setShowMembers] = useState(true);
  const [inviteCodeCopied, setInviteCodeCopied] = useState(false);
  const [showAddMembersModal, setShowAddMembersModal] = useState(false);


  if (!show || !group) return null;

  const isAdmin = group.admin._id === currentUserId;
  const isModerator = group.moderators?.some(m => m._id === currentUserId) || isAdmin;

  const copyInviteCode = () => {
    if (group.inviteCode) {
      navigator.clipboard.writeText(group.inviteCode);
      setInviteCodeCopied(true);
      setTimeout(() => setInviteCodeCopied(false), 2000);
    }
  };
  const handleAddMembers = async (memberIds) => {
    await onAddMembers(memberIds);
    setShowAddMembersModal(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-lg w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gray-900 p-6 border-b border-gray-800 z-10">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Group Info</h3>
            <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded-full">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="text-center">
            <img
              src={group.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(group.name)}&background=random&color=fff&size=200&bold=true`}
              alt={group.name}
              className="w-24 h-24 rounded-full mx-auto mb-4 object-cover"
            />
            <h2 className="text-2xl font-bold">{group.name}</h2>
            {group.description && (
              <p className="text-gray-400 mt-2">{group.description}</p>
            )}
            <div className="flex items-center justify-center space-x-4 mt-4 text-sm text-gray-400">
              <span className="flex items-center">
                {group.type === 'public' ? <Globe className="w-4 h-4 mr-1" /> : <Lock className="w-4 h-4 mr-1" />}
                {group.type === 'public' ? 'Public' : 'Private'}
              </span>
              <span>•</span>
              <span>{group.members.length} members</span>
            </div>
          </div>

          {group.type === 'public' && group.inviteCode && (
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium mb-1">Invite Code</p>
                  <p className="text-gray-400 text-sm font-mono">{group.inviteCode}</p>
                </div>
                <button
                  onClick={copyInviteCode}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors flex items-center space-x-2"
                >
                  {inviteCodeCopied ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          <div>
            <button
              onClick={() => setShowMembers(!showMembers)}
              className="flex items-center justify-between w-full mb-3"
            >
              <h4 className="font-semibold">Members ({group.members.length})</h4>
              <span className="text-gray-400">{showMembers ? '−' : '+'}</span>
            </button>
            {showMembers && (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {group.members.map((member) => (
                  <div key={member._id} className="flex items-center justify-between p-2 hover:bg-gray-800 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <img
                        src={member.user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.user.username)}&background=random&color=fff&size=200&bold=true`}
                        alt={member.user.username}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                      <div>
                        <p className="font-medium">{member.user.username}</p>
                        <div className="flex items-center space-x-2">
                          {member.role === 'admin' && (
                            <span className="text-xs bg-yellow-600 text-white px-2 py-0.5 rounded-full flex items-center">
                              <Crown className="w-3 h-3 mr-1" />
                              Admin
                            </span>
                          )}
                          {member.role === 'moderator' && (
                            <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full flex items-center">
                              <Shield className="w-3 h-3 mr-1" />
                              Moderator
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    {isModerator && member.user._id !== currentUserId && member.role !== 'admin' && (
                      <button
                        onClick={() => onUpdateGroup('remove-member', member.user._id)}
                        className="p-2 hover:bg-red-600 rounded-full transition-colors"
                      >
                        <UserMinus className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {group.pendingRequests?.length > 0 && isModerator && (
            <div>
              <h4 className="font-semibold mb-3">Pending Requests ({group.pendingRequests.length})</h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {group.pendingRequests.map((request) => (
                  <div key={request._id} className="flex items-center justify-between p-2 bg-gray-800 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <img
                        src={request.user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(request.user.username)}&background=random&color=fff&size=200&bold=true`}
                        alt={request.user.username}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                      <div>
                        <p className="font-medium">{request.user.username}</p>
                        <p className="text-xs text-gray-400">
                          {new Date(request.requestedAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => onUpdateGroup('approve-request', request.user._id)}
                        className="p-2 bg-green-600 hover:bg-green-700 rounded-full transition-colors"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onUpdateGroup('reject-request', request.user._id)}
                        className="p-2 bg-red-600 hover:bg-red-700 rounded-full transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="border-t border-gray-800 pt-4 space-y-2">
            {!isAdmin && (
              <button
                onClick={onLeaveGroup}
                className="w-full p-3 text-left text-red-400 hover:bg-red-900/20 rounded-lg transition-colors flex items-center"
              >
                <LogOut className="w-5 h-5 mr-3" />
                Leave Group
              </button>
            )}
            {isAdmin && (
              <button
                onClick={onDeleteGroup}
                className="w-full p-3 text-left text-red-400 hover:bg-red-900/20 rounded-lg transition-colors flex items-center"
              >
                <Trash2 className="w-5 h-5 mr-3" />
                Delete Group
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Add Members Modal
const AddMembersModal = ({ show, groupId, onClose, onAddMembers }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [searching, setSearching] = useState(false);
  const [adding, setAdding] = useState(false);

  const API_BASE_URL = 'https://theclipstream-backend.onrender.com/api';

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      ...(token && { 'Authorization': `Bearer ${token}` }),
      'Content-Type': 'application/json'
    };
  };

  const searchUsers = async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const response = await fetch(`${API_BASE_URL}/users/search?query=${encodeURIComponent(query)}`, {
        headers: getAuthHeaders()
      });
      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.users || []);
      }
    } catch (error) {
      console.error('Error searching users:', error);
    } finally {
      setSearching(false);
    }
  };

  const handleSearchChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    searchUsers(query);
  };

  const toggleUserSelection = (user) => {
    setSelectedUsers(prev => {
      const isSelected = prev.some(u => u._id === user._id);
      if (isSelected) {
        return prev.filter(u => u._id !== user._id);
      } else {
        return [...prev, user];
      }
    });
  };

  const handleAddMembers = async () => {
    if (selectedUsers.length === 0) return;

    setAdding(true);
    await onAddMembers(selectedUsers.map(u => u._id));
    setAdding(false);
    setSearchQuery('');
    setSearchResults([]);
    setSelectedUsers([]);
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Add Members</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Search users..."
              className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 text-white"
            />
          </div>

          {selectedUsers.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selectedUsers.map(user => (
                <div key={user._id} className="flex items-center space-x-2 bg-pink-600 px-3 py-1 rounded-full">
                  <span className="text-sm">{user.username}</span>
                  <button onClick={() => toggleUserSelection(user)} className="hover:bg-pink-700 rounded-full">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="max-h-64 overflow-y-auto space-y-2">
            {searching ? (
              <div className="text-center py-4 text-gray-400">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-pink-500 mx-auto"></div>
              </div>
            ) : searchResults.length === 0 && searchQuery ? (
              <div className="text-center py-4 text-gray-400">No users found</div>
            ) : (
              searchResults.map(user => (
                <button
                  key={user._id}
                  onClick={() => toggleUserSelection(user)}
                  className={`w-full p-3 text-left rounded-lg transition-colors ${selectedUsers.some(u => u._id === user._id)
                    ? 'bg-pink-900/20 border border-pink-500'
                    : 'hover:bg-gray-800 border border-transparent'
                    }`}
                >
                  <div className="flex items-center space-x-3">
                    <img
                      src={user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.username)}&background=random&color=fff&size=200&bold=true`}
                      alt={user.username}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                    <div>
                      <p className="font-medium">{user.username}</p>
                      {user.fullName && <p className="text-sm text-gray-400">{user.fullName}</p>}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>

          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleAddMembers}
              disabled={selectedUsers.length === 0 || adding}
              className="px-6 py-2 bg-pink-600 hover:bg-pink-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg transition-colors"
            >
              {adding ? 'Adding...' : `Add ${selectedUsers.length} Member${selectedUsers.length !== 1 ? 's' : ''}`}
            </button>
          </div>
        </div>

        <AddMembersModal
          show={showAddMembersModal}
          groupId={group._id}
          onClose={() => setShowAddMembersModal(false)}
          onAddMembers={handleAddMembers}
        />
      </div>
    </div>
  );
};



const JoinGroupModal = ({ show, onClose, onJoinGroup }) => {
  const [inviteCode, setInviteCode] = useState('');
  const [joining, setJoining] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!inviteCode.trim()) return;

    setJoining(true);
    await onJoinGroup(inviteCode.trim());
    setJoining(false);
    setInviteCode('');
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Join Group</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Invite Code</label>
            <input
              type="text"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              placeholder="Enter invite code"
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 text-white font-mono"
              required
            />
            <p className="text-xs text-gray-400 mt-2">
              Ask the group admin for the invite code
            </p>
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!inviteCode.trim() || joining}
              className="px-6 py-2 bg-pink-600 hover:bg-pink-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg transition-colors"
            >
              {joining ? 'Joining...' : 'Join Group'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};



// Main Messaging Screen Component
const MessagingScreen = ({ conversationId: propConversationId }) => {
  const [activeTab, setActiveTab] = useState('dm'); // 'dm' or 'groups'
  const [conversations, setConversations] = useState([]);
  const [groups, setGroups] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [groupSearchQuery, setGroupSearchQuery] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [typingUsers, setTypingUsers] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [signedUrls, setSignedUrls] = useState({});

  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [showGroupInfoModal, setShowGroupInfoModal] = useState(false);
  const [showJoinGroupModal, setShowJoinGroupModal] = useState(false);

  const messagesEndRef = useRef(null);
  const socketRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const API_BASE_URL = 'https://theclipstream-backend.onrender.com/api';
  const joinGroup = async (inviteCode) => {
    try {
      const response = await fetch(`${API_BASE_URL}/groups/join`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ inviteCode })
      });

      if (response.ok) {
        const joinedGroup = await response.json();
        setGroups(prev => [joinedGroup, ...prev]);
        setShowJoinGroupModal(false);
        selectGroup(joinedGroup);
      } else {
        const error = await response.json();
        alert(error.msg || 'Failed to join group');
      }
    } catch (error) {
      console.error('Error joining group:', error);
      alert('Error joining group');
    }
  };


  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      ...(token && { 'Authorization': `Bearer ${token}` }),
      'Content-Type': 'application/json'
    };
  };

  const fetchSignedUrl = useCallback(async (messageId, key) => {
    try {
      const response = await fetch(`${API_BASE_URL}/messages/file/${encodeURIComponent(key)}`, {
        headers: getAuthHeaders(),
      });
      if (response.ok) {
        const data = await response.json();
        setSignedUrls(prev => ({ ...prev, [messageId]: data.url }));
      }
    } catch (error) {
      console.error('Error fetching signed URL:', error);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    socketRef.current = io('https://theclipstream-backend.onrender.com', {
      withCredentials: true,
      auth: { token }
    });

    socketRef.current.on('connect', () => {
      console.log('Connected to messaging server');
    });

    socketRef.current.on('new-message', (data) => {
      const { message } = data;
      if (selectedConversation && message.conversation === selectedConversation._id) {
        setMessages(prev => [...prev, message]);
        if (message.key) fetchSignedUrl(message._id, message.key);
      }
    });

    socketRef.current.on('new-group-message', (data) => {
      const { message, groupId } = data;
      if (selectedGroup && selectedGroup._id === groupId) {
        setMessages(prev => [...prev, message]);
        if (message.key) fetchSignedUrl(message._id, message.key);
      }
    });

    socketRef.current.on('user-typing', (data) => {
      const { userId, username, conversationId } = data;
      if (selectedConversation && conversationId === selectedConversation._id) {
        setTypingUsers(prev => [...prev.filter(u => u.userId !== userId), { userId, username }]);
      }
    });

    socketRef.current.on('user-stopped-typing', (data) => {
      const { userId } = data;
      setTypingUsers(prev => prev.filter(u => u.userId !== userId));
    });

    socketRef.current.on('group-user-typing', (data) => {
      const { userId, username, groupId } = data;
      if (selectedGroup && groupId === selectedGroup._id) {
        setTypingUsers(prev => [...prev.filter(u => u.userId !== userId), { userId, username }]);
      }
    });

    socketRef.current.on('group-user-stopped-typing', (data) => {
      const { userId } = data;
      setTypingUsers(prev => prev.filter(u => u.userId !== userId));
    });

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, [selectedConversation, selectedGroup, fetchSignedUrl]);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) setCurrentUser(JSON.parse(storedUser));
  }, []);

  useEffect(() => {
    fetchConversations();
    fetchGroups();
  }, []);

  useEffect(() => {
    messages.forEach((message) => {
      if (message.key && !signedUrls[message._id]) {
        fetchSignedUrl(message._id, message.key);
      }
    });
  }, [messages, signedUrls, fetchSignedUrl]);

  const fetchConversations = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/messages/conversations`, {
        headers: getAuthHeaders()
      });
      if (response.ok) {
        const data = await response.json();
        setConversations(data);
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchGroups = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/groups/my-groups`, {
        headers: getAuthHeaders()
      });
      if (response.ok) {
        const data = await response.json();
        setGroups(data);
      }
    } catch (error) {
      console.error('Error fetching groups:', error);
    }
  };

  const selectConversation = async (conversation) => {
    setSelectedConversation(conversation);
    setSelectedGroup(null);
    setMessages([]);

    if (socketRef.current) {
      socketRef.current.emit('join-conversation', { conversationId: conversation._id });
    }

    try {
      const response = await fetch(`${API_BASE_URL}/messages/conversations/${conversation._id}/messages`, {
        headers: getAuthHeaders()
      });
      if (response.ok) {
        const msgs = await response.json();
        setMessages(msgs);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const selectGroup = async (group) => {
    setSelectedGroup(group);
    setSelectedConversation(null);
    setMessages([]);

    if (socketRef.current) {
      socketRef.current.emit('join-group', { groupId: group._id });
    }

    try {
      const response = await fetch(`${API_BASE_URL}/messages/conversations/${group.conversation._id}/messages`, {
        headers: getAuthHeaders()
      });
      if (response.ok) {
        const msgs = await response.json();
        setMessages(msgs);
      }
    } catch (error) {
      console.error('Error fetching group messages:', error);
    }
  };

  const createGroup = async (groupData) => {
    try {
      const response = await fetch(`${API_BASE_URL}/groups/create`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(groupData)
      });

      if (response.ok) {
        const newGroup = await response.json();
        setGroups(prev => [newGroup, ...prev]);
        setShowCreateGroupModal(false);
        selectGroup(newGroup);
      } else {
        const error = await response.json();
        alert(error.msg || 'Failed to create group');
      }
    } catch (error) {
      console.error('Error creating group:', error);
      alert('Failed to create group');
    }
  };

  const sendMessage = async (e) => {
    e?.preventDefault();
    const content = newMessage.trim();
    if (!content || sending) return;

    setSending(true);
    setNewMessage('');

    try {
      if (selectedGroup) {
        if (socketRef.current) {
          socketRef.current.emit('send-group-message', {
            groupId: selectedGroup._id,
            content,
            type: 'text'
          });
        }
      } else if (selectedConversation) {
        const response = await fetch(`${API_BASE_URL}/messages/conversations/${selectedConversation._id}/messages`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({ content, type: 'text' })
        });

        if (response.ok) {
          const message = await response.json();
          setMessages(prev => [...prev, message]);
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setNewMessage(content);
    } finally {
      setSending(false);
    }
  };

  const handleTyping = (e) => {
    setNewMessage(e.target.value);

    if (socketRef.current) {
      if (!isTyping) {
        setIsTyping(true);
        if (selectedGroup) {
          socketRef.current.emit('group-typing-start', { groupId: selectedGroup._id });
        } else if (selectedConversation) {
          socketRef.current.emit('typing-start', { conversationId: selectedConversation._id });
        }
      }

      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false);
        if (selectedGroup) {
          socketRef.current.emit('group-typing-stop', { groupId: selectedGroup._id });
        } else if (selectedConversation) {
          socketRef.current.emit('typing-stop', { conversationId: selectedConversation._id });
        }
      }, 1000);
    }
  };

  const handleGroupAction = async (action, userId) => {
    if (!selectedGroup) return;

    try {
      let endpoint = '';
      let method = 'POST';

      switch (action) {
        case 'remove-member':
          endpoint = `${API_BASE_URL}/groups/${selectedGroup._id}/members/${userId}`;
          method = 'DELETE';
          break;
        case 'approve-request':
          endpoint = `${API_BASE_URL}/groups/${selectedGroup._id}/requests/${userId}/approve`;
          break;
        case 'reject-request':
          endpoint = `${API_BASE_URL}/groups/${selectedGroup._id}/requests/${userId}/reject`;
          break;
      }

      const response = await fetch(endpoint, {
        method,
        headers: getAuthHeaders()
      });

      if (response.ok) {
        fetchGroups();
        const updatedGroup = await fetch(`${API_BASE_URL}/groups/${selectedGroup._id}`, {
          headers: getAuthHeaders()
        });
        if (updatedGroup.ok) {
          const data = await updatedGroup.json();
          setSelectedGroup(data);
        }
      }
    } catch (error) {
      console.error('Error performing group action:', error);
    }
  };

  const leaveGroup = async () => {
    if (!selectedGroup || !currentUser) return;

    try {
      const response = await fetch(`${API_BASE_URL}/groups/${selectedGroup._id}/members/${currentUser.id || currentUser._id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });

      if (response.ok) {
        setGroups(prev => prev.filter(g => g._id !== selectedGroup._id));
        setSelectedGroup(null);
        setShowGroupInfoModal(false);
      }
    } catch (error) {
      console.error('Error leaving group:', error);
    }
  };

  const deleteGroup = async () => {
    if (!selectedGroup) return;

    if (!confirm('Are you sure you want to delete this group? This cannot be undone.')) return;

    try {
      const response = await fetch(`${API_BASE_URL}/groups/${selectedGroup._id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });

      if (response.ok) {
        setGroups(prev => prev.filter(g => g._id !== selectedGroup._id));
        setSelectedGroup(null);
        setShowGroupInfoModal(false);
      }
    } catch (error) {
      console.error('Error deleting group:', error);
    }
  };

  const formatMessageTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;

    if (diff < 24 * 60 * 60 * 1000) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diff < 7 * 24 * 60 * 60 * 1000) {
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const getOtherParticipant = (conversation) => {
    if (!conversation.participants || !currentUser) return null;
    return conversation.participants.find(p => p._id !== (currentUser.id || currentUser._id));
  };

  const filteredConversations = conversations.filter(conv => {
    if (!searchQuery.trim()) return true;
    const otherParticipant = getOtherParticipant(conv);
    return otherParticipant?.username?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading messages...</p>
        </div>
      </div>
    );
  }

  const MessageComponent = ({ message, isOwn, showAvatar }) => (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} ${showAvatar ? 'mt-4' : 'mt-1'}`}>
      {!isOwn && showAvatar && (
        <img
          src={message.sender.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(message.sender.username)}&background=random&color=fff&size=200&bold=true`}
          alt={message.sender.username}
          className="w-6 h-6 rounded-full object-cover mr-2 mt-auto"
        />
      )}
      {!isOwn && !showAvatar && <div className="w-8" />}

      <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${isOwn ? 'bg-pink-600 text-white' : 'bg-gray-800 text-white'
        }`}>
        {!isOwn && selectedGroup && showAvatar && (
          <p className="text-xs text-pink-300 font-semibold mb-1">{message.sender.username}</p>
        )}
        {message.type === 'text' && <p className="text-sm">{message.content}</p>}
        {message.type === 'image' && signedUrls[message._id] && (
          <img src={signedUrls[message._id]} alt="" className="max-w-full h-auto rounded-lg" />
        )}
        {message.type === 'video' && signedUrls[message._id] && (
          <video controls className="max-w-full h-auto rounded-lg">
            <source src={signedUrls[message._id]} type={message.fileType || 'video/mp4'} />
          </video>
        )}
        {message.type === 'audio' && signedUrls[message._id] && (
          <audio controls className="w-full">
            <source src={signedUrls[message._id]} type={message.fileType || 'audio/webm'} />
          </audio>
        )}
        <p className={`text-xs mt-1 ${isOwn ? 'text-pink-200' : 'text-gray-400'}`}>
          {formatMessageTime(message.createdAt)}
        </p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-black text-white flex">
      {/* Sidebar */}
      <div className={`w-full md:w-1/3 border-r border-gray-800 flex flex-col ${selectedConversation || selectedGroup ? 'hidden md:flex' : 'flex'
        }`}>
        {/* Tabs */}
        <div className="p-4 border-b border-gray-800">
          <div className="flex space-x-2 mb-4">
            <button
              onClick={() => setActiveTab('dm')}
              className={`flex-1 py-2 px-4 rounded-lg transition-colors ${activeTab === 'dm' ? 'bg-pink-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
            >
              Direct Messages
            </button>
            <button
              onClick={() => setActiveTab('groups')}
              className={`flex-1 py-2 px-4 rounded-lg transition-colors ${activeTab === 'groups' ? 'bg-pink-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
            >
              Groups
            </button>
          </div>
        </div>

        {/* Content based on active tab */}
        {activeTab === 'dm' ? (
          <>
            <div className="p-4 border-b border-gray-800">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search conversations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-900 border border-gray-700 rounded-full focus:outline-none focus:ring-2 focus:ring-pink-500 text-white placeholder-gray-400"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {filteredConversations.length === 0 ? (
                <div className="p-8 text-center text-gray-400">
                  <div className="mb-4">
                    <svg className="w-16 h-16 mx-auto opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <p className="text-lg">No conversations</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredConversations.map((conversation) => {
                    const otherParticipant = getOtherParticipant(conversation);
                    if (!otherParticipant) return null;

                    return (
                      <button
                        key={conversation._id}
                        onClick={() => selectConversation(conversation)}
                        className={`w-full p-4 text-left hover:bg-gray-900 transition-colors ${selectedConversation?._id === conversation._id ? 'bg-gray-800' : ''
                          }`}
                      >
                        <div className="flex items-center space-x-3">
                          <img
                            src={otherParticipant.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(otherParticipant.username)}&background=random&color=fff&size=200&bold=true`}
                            alt={otherParticipant.username}
                            className="w-12 h-12 rounded-full object-cover"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <h3 className="font-semibold truncate">{otherParticipant.username}</h3>
                              {conversation.lastMessage && (
                                <span className="text-xs text-gray-400">
                                  {formatMessageTime(conversation.lastMessage.createdAt)}
                                </span>
                              )}
                            </div>
                            {conversation.lastMessage && (
                              <p className="text-sm text-gray-400 truncate">
                                {conversation.lastMessage.content || 'Media'}
                              </p>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        ) : (
          <GroupList
            groups={groups}
            selectedGroup={selectedGroup}
            onSelectGroup={selectGroup}
            onCreateGroup={() => setShowCreateGroupModal(true)}
            onJoinGroup={() => setShowJoinGroupModal(true)}
            searchQuery={groupSearchQuery}
            setSearchQuery={setGroupSearchQuery}
          />

        )}
      </div>

      {/* Chat Area */}
      <div className={`flex-1 flex flex-col ${selectedConversation || selectedGroup ? 'flex' : 'hidden md:flex'}`}>
        {selectedConversation || selectedGroup ? (
          <>
            {/* Header */}
            <div className="p-4 border-b border-gray-800 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => {
                    setSelectedConversation(null);
                    setSelectedGroup(null);
                  }}
                  className="md:hidden p-2 hover:bg-gray-800 rounded-full transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                {selectedGroup ? (
                  <>
                    <img
                      src={selectedGroup.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedGroup.name)}&background=random&color=fff&size=200&bold=true`}
                      alt={selectedGroup.name}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                    <div>
                      <h2 className="font-semibold">{selectedGroup.name}</h2>
                      <p className="text-xs text-gray-400">{selectedGroup.members.length} members</p>
                    </div>
                  </>
                ) : (
                  (() => {
                    const otherParticipant = getOtherParticipant(selectedConversation);
                    return otherParticipant ? (
                      <>
                        <img
                          src={otherParticipant.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(otherParticipant.username)}&background=random&color=fff&size=200&bold=true`}
                          alt={otherParticipant.username}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                        <div>
                          <h2 className="font-semibold">{otherParticipant.username}</h2>
                          <p className="text-xs text-gray-400">Active now</p>
                        </div>
                      </>
                    ) : null;
                  })()
                )}
              </div>
              <div className="flex items-center space-x-2">
                {selectedGroup && (
                  <button
                    onClick={() => setShowGroupInfoModal(true)}
                    className="p-2 hover:bg-gray-800 rounded-full transition-colors"
                  >
                    <Settings className="w-5 h-5" />
                  </button>
                )}
                <button className="p-2 hover:bg-gray-800 rounded-full transition-colors">
                  <MoreVertical className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <p>Start your conversation!</p>
                </div>
              ) : (
                messages.map((message, index) => {
                  const isOwn = message.sender._id === (currentUser?.id || currentUser?._id);
                  const showAvatar = !isOwn && (index === 0 || messages[index - 1]?.sender._id !== message.sender._id);

                  return (
                    <MessageComponent
                      key={message._id}
                      message={message}
                      isOwn={isOwn}
                      showAvatar={showAvatar}
                    />
                  );
                })
              )}

              {typingUsers.length > 0 && (
                <div className="flex items-center space-x-2 text-gray-400 text-sm">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                  <span>{typingUsers[0].username} is typing...</span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-gray-800">
              <form onSubmit={sendMessage} className="flex items-center space-x-3">
                <button type="button" className="p-2 hover:bg-gray-800 rounded-full transition-colors">
                  <Paperclip className="w-5 h-5 text-gray-400" />
                </button>
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={handleTyping}
                    placeholder="Type a message..."
                    disabled={sending}
                    className="w-full px-4 py-2 pr-12 bg-gray-900 border border-gray-700 rounded-full focus:outline-none focus:ring-2 focus:ring-pink-500 text-white placeholder-gray-400"
                  />
                  <button type="button" className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 hover:bg-gray-700 rounded-full transition-colors">
                    <Smile className="w-4 h-4 text-gray-400" />
                  </button>
                </div>
                <button
                  type="submit"
                  disabled={!newMessage.trim() || sending}
                  className="p-2 bg-pink-600 hover:bg-pink-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-full transition-colors"
                >
                  {sending ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <Send className="w-5 h-5 text-white" />
                  )}
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <div className="mb-4">
                <svg className="w-20 h-20 mx-auto opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <p className="text-xl font-semibold mb-2">Select a conversation</p>
              <p className="text-sm">Choose from your conversations or groups</p>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <CreateGroupModal
        show={showCreateGroupModal}
        onClose={() => setShowCreateGroupModal(false)}
        onCreateGroup={createGroup}
      />

      <GroupInfoModal
        show={showGroupInfoModal}
        group={selectedGroup}
        currentUserId={currentUser?.id || currentUser?._id}
        onClose={() => setShowGroupInfoModal(false)}
        onUpdateGroup={handleGroupAction}
        onLeaveGroup={leaveGroup}
        onDeleteGroup={deleteGroup}
      />
      <JoinGroupModal
        show={showJoinGroupModal}
        onClose={() => setShowJoinGroupModal(false)}
        onJoinGroup={joinGroup}
      />

    </div>
  );
};

export default MessagingScreen;