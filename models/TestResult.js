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
      type: [Number],
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
      min: 0,
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
      index: true,
    },
    attemptNumber: {
      type: Number,
      default: 1,
      min: 1,
    },
    submittedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  { timestamps: true }
);

testResultSchema.index({ userId: 1, internshipId: 1 }, { unique: true });
testResultSchema.index({ internshipId: 1, passed: 1 });
testResultSchema.index({ userId: 1, submittedAt: -1 });

testResultSchema.pre("save", function (next) {
  if (!Array.isArray(this.answers)) {
    this.answers = [];
  }

  this.answers = this.answers
    .map((answer) => Number(answer))
    .filter((answer) => [0, 1, 2, 3].includes(answer));

  this.score = Math.max(0, Number(this.score || 0));
  this.totalQuestions = Math.max(0, Number(this.totalQuestions || 0));
  this.percentage = Math.max(0, Math.min(100, Number(this.percentage || 0)));
  this.attemptNumber = Math.max(1, Number(this.attemptNumber || 1));

  if (!this.submittedAt) {
    this.submittedAt = new Date();
  }

  next();
});

module.exports =
  mongoose.models.TestResult || mongoose.model("TestResult", testResultSchema);