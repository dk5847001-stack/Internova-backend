const mongoose = require("mongoose");

const certificateSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    internship: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Internship",
      required: true,
    },
    certificateId: {
      type: String,
      required: true,
      unique: true,
    },
    studentName: {
      type: String,
      required: true,
      trim: true,
    },
    internshipTitle: {
      type: String,
      required: true,
      trim: true,
    },
    duration: {
      type: String,
      default: "",
    },
    issueDate: {
      type: Date,
      default: Date.now,
    },
    pdfUrl: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: ["generated", "revoked"],
      default: "generated",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Certificate", certificateSchema);