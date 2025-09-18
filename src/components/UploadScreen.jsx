import React, { useState, useRef } from 'react';
import { Video, Upload, X, Play, Pause, Hash, AtSign, Users, Lock, Globe } from 'lucide-react';
import axios from 'axios';

const UploadScreen = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [videoPreview, setVideoPreview] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [description, setDescription] = useState('');
  const [hashtags, setHashtags] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [privacy, setPrivacy] = useState('public');
  const [allowComments, setAllowComments] = useState(true);
  const [allowDuet, setAllowDuet] = useState(true);

  const videoRef = useRef(null);
  const fileInputRef = useRef(null);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('video/')) {
      setSelectedFile(file);
      setVideoPreview(URL.createObjectURL(file));
    }
  };

  const togglePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      } else {
        videoRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  const removeVideo = () => {
    setSelectedFile(null);
    setVideoPreview(null);
    setIsPlaying(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // 🔥 Reel upload to backend
const handleUpload = async () => {
  if (!selectedFile || !description.trim()) {
    alert("Please select a video and add a description");
    return;
  }

  setIsUploading(true);
  setUploadProgress(0);

  try {
    const token = localStorage.getItem("token");

    // 1. Ask backend for signed upload URL
    const { data } = await axios.post(
      "http://localhost:5000/api/videos/signed-url",
      {
        fileName: selectedFile.name,
        fileType: selectedFile.type,
      },
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );

    const { uploadUrl, key } = data; // ✅ no more fileUrl

    // 2. Upload file directly to Wasabi using PUT
    await axios.put(uploadUrl, selectedFile, {
      headers: { "Content-Type": selectedFile.type },
      onUploadProgress: (progressEvent) => {
        const percent = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total
        );
        setUploadProgress(percent);
      },
    });

    // 3. Save metadata to backend + MongoDB
    await axios.post(
      "http://localhost:5000/api/videos/save",
      {
        description,
        hashtags,
        privacy,
        allowComments,
        allowDuet,
        key, // ✅ only send key
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    alert("✅ Video uploaded successfully!");
    removeVideo();
    setDescription("");
    setHashtags("");
    setPrivacy("public");
    setAllowComments(true);
    setAllowDuet(true);
  } catch (err) {
    console.error(err);
    alert(err.response?.data?.msg || "❌ Upload failed");
  } finally {
    setIsUploading(false);
  }
};


  const suggestedHashtags = ['#fyp', '#trending', '#viral', '#dance', '#comedy', '#food', '#pets', '#music'];

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="sticky top-0 bg-black/90 backdrop-blur-sm z-10 pt-12 pb-4">
        <div className="flex items-center justify-between px-4">
          <h1 className="text-xl font-bold">Upload Video</h1>
          {selectedFile && (
            <button
              onClick={handleUpload}
              disabled={isUploading || !description.trim()}
              className="bg-pink-500 text-white px-6 py-2 rounded-full font-bold disabled:bg-gray-600 disabled:cursor-not-allowed hover:bg-pink-600 transition-colors"
            >
              {isUploading ? `${uploadProgress}%` : 'Post'}
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 pb-20">
        {!selectedFile ? (
          /* Upload Area */
          <label className="block">
            <div className="border-2 border-dashed border-gray-600 rounded-xl p-8 text-center cursor-pointer hover:border-pink-500 hover:bg-pink-500/5 transition-all duration-300">
              <Upload className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <h2 className="text-xl font-bold mb-2">Select video to upload</h2>
              <p className="text-gray-400 mb-4">Or drag and drop a file</p>
              <div className="bg-pink-500 text-white px-6 py-3 rounded-lg inline-block font-bold hover:bg-pink-600 transition-colors">
                Select File
              </div>
              <div className="mt-4 text-sm text-gray-500">
                <p>MP4, MOV, AVI up to 100MB</p>
                <p>Vertical videos (9:16) work best</p>
              </div>
            </div>
            <input ref={fileInputRef} type="file" accept="video/*" onChange={handleFileSelect} className="hidden" />
          </label>
        ) : (
          /* Video Preview and form (same as your current, unchanged except button calls handleUpload) */
          <div className="space-y-6">
            {/* Video Preview */}
            <div className="bg-gray-900 rounded-xl p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-lg">Preview</h3>
                <button onClick={removeVideo} className="p-2 bg-red-500 rounded-full hover:bg-red-600 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="relative max-w-xs mx-auto">
                <video
                  ref={videoRef}
                  src={videoPreview}
                  className="w-full aspect-[9/16] bg-black rounded-lg object-cover"
                  onClick={togglePlayPause}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <button
                    onClick={togglePlayPause}
                    className="bg-black/50 rounded-full p-4 hover:bg-black/70 transition-colors"
                  >
                    {isPlaying ? <Pause className="w-8 h-8 text-white" /> : <Play className="w-8 h-8 text-white ml-1" />}
                  </button>
                </div>
                <div className="absolute bottom-4 left-4 bg-black/70 text-white text-xs px-2 py-1 rounded">
                  {(selectedFile.size / (1024 * 1024)).toFixed(1)} MB
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="bg-gray-900 rounded-xl p-4">
              <h3 className="font-bold text-lg mb-3">Description</h3>
              <textarea
                placeholder="Describe your video..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-gray-800 text-white p-4 rounded-lg h-24 resize-none focus:outline-none focus:ring-2 focus:ring-pink-500 border border-gray-700"
                maxLength={300}
              />
              <div className="flex justify-between items-center mt-2">
                <p className="text-xs text-gray-400">{description.length}/300</p>
                <div className="flex items-center space-x-2 text-gray-400">
                  <AtSign className="w-4 h-4" />
                  <Hash className="w-4 h-4" />
                </div>
              </div>
            </div>

            {/* Hashtags */}
            <div className="bg-gray-900 rounded-xl p-4">
              <h3 className="font-bold text-lg mb-3">Hashtags</h3>
              <input
                type="text"
                placeholder="Add hashtags... #trending #viral"
                value={hashtags}
                onChange={(e) => setHashtags(e.target.value)}
                className="w-full bg-gray-800 text-white p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 border border-gray-700"
              />
              <div className="mt-3 flex flex-wrap gap-2">
                {suggestedHashtags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => !hashtags.includes(tag) && setHashtags(hashtags ? `${hashtags} ${tag}` : tag)}
                    className="bg-gray-800 text-gray-300 px-3 py-1 rounded-full text-sm hover:bg-pink-500 hover:text-white transition-colors"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Privacy + toggles (same as before) */}
            <div className="bg-gray-900 rounded-xl p-4">
              <h3 className="font-bold text-lg mb-3">Privacy & Settings</h3>
              {/* Privacy radios */}
              {['public', 'friends', 'private'].map((value) => (
                <label key={value} className="flex items-center space-x-3 cursor-pointer mb-2">
                  <input
                    type="radio"
                    name="privacy"
                    value={value}
                    checked={privacy === value}
                    onChange={(e) => setPrivacy(e.target.value)}
                    className="w-4 h-4 text-pink-500"
                  />
                  <span className="capitalize">{value}</span>
                </label>
              ))}
              {/* Toggles */}
              <label className="flex items-center justify-between cursor-pointer mt-2">
                <span>Allow comments</span>
                <input type="checkbox" checked={allowComments} onChange={(e) => setAllowComments(e.target.checked)} />
              </label>
              <label className="flex items-center justify-between cursor-pointer mt-2">
                <span>Allow duet & stitch</span>
                <input type="checkbox" checked={allowDuet} onChange={(e) => setAllowDuet(e.target.checked)} />
              </label>
            </div>

            {/* Progress bar */}
            {isUploading && (
              <div className="bg-gray-900 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">Uploading...</span>
                  <span className="text-pink-500 font-bold">{uploadProgress}%</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div className="bg-pink-500 h-2 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default UploadScreen;
