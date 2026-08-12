import mongoose from 'mongoose';

const biblePlanSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  duration: {
    type: Number, // days
    required: true
  },
  category: {
    type: String,
    // The original six only covered the parts of the canon the seeded plans
    // happened to use; a generated plan for Job or Genesis had nowhere to go
    // and silently fell back to 'evangelie'. Old values stay valid.
    enum: [
      'evangelie', 'psalmen', 'proverbs', 'profeten', 'brieven', 'apocalyps',
      'wet', 'geschiedenis', 'wijsheid', 'overig'
    ],
    default: 'overig'
  },
  readings: [{
    day: {
      type: Number,
      required: true
    },
    book: {
      type: String,
      required: true
    },
    chapter: {
      type: Number,
      required: true
    },
    title: {
      type: String // Optional title for the day
    }
  }],
  isPublic: {
    type: Boolean,
    default: false // Only admin can make public plans
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  enrolledUsers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  progress: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    completedDays: [{
      type: Number
    }],
    lastReadDate: {
      type: Date
    }
  }]
}, {
  timestamps: true,
  collection: 'bibleplans'
});

// Indexes for better performance
biblePlanSchema.index({ isPublic: 1, createdBy: 1 });
biblePlanSchema.index({ category: 1 });

const BiblePlan = mongoose.models.BiblePlan || mongoose.model('BiblePlan', biblePlanSchema);

export default BiblePlan;
