const mongoose = require("mongoose");

const testResultSchema = new mongoose.Schema(
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
    answers: {
      type: Array,
      default: [],
    },
    score: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    totalQuestions: {
      type: Number,
      default: 0,
    },
    percentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    passed: {
      type: Boolean,
      default: false,
    },
    attemptNumber: {
      type: Number,
      default: 1,
    },
    submittedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

testResultSchema.index({ userId: 1, internshipId: 1 }, { unique: true });

module.exports =
  mongoose.models.TestResult || mongoose.model("TestResult", testResultSchema);