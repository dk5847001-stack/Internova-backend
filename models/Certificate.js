const mongoose = require("mongoose");

const certificateSchema = new mongoose.Schema(
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
      required: true,
      index: true,
    },
    certificateId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    issuedAt: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ["issued", "revoked"],
      default: "issued",
      index: true,
    },
  },
  { timestamps: true }
);

certificateSchema.index({ userId: 1, internshipId: 1 }, { unique: true });
certificateSchema.index({ internshipId: 1, status: 1 });
certificateSchema.index({ certificateId: 1, status: 1 });

certificateSchema.pre("save", function (next) {
  if (typeof this.certificateId === "string") {
    this.certificateId = this.certificateId.trim();
  }

  if (!this.issuedAt) {
    this.issuedAt = new Date();
  }

  next();
});

module.exports =
  mongoose.models.Certificate ||
  mongoose.model("Certificate", certificateSchema);