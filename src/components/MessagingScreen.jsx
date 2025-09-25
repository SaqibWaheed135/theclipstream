import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Send, ArrowLeft, Phone, Video, MoreVertical, Smile, Paperclip, Search, Trash2, Image, Play, X, Mic } from 'lucide-react';
import io from 'socket.io-client';

const MessagingScreen = ({ conversationId: propConversationId }) => {
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [typingUsers, setTypingUsers] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [signedUrls, setSignedUrls] = useState({});
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [recordingDuration, setRecordingDuration] = useState(0);

  const [deleteModal, setDeleteModal] = useState({
    show: false,
    message: null,
    canDeleteForEveryone: false
  });

  const [mediaModal, setMediaModal] = useState({ show: false, files: [] });
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);

  const messagesEndRef = useRef(null);
  const socketRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const messageInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordingIntervalRef = useRef(null);

  const API_BASE_URL = 'https://api.theclipstream.com/api';

  const API_CONFIG = useMemo(() => ({
    baseUrl: API_BASE_URL,
    getHeaders: () => {
      const token = localStorage.getItem('token');
      return {
        ...(token && { 'Authorization': `Bearer ${token}` }),
        'Content-Type': 'application/json'
      };
    }
  }), []);

  const getAuthHeaders = () => {
    return API_CONFIG.getHeaders();
  };

  const fetchSignedUrl = useCallback(async (messageId, key) => {
    try {
      const response = await fetch(`${API_CONFIG.baseUrl}/messages/file/${encodeURIComponent(key)}`, {
        headers: getAuthHeaders(),
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      setSignedUrls(prev => ({ ...prev, [messageId]: data.url }));
    } catch (error) {
      console.error('Error fetching signed URL:', { messageId, key, error: error.message });
    }
  }, [API_CONFIG]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      console.error('No auth token found');
      return;
    }

    socketRef.current = io('https://api.theclipstream.com', {
      withCredentials: true,
      auth: { token }
    });

    socketRef.current.on('connect', () => {
      console.log('Connected to messaging server');
    });

    socketRef.current.on('new-message', (data) => {
      const { message, conversation } = data;
      console.log('New message received:', data);

      if (selectedConversation && message.conversation === selectedConversation._id) {
        setMessages(prev => [...prev, message]);
        if (message.key && ['image', 'video', 'audio'].includes(message.type)) {
          fetchSignedUrl(message._id, message.key);
        }
        scrollToBottom();
      }

      setConversations(prev => prev.map(conv =>
        conv._id === conversation._id
          ? { ...conv, lastMessage: message, updatedAt: new Date() }
          : conv
      ));
    });

    socketRef.current.on('user-typing', (data) => {
      const { userId, username, conversationId } = data;
      if (selectedConversation && conversationId === selectedConversation._id) {
        setTypingUsers(prev => [...prev.filter(u => u.userId !== userId), { userId, username }]);
      }
    });

    socketRef.current.on('user-stopped-typing', (data) => {
      const { userId, conversationId } = data;
      if (selectedConversation && conversationId === selectedConversation._id) {
        setTypingUsers(prev => prev.filter(u => u.userId !== userId));
      }
    });

    socketRef.current.on('message-deleted-everyone', (data) => {
      const { messageId } = data;
      setMessages(prev => prev.map(msg =>
        msg._id === messageId
          ? { ...msg, isDeleted: true, content: 'This message was deleted', key: null, fileType: null, fileName: null }
          : msg
      ));
    });

    socketRef.current.on('messages-read', (data) => {
      console.log('Messages marked as read:', data);
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [selectedConversation, fetchSignedUrl]);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      setCurrentUser(JSON.parse(storedUser));
    }
  }, []);

  useEffect(() => {
    fetchConversations();
  }, []);

  useEffect(() => {
    if (propConversationId && conversations.length > 0) {
      const conversation = conversations.find(conv => conv._id === propConversationId);
      if (conversation) {
        selectConversation(conversation);
      }
    }
  }, [propConversationId, conversations]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    messages.forEach((message) => {
      if (message.key && !signedUrls[message._id] && ['image', 'video', 'audio'].includes(message.type)) {
        fetchSignedUrl(message._id, message.key);
      }
    });
  }, [messages, signedUrls, fetchSignedUrl]);

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const fetchConversations = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_CONFIG.baseUrl}/messages/conversations`, {
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

  const selectConversation = async (conversation) => {
    setSelectedConversation(conversation);
    setMessages([]);

    if (socketRef.current) {
      socketRef.current.emit('join-conversation', { conversationId: conversation._id });
    }

    try {
      const response = await fetch(`${API_CONFIG.baseUrl}/messages/conversations/${conversation._id}/messages`, {
        headers: getAuthHeaders()
      });

      if (response.ok) {
        const messages = await response.json();
        setMessages(messages);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const sendMessage = async (e, messageData = null) => {
    e?.preventDefault();

    const content = messageData?.content || newMessage.trim();
    const type = messageData?.type || 'text';
    const key = messageData?.key;
    const fileType = messageData?.fileType;
    const fileName = messageData?.fileName;

    if ((type === 'text' && !content) || !selectedConversation || sending) return;

    setSending(true);
    if (!messageData) setNewMessage('');

    try {
      const response = await fetch(`${API_CONFIG.baseUrl}/messages/conversations/${selectedConversation._id}/messages`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          content,
          type,
          key,
          fileType,
          fileName
        })
      });

      if (response.ok) {
        const message = await response.json();
        setMessages(prev => [...prev, message]);
        if (message.key && ['image', 'video', 'audio'].includes(message.type)) {
          fetchSignedUrl(message._id, message.key);
        }
      } else {
        if (!messageData) setNewMessage(content);
        const error = await response.json();
        alert(error.msg || 'Failed to send message');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      if (!messageData) setNewMessage(content);
      alert('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleTyping = (e) => {
    setNewMessage(e.target.value);

    if (socketRef.current && selectedConversation) {
      if (!isTyping) {
        setIsTyping(true);
        socketRef.current.emit('typing-start', { conversationId: selectedConversation._id });
      }

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false);
        socketRef.current.emit('typing-stop', { conversationId: selectedConversation._id });
      }, 1000);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      const chunks = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      setRecording(true);
      setRecordingDuration(0);

      recordingIntervalRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('Error starting recording:', error);
      alert('Failed to access microphone. Please ensure permission is granted.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
      clearInterval(recordingIntervalRef.current);
    }
  };

  const cancelRecording = () => {
    setAudioBlob(null);
    setAudioUrl(null);
    setRecordingDuration(0);
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
      clearInterval(recordingIntervalRef.current);
    }
  };

  const sendAudioMessage = async () => {
    if (!audioBlob || !selectedConversation) return;

    setUploading(true);
    setUploadProgress(0);

    try {
      const token = localStorage.getItem('token');
      const fileName = `voice_message_${Date.now()}.webm`;
      const fileType = 'audio/webm';

      const signedUrlResponse = await fetch(`${API_CONFIG.baseUrl}/messages/media/signed-url`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ fileName, fileType })
      });

      if (!signedUrlResponse.ok) {
        throw new Error('Failed to get signed URL');
      }

      const { uploadUrl, key } = await signedUrlResponse.json();

      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': fileType },
        body: audioBlob
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload audio');
      }

      await sendMessage(null, {
        type: 'audio',
        key,
        fileType,
        fileName
      });

      setUploadProgress(100);
      alert('✅ Voice message sent!');
    } catch (error) {
      console.error('Error sending audio message:', error);
      alert('❌ Failed to send voice message');
    } finally {
      setUploading(false);
      setUploadProgress(0);
      setAudioBlob(null);
      setAudioUrl(null);
      setRecordingDuration(0);
    }
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files).filter(file => 
      file.type.startsWith('image/') || file.type.startsWith('video/')
    );
    if (files.length > 0) {
      setMediaModal({ show: true, files });
    } else {
      alert('Only images and videos are allowed');
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    const files = Array.from(e.dataTransfer.files).filter(file => 
      file.type.startsWith('image/') || file.type.startsWith('video/')
    );
    if (files.length > 0) {
      setMediaModal({ show: true, files });
    } else {
      alert('Only images and videos are allowed');
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragActive(false);
  };

  const uploadFiles = async () => {
    if (!mediaModal.files.length) return;

    setUploading(true);
    setUploadProgress(0);

    try {
      const token = localStorage.getItem('token');
      const totalFiles = mediaModal.files.length;

      for (let i = 0; i < totalFiles; i++) {
        const file = mediaModal.files[i];

        setUploadProgress(Math.round((i / totalFiles) * 100));

        const signedUrlResponse = await fetch(`${API_CONFIG.baseUrl}/messages/media/signed-url`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            fileName: file.name,
            fileType: file.type,
          })
        });

        if (!signedUrlResponse.ok) {
          const errorText = await signedUrlResponse.text();
          throw new Error(`Failed to get signed URL: ${errorText}`);
        }

        const { uploadUrl, key } = await signedUrlResponse.json();
        console.log('Uploading file:', { uploadUrl, key, fileName: file.name, fileType: file.type });

        const uploadResponse = await fetch(uploadUrl, {
          method: 'PUT',
          headers: { 'Content-Type': file.type },
          body: file,
        });

        if (!uploadResponse.ok) {
          const errorText = await uploadResponse.text();
          throw new Error(`Failed to upload ${file.name}: ${errorText}`);
        }

        const messageType = file.type.startsWith('image/') ? 'image' : 'video';

        await sendMessage(null, {
          type: messageType,
          key,
          fileType: file.type,
          fileName: file.name
        });

        setUploadProgress(Math.round(((i + 1) / totalFiles) * 100));
      }

      alert('✅ Files uploaded successfully!');
    } catch (error) {
      console.error('Upload error:', error);
      alert('❌ Failed to upload files: ' + error.message);
    } finally {
      setUploading(false);
      setUploadProgress(0);
      setMediaModal({ show: false, files: [] });
    }
  };

  const showDeleteModal = (message) => {
    const canDeleteForEveryone = message.sender._id === (currentUser?.id || currentUser?._id);
    setDeleteModal({
      show: true,
      message,
      canDeleteForEveryone
    });
  };

  const deleteMessage = async (type) => {
    if (!deleteModal.message) return;

    try {
      const endpoint = type === 'everyone'
        ? `${API_CONFIG.baseUrl}/messages/${deleteModal.message._id}/everyone`
        : `${API_CONFIG.baseUrl}/messages/${deleteModal.message._id}/me`;

      const response = await fetch(endpoint, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });

      if (response.ok) {
        if (type === 'everyone') {
          setMessages(prev => prev.map(msg =>
            msg._id === deleteModal.message._id
              ? { ...msg, isDeleted: true, content: 'This message was deleted', key: null, fileType: null, fileName: null }
              : msg
          ));
        } else {
          setMessages(prev => prev.filter(msg => msg._id !== deleteModal.message._id));
        }
      } else {
        const error = await response.json();
        alert(error.msg || 'Failed to delete message');
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert('Failed to delete message');
    } finally {
      setDeleteModal({ show: false, message: null, canDeleteForEveryone: false });
    }
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getFileIcon = (type) => {
    if (type === 'image') return <Image className="w-4 h-4" />;
    if (type === 'video') return <Play className="w-4 h-4" />;
    if (type === 'audio') return <Mic className="w-4 h-4" />;
    return <Image className="w-4 h-4" />;
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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

  const Message = React.memo(({ message, index, isOwn, showAvatar }) => {
    return (
      <div
        key={message._id}
        className={`flex ${isOwn ? 'justify-end' : 'justify-start'} ${showAvatar ? 'mt-4' : 'mt-1'} group`}
      >
        {!isOwn && showAvatar && (
          <img
            src={message.sender.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(message.sender.username)}&background=random&color=fff&size=200&bold=true`}
            alt={message.sender.username}
            className="w-6 h-6 rounded-full object-cover mr-2 mt-auto"
            loading="lazy"
          />
        )}
        {!isOwn && !showAvatar && <div className="w-8" />}

        <div className="relative">
          <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${isOwn
            ? 'bg-pink-600 text-white'
            : 'bg-gray-800 text-white'
            }`}>
            {message.isDeleted ? (
              <p className="text-sm italic text-gray-400">{message.content}</p>
            ) : (
              <>
                {message.type === 'text' && (
                  <p className="text-sm">{message.content}</p>
                )}

                {message.type === 'image' && signedUrls[message._id] && (
                  <div>
                    <img
                      src={signedUrls[message._id]}
                      alt={message.fileName}
                      className="max-w-full h-auto rounded-lg mb-2"
                      loading="lazy"
                      onError={(e) => {
                        console.error('Image load error:', {
                          src: e.target.src,
                          error: e.target.error,
                          message,
                        });
                      }}
                    />
                    {message.fileName && (
                      <p className="text-xs text-gray-400">{message.fileName}</p>
                    )}
                  </div>
                )}

                {message.type === 'video' && signedUrls[message._id] && (
                  <div>
                    <video
                      controls
                      muted={true}
                      playsInline
                      className="max-w-full h-auto rounded-lg mb-2"
                      preload="auto"
                      onError={(e) => {
                        console.error('Video load error:', {
                          src: e.target.currentSrc,
                          error: e.target.error,
                          message,
                        });
                      }}
                    >
                      <source src={signedUrls[message._id]} type={message.fileType || 'video/mp4'} />
                    </video>
                    {message.fileName && (
                      <p className="text-xs text-gray-400">{message.fileName}</p>
                    )}
                  </div>
                )}

                {message.type === 'audio' && signedUrls[message._id] && (
                  <div>
                    <audio
                      controls
                      className="w-full mb-2"
                      preload="auto"
                      onError={(e) => {
                        console.error('Audio load error:', {
                          src: e.target.currentSrc,
                          error: e.target.error,
                          message,
                        });
                      }}
                    >
                      <source src={signedUrls[message._id]} type={message.fileType || 'audio/webm'} />
                    </audio>
                    {message.fileName && (
                      <p className="text-xs text-gray-400">{message.fileName}</p>
                    )}
                  </div>
                )}
                
                <p className={`text-xs mt-1 ${isOwn ? 'text-pink-200' : 'text-gray-400'}`}>
                  {formatMessageTime(message.createdAt)}
                </p>
              </>
            )}
          </div>

          {!message.isDeleted && (
            <button
              onClick={() => showDeleteModal(message)}
              className="absolute -top-2 -right-2 p-1 bg-red-600 hover:bg-red-700 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
    );
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

  return (
    <div className="min-h-screen bg-black text-white flex relative">
      {dragActive && (
        <div className="absolute inset-0 bg-pink-600 bg-opacity-20 z-50 flex items-center justify-center">
          <div className="text-center">
            <Paperclip className="w-12 h-12 mx-auto mb-4 text-pink-400" />
            <p className="text-xl font-semibold">Drop images or videos to send</p>
          </div>
        </div>
      )}

      <div className={`w-full md:w-1/3 border-r border-gray-800 flex flex-col ${selectedConversation ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 border-b border-gray-800">
          <h1 className="text-xl font-bold mb-4">Messages</h1>
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
              <p className="text-sm">Start following people to send messages!</p>
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
                    className={`w-full p-4 text-left hover:bg-gray-900 transition-colors ${selectedConversation?._id === conversation._id ? 'bg-gray-800' : ''}`}
                  >
                    <div className="flex items-center space-x-3">
                      <img
                        src={otherParticipant.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(otherParticipant.username)}&background=random&color=fff&size=200&bold=true`}
                        alt={otherParticipant.username}
                        className="w-12 h-12 rounded-full object-cover"
                        loading="lazy"
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
                            {conversation.lastMessage.sender === (currentUser?.id || currentUser?._id)
                              ? 'You: ' : ''
                            }
                            {conversation.lastMessage.type !== 'text' ? (
                              <span className="flex items-center">
                                {getFileIcon(conversation.lastMessage.type)}
                                <span className="ml-1">{conversation.lastMessage.fileName || conversation.lastMessage.type}</span>
                              </span>
                            ) : (
                              conversation.lastMessage.content
                            )}
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
      </div>

      <div
        className={`flex-1 flex flex-col ${selectedConversation ? 'flex' : 'hidden md:flex'}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        {selectedConversation ? (
          <>
            <div className="p-4 border-b border-gray-800 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setSelectedConversation(null)}
                  className="md:hidden p-2 hover:bg-gray-800 rounded-full transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                {(() => {
                  const otherParticipant = getOtherParticipant(selectedConversation);
                  return otherParticipant ? (
                    <>
                      <img
                        src={otherParticipant.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(otherParticipant.username)}&background=random&color=fff&size=200&bold=true`}
                        alt={otherParticipant.username}
                        className="w-10 h-10 rounded-full object-cover"
                        loading="lazy"
                      />
                      <div>
                        <h2 className="font-semibold">{otherParticipant.username}</h2>
                        <p className="text-xs text-gray-400">Active now</p>
                      </div>
                    </>
                  ) : null;
                })()}
              </div>
              <div className="flex items-center space-x-2">
                <button className="p-2 hover:bg-gray-800 rounded-full transition-colors">
                  <Phone className="w-5 h-5" />
                </button>
                <button className="p-2 hover:bg-gray-800 rounded-full transition-colors">
                  <Video className="w-5 h-5" />
                </button>
                <button className="p-2 hover:bg-gray-800 rounded-full transition-colors">
                  <MoreVertical className="w-5 h-5" />
                </button>
              </div>
            </div>

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
                    <Message
                      key={message._id}
                      message={message}
                      index={index}
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

            <div className="p-4 border-t border-gray-800">
              <div className="flex items-center space-x-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*,video/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 hover:bg-gray-800 rounded-full transition-colors"
                >
                  <Paperclip className="w-5 h-5 text-gray-400" />
                </button>
                <div className="flex-1 relative">
                  <input
                    ref={messageInputRef}
                    type="text"
                    value={newMessage}
                    onChange={handleTyping}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        sendMessage(e);
                      }
                    }}
                    placeholder="Type a message..."
                    disabled={sending || recording}
                    className="w-full px-4 py-2 pr-12 bg-gray-900 border border-gray-700 rounded-full focus:outline-none focus:ring-2 focus:ring-pink-500 text-white placeholder-gray-400"
                  />
                  <button className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 hover:bg-gray-700 rounded-full transition-colors">
                    <Smile className="w-4 h-4 text-gray-400" />
                  </button>
                </div>
                {recording ? (
                  <button
                    onClick={stopRecording}
                    className="p-2 bg-red-600 hover:bg-red-700 rounded-full transition-colors"
                  >
                    <Mic className="w-5 h-5 text-white" />
                  </button>
                ) : (
                  <button
                    onClick={startRecording}
                    disabled={sending || newMessage.trim()}
                    className="p-2 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-full transition-colors"
                  >
                    <Mic className="w-5 h-5 text-white" />
                  </button>
                )}
                <button
                  onClick={sendMessage}
                  disabled={!newMessage.trim() || sending || recording}
                  className="p-2 bg-pink-600 hover:bg-pink-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-full transition-colors"
                >
                  {sending ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <Send className="w-5 h-5 text-white" />
                  )}
                </button>
              </div>
              {recording && (
                <div className="mt-2 text-center text-sm text-gray-400">
                  Recording... {formatDuration(recordingDuration)}
                </div>
              )}
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
              <p className="text-sm">Choose from your existing conversations or start a new one</p>
            </div>
          </div>
        )}
      </div>

      {deleteModal.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">Delete Message</h3>
            <p className="text-gray-400 mb-6">
              Choose how you'd like to delete this message:
            </p>

            <div className="space-y-3">
              <button
                onClick={() => deleteMessage('me')}
                className="w-full p-3 text-left hover:bg-gray-800 rounded-lg transition-colors"
              >
                <div className="font-medium">Delete for me</div>
                <div className="text-sm text-gray-400">
                  This message will only be deleted from your view
                </div>
              </button>

              {deleteModal.canDeleteForEveryone && (
                <button
                  onClick={() => deleteMessage('everyone')}
                  className="w-full p-3 text-left hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <div className="font-medium">Delete for everyone</div>
                  <div className="text-sm text-gray-400">
                    This message will be deleted for all participants
                  </div>
                </button>
              )}
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setDeleteModal({ show: false, message: null, canDeleteForEveryone: false })}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {mediaModal.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Send Media</h3>
              <button
                onClick={() => setMediaModal({ show: false, files: [] })}
                className="p-2 hover:bg-gray-800 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 mb-6">
              {mediaModal.files.map((file, index) => (
                <div key={index} className="flex items-center space-x-3 p-3 bg-gray-800 rounded-lg">
                  <div className="flex-shrink-0">
                    {file.type.startsWith('image/') ? (
                      <div className="w-12 h-12 bg-gray-700 rounded-lg overflow-hidden">
                        <img
                          src={URL.createObjectURL(file)}
                          alt={file.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-12 h-12 bg-gray-700 rounded-lg flex items-center justify-center">
                        <Play className="w-6 h-6 text-pink-400" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{file.name}</p>
                    <p className="text-sm text-gray-400">{formatFileSize(file.size)}</p>
                  </div>

                  <button
                    onClick={() => {
                      const newFiles = mediaModal.files.filter((_, i) => i !== index);
                      setMediaModal({ ...mediaModal, files: newFiles });
                    }}
                    className="p-2 hover:bg-gray-700 rounded-full transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setMediaModal({ show: false, files: [] })}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={uploadFiles}
                disabled={uploading || mediaModal.files.length === 0}
                className="px-6 py-2 bg-pink-600 hover:bg-pink-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center space-x-2"
              >
                {uploading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Uploading... {uploadProgress}%</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Send {mediaModal.files.length} file{mediaModal.files.length !== 1 ? 's' : ''}</span>
                  </>
                )}
              </button>
            </div>

            {uploading && (
              <div className="mt-4">
                <div className="bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-pink-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
                <p className="text-sm text-gray-400 mt-2 text-center">
                  Uploading files... {uploadProgress}%
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {audioUrl && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Voice Message</h3>
              <button
                onClick={cancelRecording}
                className="p-2 hover:bg-gray-800 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-6">
              <audio controls className="w-full">
                <source src={audioUrl} type="audio/webm" />
              </audio>
              <p className="text-sm text-gray-400 mt-2">Duration: {formatDuration(recordingDuration)}</p>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={cancelRecording}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={sendAudioMessage}
                disabled={uploading}
                className="px-6 py-2 bg-pink-600 hover:bg-pink-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center space-x-2"
              >
                {uploading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Uploading... {uploadProgress}%</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Send Voice Message</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MessagingScreen;