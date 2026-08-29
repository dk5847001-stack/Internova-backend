const mongoose = require("mongoose");

const offerLetterSchema = new mongoose.Schema({
  offerLetterId: { type: String, required: true, unique: true, index: true },
  purchaseId: { type: mongoose.Schema.Types.ObjectId, ref: "Purchase", required: true, unique: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  internshipId: { type: mongoose.Schema.Types.ObjectId, ref: "Internship", required: true, index: true },
  candidateName: { type: String, required: true, trim: true }, candidateEmail: { type: String, required: true, trim: true, lowercase: true },
  internshipTitle: { type: String, required: true, trim: true }, domain: { type: String, default: "", trim: true }, duration: { type: String, default: "", trim: true },
  startDate: { type: Date, default: null }, endDate: { type: Date, default: null }, mode: { type: String, default: "Online", trim: true }, internshipType: { type: String, default: "Training Internship", trim: true },
  selectionStatus: { type: String, enum: ["selected"], required: true }, icatStatus: { type: String, default: "qualified" }, interviewStatus: { type: String, default: "completed" },
  issueDate: { type: Date, required: true, default: Date.now }, status: { type: String, enum: ["issued", "revoked"], default: "issued", index: true }, revokedAt: { type: Date, default: null }, revokedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
}, { timestamps: true });
offerLetterSchema.index({ userId: 1, status: 1, createdAt: -1 });
module.exports = mongoose.models.OfferLetter || mongoose.model("OfferLetter", offerLetterSchema);
