const mongoose = require("mongoose");

const videoSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
    videoUrl: {
      type: String,
      required: true,
      trim: true,
    },
    duration: {
      type: String,
      default: "",
      trim: true,
    },
    order: {
      type: Number,
      default: 0,
    },
  },
  { _id: true }
);

const moduleSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
    unlockDay: {
      type: Number,
      default: 1,
      min: 1,
    },
    order: {
      type: Number,
      default: 0,
    },
    videos: [videoSchema],
  },
  { _id: true }
);

const internshipSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      default: "",
      trim: true,
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
    category: {
      type: String,
      default: "",
      trim: true,
    },
    branch: {
      type: String,
      default: "",
      trim: true,
    },
    duration: {
      type: String,
      default: "",
      trim: true,
    },
    durationDays: {
      type: Number,
      default: 30,
    },
    price: {
      type: Number,
      default: 0,
    },

    // learning structure
    modules: [moduleSchema],

    // rules
    requiredProgress: {
      type: Number,
      default: 80,
      min: 1,
      max: 100,
    },
    miniTestUnlockProgress: {
      type: Number,
      default: 80,
      min: 1,
      max: 100,
    },
    miniTestPassMarks: {
      type: Number,
      default: 60,
      min: 1,
      max: 100,
    },
    unlockAllPrice: {
      type: Number,
      default: 99,
    },
    certificateEnabled: {
      type: Boolean,
      default: true,
    },

    image: {
      type: String,
      default: "",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Internship", internshipSchema);