const mongoose = require("mongoose");

const videoProgressSchema = new mongoose.Schema(
  {
    moduleId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    videoId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    watchedPercent: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    completed: {
      type: Boolean,
      default: false,
    },
    lastWatchedAt: {
      type: Date,
      default: null,
    },
  },
  { _id: false }
);

const progressSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    internship: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Internship",
      required: true,
      index: true,
    },
    purchase: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Purchase",
      default: null,
    },

    enrolledAt: {
      type: Date,
      default: Date.now,
    },

    selectedDurationDays: {
      type: Number,
      default: 30,
    },

    unlockAllPurchased: {
      type: Boolean,
      default: false,
    },

    videoProgress: [videoProgressSchema],

    overallProgress: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },

    completedVideos: {
      type: Number,
      default: 0,
    },
    totalVideos: {
      type: Number,
      default: 0,
    },

    completedModules: {
      type: Number,
      default: 0,
    },
    totalModules: {
      type: Number,
      default: 0,
    },

    completedDays: {
      type: Number,
      default: 0,
    },

    durationCompleted: {
      type: Boolean,
      default: false,
    },

    miniTestUnlocked: {
      type: Boolean,
      default: false,
    },
    miniTestPassed: {
      type: Boolean,
      default: false,
    },

    certificateEligible: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

progressSchema.index({ user: 1, internship: 1 }, { unique: true });

module.exports = mongoose.model("Progress", progressSchema);