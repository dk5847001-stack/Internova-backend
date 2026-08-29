const mongoose = require("mongoose");

const platformSettingsSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, default: "platform", immutable: true },
    registrationFee: { type: Number, required: true, default: 1799, min: 1, max: 100000 },
    currency: { type: String, required: true, default: "INR", uppercase: true, immutable: true },
    registrationEnabled: { type: Boolean, default: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.models.PlatformSettings || mongoose.model("PlatformSettings", platformSettingsSchema);
