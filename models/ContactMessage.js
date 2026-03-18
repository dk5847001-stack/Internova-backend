const mongoose = require("mongoose");

const contactMessageSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },

    subject: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    message: {
      type: String,
      required: true,
      trim: true,
    },

    status: {
      type: String,
      enum: ["new", "replied", "user_replied", "closed"],
      default: "new",
      index: true,
    },

    adminReply: {
      message: {
        type: String,
        default: "",
        trim: true,
      },
      repliedAt: {
        type: Date,
        default: null,
      },
      repliedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },
    },

    lastMessageAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  { timestamps: true }
);

contactMessageSchema.pre("save", function (next) {
  this.lastMessageAt = new Date();
  next();
});

contactMessageSchema.index({ createdAt: -1 });
contactMessageSchema.index({ status: 1, updatedAt: -1 });
contactMessageSchema.index({ userId: 1, updatedAt: -1 });
contactMessageSchema.index({ email: 1, createdAt: -1 });
contactMessageSchema.index({ status: 1, lastMessageAt: -1 });

module.exports =
  mongoose.models.ContactMessage ||
  mongoose.model("ContactMessage", contactMessageSchema);