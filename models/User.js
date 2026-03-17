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
      default: undefined,
      validate: {
        validator: function (value) {
          if (this.authProvider === "google") return true;
          return typeof value === "string" && value.length >= 6;
        },
        message: "Password must be at least 6 characters long",
      },
    },

    phone: {
      type: String,
      default: "",
      trim: true,
      index: true,
    },

    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
      index: true,
    },

    authProvider: {
      type: String,
      enum: ["local", "google"],
      default: "local",
      index: true,
    },

    googleId: {
      type: String,
      default: "",
      index: true,
    },

    avatar: {
      type: String,
      default: "",
      trim: true,
    },

    isEmailVerified: {
      type: Boolean,
      default: false,
      index: true,
    },

    emailOtp: {
      type: String,
      default: "",
      select: false,
    },

    emailOtpExpires: {
      type: Date,
      default: null,
      select: false,
    },

    resetPasswordToken: {
      type: String,
      default: "",
      select: false,
    },

    resetPasswordExpires: {
      type: Date,
      default: null,
      select: false,
    },

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
  },
  { timestamps: true }
);

userSchema.index({ createdAt: -1 });
userSchema.index({ role: 1, createdAt: -1 });
userSchema.index({ email: 1, authProvider: 1 });

module.exports = mongoose.models.User || mongoose.model("User", userSchema);