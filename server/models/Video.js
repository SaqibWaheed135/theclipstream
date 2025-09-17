import mongoose from "mongoose";

const VideoSchema = new mongoose.Schema(
  {
    title: { type: String, default: "" },
    description: { type: String, default: "" },
    key: { type: String, required: true }, // store Wasabi key instead of URL

    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    // Engagement
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    commentsCount: { type: Number, default: 0 }, // ✅ Already exists
    
    // Additional engagement metrics
    views: { type: Number, default: 0 },
    shares: { type: Number, default: 0 },

    // Content metadata
    hashtags: [{ type: String }],
    
    // Privacy and permissions
    privacy: {
      type: String,
      enum: ["public", "friends", "private"],
      default: "public",
    },
    allowComments: { type: Boolean, default: true },
    allowDuet: { type: Boolean, default: true },
    allowDownload: { type: Boolean, default: true },
    
    // Video technical details (optional)
    duration: { type: Number }, // in seconds
    fileSize: { type: Number }, // in bytes
    resolution: { type: String }, // e.g., "1920x1080"
    format: { type: String }, // e.g., "mp4"
    
    // Content moderation (optional)
    isReported: { type: Boolean, default: false },
    reportCount: { type: Number, default: 0 },
    isBlocked: { type: Boolean, default: false },
    
    // Featured content (optional)
    isFeatured: { type: Boolean, default: false },
    
    // Location (optional)
    location: {
      type: String,
      default: ""
    }
  },
  { 
    timestamps: true,
    // Add indexes for better query performance
    indexes: [
      { user: 1, createdAt: -1 },
      { hashtags: 1 },
      { privacy: 1, createdAt: -1 },
      { likes: 1 },
      { views: -1 },
      { isFeatured: 1, createdAt: -1 }
    ]
  }
);

// Virtual for likes count
VideoSchema.virtual('likesCount').get(function() {
  return this.likes ? this.likes.length : 0;
});

// Virtual for engagement rate (likes + comments per view)
VideoSchema.virtual('engagementRate').get(function() {
  if (this.views === 0) return 0;
  return ((this.likesCount + this.commentsCount) / this.views * 100).toFixed(2);
});

// Method to increment view count
VideoSchema.methods.incrementViews = function() {
  this.views += 1;
  return this.save();
};

// Method to increment share count
VideoSchema.methods.incrementShares = function() {
  this.shares += 1;
  return this.save();
};

// Static method to get trending videos
VideoSchema.statics.getTrending = function(limit = 10) {
  return this.find({ privacy: 'public' })
    .sort({ views: -1, likes: -1, createdAt: -1 })
    .limit(limit)
    .populate('user', 'username avatar');
};

// Static method to get videos by hashtag
VideoSchema.statics.getByHashtag = function(hashtag, limit = 20) {
  return this.find({ 
    hashtags: hashtag, 
    privacy: 'public' 
  })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('user', 'username avatar');
};

// Ensure virtual fields are serialized
VideoSchema.set('toJSON', { virtuals: true });
VideoSchema.set('toObject', { virtuals: true });

// Pre-save hook to update user's total videos count
VideoSchema.post('save', async function(doc) {
  if (doc.isNew) {
    await mongoose.model('User').findByIdAndUpdate(
      doc.user,
      { $inc: { totalVideos: 1 } }
    );
  }
});

// Pre-remove hook to update user's total videos count
VideoSchema.post('findOneAndDelete', async function(doc) {
  if (doc) {
    await mongoose.model('User').findByIdAndUpdate(
      doc.user,
      { $inc: { totalVideos: -1 } }
    );
  }
});

const Video = mongoose.model("Video", VideoSchema);
export default Video;