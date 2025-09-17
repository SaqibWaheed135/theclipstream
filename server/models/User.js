const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Default avatar generator function
function generateDefaultAvatar(username) {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=random&color=fff&size=200&bold=true`;
}

const userSchema = new mongoose.Schema({
  username: { 
    type: String, 
    required: true, 
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 30
  },
  email: { 
    type: String, 
    required: true, 
    unique: true,
    lowercase: true,
    trim: true
  },
  password: { 
    type: String,
    minlength: 6 // Only required for non-Google users
  }, 
  googleId: { 
    type: String, 
    default: null,
    unique: true,
    sparse: true // Allows multiple null values
  },
  avatar: { 
    type: String, 
    default: function() {
      return generateDefaultAvatar(this.username || 'User');
    }
  },
  points: { 
    type: Number, 
    default: 5 
  },
  
  // New field for saved videos functionality
  savedVideos: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "Video"
  }],
  
  // Additional social features
  followers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  }],
  
  following: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  }],
  
  // Profile additional fields
  bio: {
    type: String,
    maxLength: 160,
    default: '',
    trim: true
  },
  
  isVerified: {
    type: Boolean,
    default: false
  },
  
  isPrivate: {
    type: Boolean,
    default: false
  },
  
  // Analytics
  totalLikes: {
    type: Number,
    default: 0
  },
  
  totalVideos: {
    type: Number,
    default: 0
  },
  
  // Last login tracking
  lastLogin: {
    type: Date,
    default: Date.now
  },
  
  // Account status
  isActive: {
    type: Boolean,
    default: true
  }
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Pre-save middleware to hash password and set default avatar
userSchema.pre('save', async function(next) {
  // Hash password only if modified and present
  if (this.isModified('password') && this.password) {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }
  
  // Set default avatar if not provided
  if (this.isNew && !this.avatar) {
    this.avatar = generateDefaultAvatar(this.username);
  }
  
  // Update lastLogin on save
  if (this.isNew) {
    this.lastLogin = new Date();
  }
  
  next();
});

// Compare password method
userSchema.methods.matchPassword = async function(password) {
  if (!this.password) return false;
  return bcrypt.compare(password, this.password);
};

// Method to update avatar
userSchema.methods.updateAvatar = function(newAvatarUrl) {
  this.avatar = newAvatarUrl || generateDefaultAvatar(this.username);
  return this.save();
};

// Method to check if user can login with password
userSchema.methods.hasPassword = function() {
  return !!this.password;
};

// Method to check if user is Google user
userSchema.methods.isGoogleUser = function() {
  return !!this.googleId;
};

// Virtual for follower count
userSchema.virtual('followersCount').get(function() {
  return this.followers ? this.followers.length : 0;
});

// Virtual for following count
userSchema.virtual('followingCount').get(function() {
  return this.following ? this.following.length : 0;
});

// Virtual for saved videos count
userSchema.virtual('savedVideosCount').get(function() {
  return this.savedVideos ? this.savedVideos.length : 0;
});

// Virtual for full profile (useful for API responses)
userSchema.virtual('profile').get(function() {
  return {
    id: this._id,
    username: this.username,
    email: this.email,
    avatar: this.avatar,
    bio: this.bio,
    points: this.points,
    isVerified: this.isVerified,
    isPrivate: this.isPrivate,
    followersCount: this.followersCount,
    followingCount: this.followingCount,
    totalLikes: this.totalLikes,
    totalVideos: this.totalVideos,
    createdAt: this.createdAt
  };
});

// Indexes for better performance
userSchema.index({ username: 1 });
userSchema.index({ email: 1 });
userSchema.index({ googleId: 1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ lastLogin: -1 });

// Compound index for search
userSchema.index({ username: 'text', email: 'text' });

module.exports = mongoose.model('User', userSchema);