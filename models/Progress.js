const mongoose = require("mongoose");

const progressSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    internshipId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Internship",
      required: true,
    },
    completedModules: {
      type: [Number],
      default: [],
    },
    progressPercent: {
      type: Number,
      default: 0,
    },
    certificateEligible: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

progressSchema.index({ userId: 1, internshipId: 1 }, { unique: true });

module.exports = mongoose.model("Progress", progressSchema);