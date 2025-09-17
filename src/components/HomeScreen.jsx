import React, { useState, useEffect } from "react";
import { Heart, MessageCircle, Share, Bookmark, Send, X } from "lucide-react";

const HomeScreen = () => {
  const [currentVideo, setCurrentVideo] = useState(0);
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [activeVideoId, setActiveVideoId] = useState(null);
  const [comments, setComments] = useState({});
  const [newComment, setNewComment] = useState("");
  const [commentLoading, setCommentLoading] = useState(false);

  // ✅ Fetch videos from backend (with signed S3 GET URLs)
  useEffect(() => {
    const fetchVideos = async () => {
      try {
        const res = await fetch("http://localhost:5000/api/videos", {
          credentials: "include",
        });

        if (!res.ok) {
          throw new Error(`Failed to fetch: ${res.status}`);
        }

        const data = await res.json();
        setVideos(data);
      } catch (err) {
        console.error("Error fetching videos:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchVideos();
  }, []);

  // Fetch comments for a specific video
  const fetchComments = async (videoId) => {
    if (comments[videoId]) return; // Already fetched

    try {
      const token = localStorage.getItem('token');
      const headers = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(`http://localhost:5000/api/videos/${videoId}/comments`, {
        credentials: "include",
        headers,
      });
      
      if (res.ok) {
        const data = await res.json();
        setComments(prev => ({
          ...prev,
          [videoId]: data
        }));
      }
    } catch (err) {
      console.error("Error fetching comments:", err);
    }
  };

  // Handle like functionality
  const handleLike = async (videoId) => {
    try {
      // Get token from localStorage or wherever you store it
      const token = localStorage.getItem('token'); // or however you store your JWT
      
      console.log('Token being sent:', token); // Debug log
      
      const res = await fetch(`http://localhost:5000/api/videos/${videoId}/like`, {
        method: "POST",
        credentials: "include",
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` // Add authorization header
        },
      });

      console.log('Response status:', res.status); // Debug log
      
      if (res.ok) {
        const data = await res.json();
        setVideos(prev => prev.map(video => 
          video._id === videoId 
            ? { ...video, likes: data.likes, isLiked: data.isLiked }
            : video
        ));
      } else {
        const errorData = await res.json();
        console.error('Like error:', errorData);
      }
    } catch (err) {
      console.error("Error liking video:", err);
    }
  };

  // Handle save functionality
  const handleSave = async (videoId) => {
    try {
      const token = localStorage.getItem('token');
      
      const res = await fetch(`http://localhost:5000/api/videos/${videoId}/save`, {
        method: "POST",
        credentials: "include",
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
      });

      if (res.ok) {
        const data = await res.json();
        setVideos(prev => prev.map(video => 
          video._id === videoId 
            ? { ...video, isSaved: data.isSaved }
            : video
        ));
      }
    } catch (err) {
      console.error("Error saving video:", err);
    }
  };

  // Handle share functionality
  const handleShare = async (video) => {
    const shareData = {
      title: video.title || 'Check out this video!',
      text: video.description || 'Amazing video content!',
      url: `${window.location.origin}/video/${video._id}`
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        // Fallback: copy to clipboard
        await navigator.clipboard.writeText(shareData.url);
        alert('Video link copied to clipboard!');
      }
    } catch (err) {
      console.error('Error sharing:', err);
      // Fallback: copy to clipboard
      try {
        await navigator.clipboard.writeText(shareData.url);
        alert('Video link copied to clipboard!');
      } catch (clipboardErr) {
        console.error('Clipboard error:', clipboardErr);
      }
    }
  };

  // Handle comment submission
  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || !activeVideoId || commentLoading) return;

    setCommentLoading(true);
    try {
      const token = localStorage.getItem('token');
      
      const res = await fetch(`http://localhost:5000/api/videos/${activeVideoId}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        credentials: "include",
        body: JSON.stringify({ text: newComment.trim() }),
      });

      if (res.ok) {
        const data = await res.json();
        setComments(prev => ({
          ...prev,
          [activeVideoId]: [data, ...(prev[activeVideoId] || [])]
        }));
        setNewComment("");
        
        // Update comment count in videos
        setVideos(prev => prev.map(video => 
          video._id === activeVideoId 
            ? { ...video, commentsCount: (video.commentsCount || 0) + 1 }
            : video
        ));
      } else {
        const errorData = await res.json();
        console.error('Comment error:', errorData);
      }
    } catch (err) {
      console.error("Error posting comment:", err);
    } finally {
      setCommentLoading(false);
    }
  };

  // Open comment modal
  const openCommentModal = (videoId) => {
    setActiveVideoId(videoId);
    setShowCommentModal(true);
    fetchComments(videoId);
  };

  // Close comment modal
  const closeCommentModal = () => {
    setShowCommentModal(false);
    setActiveVideoId(null);
    setNewComment("");
  };

  const VideoPlayer = ({ video, isActive }) => {
    const [isFollowing, setIsFollowing] = useState(false);
    
    const isLiked = video.isLiked || false;
    const isSaved = video.isSaved || false;
    const likesCount = Array.isArray(video.likes) ? video.likes.length : (video.likes || 0);
    const commentsCount = video.commentsCount || 0;

    return (
      <div className="relative h-screen w-full bg-black overflow-hidden snap-start snap-always">
        <video
          className="absolute inset-0 w-full h-full object-cover"
          src={video?.url}
          autoPlay={isActive}
          muted
          loop
          playsInline
          preload="metadata"
        />

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

        {/* Right Side Actions */}
        <div className="absolute right-3 bottom-24 flex flex-col items-center space-y-6 z-10">
          {/* Profile Avatar */}
          <div className="relative">
            <img
              src={video?.user?.avatar || "https://i.pravatar.cc/150?u=default"}
              alt={video?.user?.username || "user"}
              className="w-12 h-12 rounded-full border-2 border-white object-cover"
            />
            <button
              onClick={() => setIsFollowing(!isFollowing)}
              className={`absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-6 h-6 rounded-full border-2 border-white flex items-center justify-center text-xs font-bold ${
                isFollowing ? "bg-gray-600" : "bg-red-500"
              }`}
            >
              {isFollowing ? "✓" : "+"}
            </button>
          </div>

          {/* Like Button */}
          <div className="flex flex-col items-center">
            <button
              onClick={() => handleLike(video._id)}
              className="p-3 rounded-full bg-black/20 backdrop-blur-sm hover:bg-black/40 transition-all duration-200 active:scale-95"
            >
              <Heart
                className={`w-7 h-7 transition-colors ${
                  isLiked ? "text-red-500 fill-red-500" : "text-white"
                }`}
              />
            </button>
            <span className="text-white text-xs mt-1 font-semibold">
              {likesCount.toLocaleString()}
            </span>
          </div>

          {/* Comment Button */}
          <div className="flex flex-col items-center">
            <button
              onClick={() => openCommentModal(video._id)}
              className="p-3 rounded-full bg-black/20 backdrop-blur-sm hover:bg-black/40 transition-all duration-200 active:scale-95"
            >
              <MessageCircle className="w-7 h-7 text-white" />
            </button>
            <span className="text-white text-xs mt-1 font-semibold">
              {commentsCount.toLocaleString()}
            </span>
          </div>

          {/* Share Button */}
          <div className="flex flex-col items-center">
            <button
              onClick={() => handleShare(video)}
              className="p-3 rounded-full bg-black/20 backdrop-blur-sm hover:bg-black/40 transition-all duration-200 active:scale-95"
            >
              <Share className="w-7 h-7 text-white" />
            </button>
            <span className="text-white text-xs mt-1 font-semibold">
              Share
            </span>
          </div>

          {/* Save Button */}
          <div className="flex flex-col items-center">
            <button
              onClick={() => handleSave(video._id)}
              className="p-3 rounded-full bg-black/20 backdrop-blur-sm hover:bg-black/40 transition-all duration-200 active:scale-95"
            >
              <Bookmark
                className={`w-7 h-7 transition-colors ${
                  isSaved ? "text-yellow-400 fill-yellow-400" : "text-white"
                }`}
              />
            </button>
            <span className="text-white text-xs mt-1 font-semibold">
              {isSaved ? "Saved" : "Save"}
            </span>
          </div>
        </div>

        {/* Bottom Content */}
        <div className="absolute bottom-4 left-4 right-20 text-white z-10">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <span className="font-bold text-lg">
                @{video?.user?.username || "unknown"}
              </span>
              <span className="text-sm opacity-80">•</span>
              <span className="text-sm opacity-80">2h ago</span>
            </div>
            <p className="text-sm leading-tight pr-4">
              {video?.description || ""}
            </p>
            {video?.hashtags && video.hashtags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {video.hashtags.map((tag, index) => (
                  <span key={index} className="text-xs text-blue-300 font-medium">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Comment Modal Component
  const CommentModal = () => {
    const activeVideo = videos.find(v => v._id === activeVideoId);
    const videoComments = comments[activeVideoId] || [];

    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
        <div className="bg-white w-full h-2/3 rounded-t-3xl flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <h3 className="text-lg font-semibold text-gray-800">
              {videoComments.length} Comments
            </h3>
            <button
              onClick={closeCommentModal}
              className="p-2 rounded-full hover:bg-gray-100"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          {/* Comments List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {videoComments.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <MessageCircle className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>No comments yet</p>
                <p className="text-sm">Be the first to comment!</p>
              </div>
            ) : (
              videoComments.map((comment, index) => (
                <div key={comment._id || index} className="flex space-x-3">
                  <img
                    src={comment.user?.avatar || "https://i.pravatar.cc/150?u=comment"}
                    alt={comment.user?.username || "user"}
                    className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                  />
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold text-sm text-gray-800">
                        {comment.user?.username || "Anonymous"}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(comment.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 mt-1">
                      {comment.text}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Comment Input */}
          <div className="p-4 border-t bg-gray-50">
            <div className="flex items-center space-x-3">
              <img
                src="https://i.pravatar.cc/150?u=current-user"
                alt="You"
                className="w-8 h-8 rounded-full object-cover flex-shrink-0"
              />
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleCommentSubmit(e);
                    }
                  }}
                  placeholder="Add a comment..."
                  className="w-full px-4 py-2 pr-12 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={commentLoading}
                />
                <button
                  onClick={handleCommentSubmit}
                  disabled={!newComment.trim() || commentLoading}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1.5 rounded-full bg-blue-500 text-white disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-blue-600 transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-black text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Loading videos...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="h-screen overflow-y-auto snap-y snap-mandatory scrollbar-hide">
        {videos.map((video, index) => (
          <VideoPlayer
            key={video._id}
            video={video}
            isActive={index === currentVideo}
          />
        ))}
      </div>

      {/* Comment Modal */}
      {showCommentModal && <CommentModal />}
    </>
  );
};

export default HomeScreen;