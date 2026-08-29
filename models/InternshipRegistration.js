const mongoose = require("mongoose");

const internshipRegistrationSchema = new mongoose.Schema(
  {
    registrationId: { type: String, required: true, unique: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
    // A hashed, short-lived browser capability for guest retry/verification. The raw token never reaches MongoDB.
    accessTokenHash: { type: String, default: "", select: false },
    fullName: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, trim: true, lowercase: true, index: true },
    phone: { type: String, required: true, trim: true, maxlength: 20 },
    city: { type: String, required: true, trim: true, maxlength: 80 },
    state: { type: String, required: true, trim: true, maxlength: 80 },
    country: { type: String, required: true, trim: true, maxlength: 80 },
    educationLevel: { type: String, required: true, trim: true, maxlength: 60 },
    course: { type: String, required: true, trim: true, maxlength: 80 },
    branch: { type: String, required: true, trim: true, maxlength: 100 },
    collegeName: { type: String, required: true, trim: true, maxlength: 160 },
    academicYear: { type: String, required: true, trim: true, maxlength: 40 },
    graduationYear: { type: Number, required: true, min: 2020, max: 2100 },
    skills: { type: [String], default: [] },
    skillLevel: { type: String, enum: ["", "Beginner", "Intermediate", "Advanced"], default: "" },
    github: { type: String, default: "", trim: true, maxlength: 300 },
    linkedin: { type: String, default: "", trim: true, maxlength: 300 },
    portfolio: { type: String, default: "", trim: true, maxlength: 300 },
    primaryInternshipId: { type: mongoose.Schema.Types.ObjectId, ref: "Internship", required: true, index: true },
    primaryDomain: { type: String, required: true, trim: true, maxlength: 160 },
    secondaryInterest: { type: String, default: "", trim: true, maxlength: 160 },
    preferredDuration: { type: String, required: true, trim: true, maxlength: 80 },
    preferredMode: { type: String, enum: ["Online"], default: "Online" },
    startPreference: { type: String, default: "Flexible", trim: true, maxlength: 40 },
    careerGoal: { type: String, default: "", trim: true, maxlength: 80 },
    referralSource: { type: String, default: "", trim: true, maxlength: 80 },
    registrationFee: { type: Number, required: true, default: 1799, immutable: true },
    currency: { type: String, required: true, default: "INR", immutable: true },
    razorpayOrderId: { type: String, default: "", trim: true, index: true },
    razorpayPaymentId: { type: String, default: "", trim: true, index: true },
    razorpaySignature: { type: String, default: "", trim: true, select: false },
    paymentVerifiedAt: { type: Date, default: null },
    paymentStatus: { type: String, enum: ["pending", "created", "paid", "failed"], default: "pending", index: true },
    registrationStatus: { type: String, enum: ["draft", "payment_pending", "confirmed", "cancelled"], default: "payment_pending", index: true },
  },
  { timestamps: true }
);

internshipRegistrationSchema.index({ email: 1, primaryInternshipId: 1, createdAt: -1 });
internshipRegistrationSchema.index({ createdAt: -1, paymentStatus: 1 });
internshipRegistrationSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.models.InternshipRegistration || mongoose.model("InternshipRegistration", internshipRegistrationSchema);
