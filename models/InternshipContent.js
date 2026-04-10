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

const internshipContentSchema = new mongoose.Schema(
  {
    internshipId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Internship",
      required: true,
      unique: true,
      index: true,
    },
    modules: {
      type: [moduleSchema],
      default: [],
    },
    quiz: {
      type: Array,
      default: [],
    },
  },
  { timestamps: true }
);

internshipContentSchema.index({ internshipId: 1 }, { unique: true });

module.exports =
  mongoose.models.InternshipContent ||
  mongoose.model("InternshipContent", internshipContentSchema);
