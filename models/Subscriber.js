const mongoose = require("mongoose");

const subscriberSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, "Email is required"],
      trim: true,
      lowercase: true,
      unique: true,
      index: true,
    },

    source: {
      type: String,
      default: "footer",
      trim: true,
      index: true,
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  { timestamps: true }
);

subscriberSchema.index({ createdAt: -1 });
subscriberSchema.index({ isActive: 1, createdAt: -1 });
subscriberSchema.index({ source: 1, createdAt: -1 });

module.exports =
  mongoose.models.Subscriber || mongoose.model("Subscriber", subscriberSchema);