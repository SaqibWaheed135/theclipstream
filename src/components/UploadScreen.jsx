import React, { useState, useRef, useEffect } from 'react';
import { Video, Upload, X, Play, Pause, Hash, AtSign, Users, Lock, Globe, Camera, Image, RotateCcw, Square, Circle } from 'lucide-react';

const UploadScreen = () => {
  const [currentView, setCurrentView] = useState('camera'); // 'camera', 'preview', 'details'
  const [selectedFile, setSelectedFile] = useState(null);
  const [videoPreview, setVideoPreview] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [description, setDescription] = useState('');
  const [hashtags, setHashtags] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [privacy, setPrivacy] = useState('public');
  const [allowComments, setAllowComments] = useState(true);
  const [allowDuet, setAllowDuet] = useState(true);
  const [stream, setStream] = useState(null);
  const [facingMode, setFacingMode] = useState('user'); // 'user' for front, 'environment' for back

  const videoRef = useRef(null);
  const previewVideoRef = useRef(null);
  const fileInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);

  useEffect(() => {
    if (currentView === 'camera') {
      startCamera();
    }
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [currentView, facingMode]);

  useEffect(() => {
    let interval;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } else {
      setRecordingTime(0);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  const startCamera = async () => {
    try {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: facingMode,
          width: { ideal: 1080 },
          height: { ideal: 1920 }
        },
        audio: true
      });
      
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error('Error accessing camera:', err);
      alert('Could not access camera. Please check permissions.');
    }
  };

  const startRecording = () => {
    if (!stream) return;
    
    recordedChunksRef.current = [];
    mediaRecorderRef.current = new MediaRecorder(stream, {
      mimeType: 'video/webm;codecs=vp9'
    });
    
    mediaRecorderRef.current.ondataavailable = (event) => {
      if (event.data.size > 0) {
        recordedChunksRef.current.push(event.data);
      }
    };
    
    mediaRecorderRef.current.onstop = () => {
      const blob = new Blob(recordedChunksRef.current, {
        type: 'video/webm'
      });
      const file = new File([blob], `recording-${Date.now()}.webm`, {
        type: 'video/webm'
      });
      handleFileSelect({ target: { files: [file] } });
    };
    
    mediaRecorderRef.current.start();
    setIsRecording(true);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setRecordingTime(0);
    }
  };

  const switchCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('video/')) {
      setSelectedFile(file);
      setVideoPreview(URL.createObjectURL(file));
      setCurrentView('preview');
      
      // Stop camera stream
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        setStream(null);
      }
    }
  };

  const togglePlayPause = () => {
    if (previewVideoRef.current) {
      if (isPlaying) {
        previewVideoRef.current.pause();
        setIsPlaying(false);
      } else {
        previewVideoRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  const goToDetails = () => {
    setCurrentView('details');
  };

  const goBack = () => {
    if (currentView === 'details') {
      setCurrentView('preview');
    } else if (currentView === 'preview') {
      setSelectedFile(null);
      setVideoPreview(null);
      setIsPlaying(false);
      setCurrentView('camera');
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !description.trim()) {
      alert("Please add a description");
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const token = localStorage.getItem("token");

      if (!token) {
        throw new Error("No authentication token found");
      }

      // Step 1: Get signed URL
      const signedUrlResponse = await fetch("https://theclipstream-backend.onrender.com/api/videos/signed-url", {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          fileName: selectedFile.name,
          fileType: selectedFile.type,
        })
      });

      if (!signedUrlResponse.ok) {
        const errorText = await signedUrlResponse.text();
        console.error('Signed URL API error:', errorText);
        throw new Error(`Failed to get upload URL: ${signedUrlResponse.status}`);
      }

      const signedUrlData = await signedUrlResponse.json();
      console.log('Signed URL response:', signedUrlData);

      if (!signedUrlData.uploadUrl || !signedUrlData.key) {
        console.error('Invalid response structure:', signedUrlData);
        throw new Error("Invalid response from server - missing uploadUrl or key");
      }

      const { uploadUrl, key } = signedUrlData;
      setUploadProgress(25);

      // Step 2: Upload to Wasabi
      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        body: selectedFile,
        headers: { 
          "Content-Type": selectedFile.type 
        }
      });

      if (!uploadResponse.ok) {
        console.error('Wasabi upload error:', uploadResponse.status, uploadResponse.statusText);
        throw new Error(`Upload to storage failed: ${uploadResponse.status}`);
      }

      setUploadProgress(75);

      // Step 3: Save metadata
      const saveResponse = await fetch("https://theclipstream-backend.onrender.com/api/videos/save", {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          description,
          hashtags,
          privacy,
          allowComments,
          allowDuet,
          key,
        })
      });

      if (!saveResponse.ok) {
        const errorData = await saveResponse.json();
        console.error('Save metadata error:', errorData);
        throw new Error(errorData.msg || `Failed to save video metadata: ${saveResponse.status}`);
      }

      setUploadProgress(100);
      alert("✅ Video uploaded successfully!");
      
      // Reset everything
      setSelectedFile(null);
      setVideoPreview(null);
      setDescription("");
      setHashtags("");
      setPrivacy("public");
      setAllowComments(true);
      setAllowDuet(true);
      setCurrentView('camera');
      
    } catch (err) {
      console.error('Upload error:', err);
      alert(`❌ Upload failed: ${err.message}`);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const suggestedHashtags = ['#fyp', '#trending', '#viral', '#dance', '#comedy', '#food', '#pets', '#music'];

  // Camera View
  if (currentView === 'camera') {
    return (
      <div className="min-h-screen bg-black text-white relative overflow-hidden">
        {/* Camera Stream */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="absolute inset-0 w-full h-full object-cover"
        />
        
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 z-20 pt-12 pb-4">
          <div className="flex items-center justify-between px-4">
            <button 
              onClick={() => window.history.back()}
              className="p-2"
            >
              <X className="w-6 h-6" />
            </button>
            <h1 className="text-lg font-semibold">Create</h1>
            <button onClick={switchCamera} className="p-2">
              <RotateCcw className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Recording Timer */}
        {isRecording && (
          <div className="absolute top-20 left-1/2 transform -translate-x-1/2 z-20">
            <div className="bg-red-500 text-white px-4 py-2 rounded-full font-mono">
              <Circle className="w-3 h-3 inline-block mr-2 fill-current" />
              {formatTime(recordingTime)}
            </div>
          </div>
        )}

        {/* Bottom Controls */}
        <div className="absolute bottom-0 left-0 right-0 z-20 pb-8">
          <div className="flex items-center justify-center space-x-8 px-8">
            {/* Upload from Gallery */}
            <label className="cursor-pointer">
              <div className="w-12 h-12 bg-gray-800/70 rounded-full flex items-center justify-center">
                <Image className="w-6 h-6" />
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                onChange={handleFileSelect}
                className="hidden"
              />
            </label>

            {/* Record Button */}
            <button
              onMouseDown={startRecording}
              onMouseUp={stopRecording}
              onTouchStart={startRecording}
              onTouchEnd={stopRecording}
              className={`w-20 h-20 rounded-full border-4 border-white flex items-center justify-center transition-all ${
                isRecording ? 'bg-red-500 scale-110' : 'bg-transparent hover:scale-105'
              }`}
            >
              <div className={`w-12 h-12 rounded-full transition-all ${
                isRecording ? 'bg-white' : 'bg-red-500'
              }`} />
            </button>

            {/* Camera Switch */}
            <div className="w-12 h-12" />
          </div>
          
          <div className="text-center mt-4">
            <p className="text-sm text-gray-300">Tap and hold to record</p>
          </div>
        </div>
      </div>
    );
  }

  // Preview View
  if (currentView === 'preview') {
    return (
      <div className="min-h-screen bg-black text-white">
        {/* Header */}
        <div className="sticky top-0 bg-black/90 backdrop-blur-sm z-10 pt-12 pb-4">
          <div className="flex items-center justify-between px-4">
            <button onClick={goBack}>
              <X className="w-6 h-6" />
            </button>
            <h1 className="text-lg font-semibold">Preview</h1>
            <button
              onClick={goToDetails}
              className="bg-pink-500 text-white px-4 py-2 rounded-full font-semibold hover:bg-pink-600 transition-colors"
            >
              Next
            </button>
          </div>
        </div>

        {/* Video Preview */}
        <div className="flex items-center justify-center min-h-[calc(100vh-120px)]">
          <div className="relative max-w-sm mx-auto">
            <video
              ref={previewVideoRef}
              src={videoPreview}
              className="w-full aspect-[9/16] bg-black rounded-lg object-cover"
              onClick={togglePlayPause}
              loop
            />
            <div className="absolute inset-0 flex items-center justify-center">
              {!isPlaying && (
                <button
                  onClick={togglePlayPause}
                  className="bg-black/50 rounded-full p-4 hover:bg-black/70 transition-colors"
                >
                  <Play className="w-8 h-8 text-white ml-1" />
                </button>
              )}
            </div>
            <div className="absolute bottom-4 left-4 bg-black/70 text-white text-xs px-2 py-1 rounded">
              {(selectedFile.size / (1024 * 1024)).toFixed(1)} MB
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Details View
  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="sticky top-0 bg-black/90 backdrop-blur-sm z-10 pt-12 pb-4">
        <div className="flex items-center justify-between px-4">
          <button onClick={goBack}>
            <X className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-semibold">Post</h1>
          <button
            onClick={handleUpload}
            disabled={isUploading || !description.trim()}
            className="bg-pink-500 text-white px-6 py-2 rounded-full font-semibold disabled:bg-gray-600 disabled:cursor-not-allowed hover:bg-pink-600 transition-colors"
          >
            {isUploading ? `${uploadProgress}%` : 'Post'}
          </button>
        </div>
      </div>

      <div className="p-4 pb-20 space-y-6">
        {/* Video Thumbnail and Description */}
        <div className="flex space-x-4">
          <div className="flex-shrink-0">
            <video
              src={videoPreview}
              className="w-20 h-28 bg-gray-800 rounded-lg object-cover"
              muted
            />
          </div>
          <div className="flex-1">
            <textarea
              placeholder="Describe your video..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-transparent text-white placeholder-gray-400 resize-none focus:outline-none text-base"
              rows={4}
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
        </div>

        {/* Hashtags */}
        <div>
          <input
            type="text"
            placeholder="Add hashtags"
            value={hashtags}
            onChange={(e) => setHashtags(e.target.value)}
            className="w-full bg-transparent text-white placeholder-gray-400 border-b border-gray-700 pb-2 focus:outline-none focus:border-pink-500"
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

        {/* Privacy Settings */}
        <div>
          <h3 className="font-semibold mb-4">Who can view this video</h3>
          <div className="space-y-3">
            {[
              { value: 'public', label: 'Everyone', icon: Globe },
              { value: 'friends', label: 'Friends', icon: Users },
              { value: 'private', label: 'Only me', icon: Lock }
            ].map(({ value, label, icon: Icon }) => (
              <label key={value} className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="radio"
                  name="privacy"
                  value={value}
                  checked={privacy === value}
                  onChange={(e) => setPrivacy(e.target.value)}
                  className="w-4 h-4 text-pink-500 bg-transparent border border-gray-600 focus:ring-pink-500"
                />
                <Icon className="w-5 h-5 text-gray-400" />
                <span>{label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Additional Settings */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span>Allow comments</span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={allowComments}
                onChange={(e) => setAllowComments(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-pink-500"></div>
            </label>
          </div>
          
          <div className="flex items-center justify-between">
            <span>Allow Duet & Stitch</span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={allowDuet}
                onChange={(e) => setAllowDuet(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-pink-500"></div>
            </label>
          </div>
        </div>

        {/* Upload Progress */}
        {isUploading && (
          <div className="bg-gray-900 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium">Uploading...</span>
              <span className="text-pink-500 font-bold">{uploadProgress}%</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div 
                className="bg-pink-500 h-2 rounded-full transition-all duration-300" 
                style={{ width: `${uploadProgress}%` }} 
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
export default UploadScreen;