const mongoose = require("mongoose");

const purchaseSchema = new mongoose.Schema(
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
    durationLabel: {
      type: String,
      required: true,
      trim: true,
    },

    // progress system ke liye kaam aayega
    selectedDurationDays: {
      type: Number,
      default: 30,
      min: 1,
    },

    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    razorpayOrderId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    razorpayPaymentId: {
      type: String,
      default: "",
      trim: true,
      index: true,
    },
    razorpaySignature: {
      type: String,
      default: "",
      trim: true,
    },
    paymentStatus: {
      type: String,
      enum: ["created", "paid", "failed"],
      default: "created",
      index: true,
    },
  },
  { timestamps: true }
);

purchaseSchema.index({ userId: 1, internshipId: 1, paymentStatus: 1 });
purchaseSchema.index({ createdAt: -1 });
purchaseSchema.index({ internshipId: 1, createdAt: -1 });

module.exports =
  mongoose.models.Purchase || mongoose.model("Purchase", purchaseSchema);