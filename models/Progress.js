const mongoose = require("mongoose");

const videoProgressSchema = new mongoose.Schema(
  {
    moduleId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    videoId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
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
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    internshipId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Internship",
      required: true,
      index: true,
    },
    purchaseId: {
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
      min: 1,
    },

    unlockAllPurchased: {
      type: Boolean,
      default: false,
    },

    videoProgress: {
      type: [videoProgressSchema],
      default: [],
    },

    overallProgress: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },

    completedVideos: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalVideos: {
      type: Number,
      default: 0,
      min: 0,
    },

    completedModules: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalModules: {
      type: Number,
      default: 0,
      min: 0,
    },

    completedDays: {
      type: Number,
      default: 0,
      min: 0,
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

progressSchema.index({ userId: 1, internshipId: 1 }, { unique: true });
progressSchema.index({ userId: 1, purchaseId: 1 });
progressSchema.index({ internshipId: 1, updatedAt: -1 });

progressSchema.pre("save", function () {
  if (!Array.isArray(this.videoProgress)) {
    this.videoProgress = [];
  }

  this.videoProgress = this.videoProgress.map((item) => {
    const safePercent = Math.max(
      0,
      Math.min(100, Number(item.watchedPercent || 0))
    );

    return {
      ...item,
      watchedPercent: safePercent,
      completed: safePercent >= 80 || Boolean(item.completed),
    };
  });

  this.selectedDurationDays = Math.max(
    1,
    Number(this.selectedDurationDays || 30)
  );

  this.overallProgress = Math.max(
    0,
    Math.min(100, Number(this.overallProgress || 0))
  );

  this.completedVideos = Math.max(0, Number(this.completedVideos || 0));
  this.totalVideos = Math.max(0, Number(this.totalVideos || 0));
  this.completedModules = Math.max(0, Number(this.completedModules || 0));
  this.totalModules = Math.max(0, Number(this.totalModules || 0));
  this.completedDays = Math.max(0, Number(this.completedDays || 0));
});

module.exports =
  mongoose.models.Progress || mongoose.model("Progress", progressSchema);