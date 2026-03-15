const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: 6,
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
      index: true,
    },

    // Admin analytics ke liye useful
    lastLoginAt: {
      type: Date,
      default: null,
      index: true,
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    avatar: {
      type: String,
      default: "",
      trim: true,
    },
  },
  { timestamps: true }
);

userSchema.index({ createdAt: -1 });
userSchema.index({ role: 1, createdAt: -1 });

module.exports = mongoose.models.User || mongoose.model("User", userSchema);