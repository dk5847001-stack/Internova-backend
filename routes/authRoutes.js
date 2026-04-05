const express = require("express");
const router = express.Router();

const {
  registerUser,
  loginUser,
  getMyProfile,
  verifyEmailOtp,
  resendEmailOtp,
  forgotPassword,
  resetPassword,
  googleLogin,
  getUserNotifications,
  markAllNotificationsAsRead,
} = require("../controllers/authController");

const { protect } = require("../middleware/authMiddleware");
const { createRateLimiter, getClientIp } = require("../middleware/rateLimit");
const { normalizeEmail } = require("../utils/validation");

const getTrimmedKey = (value, maxLength = 80) =>
  typeof value === "string" ? value.trim().slice(0, maxLength) : "";

const emailOrIpKey = (req) => {
  const email = normalizeEmail(req.body?.email);
  return email || getClientIp(req);
};

const tokenOrIpKey = (req) => {
  const token = getTrimmedKey(req.body?.token);
  return token || getClientIp(req);
};

const registerLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 5,
  keyGenerator: emailOrIpKey,
  message: "Too many registration attempts. Please try again later.",
});

const loginLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 8,
  keyGenerator: emailOrIpKey,
  message: "Too many login attempts. Please wait before trying again.",
});

const otpLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  max: 10,
  keyGenerator: emailOrIpKey,
  message: "Too many OTP attempts. Please wait before trying again.",
});

const otpResendLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  keyGenerator: emailOrIpKey,
  message: "Too many OTP resend requests. Please try again later.",
});

const forgotPasswordLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  keyGenerator: emailOrIpKey,
  message: "Too many password reset requests. Please try again later.",
});

const resetPasswordLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  keyGenerator: tokenOrIpKey,
  message: "Too many password reset attempts. Please try again later.",
});

const googleLoginLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  max: 12,
  keyGenerator: (req) => {
    const token = getTrimmedKey(req.body?.idToken);
    return token || getClientIp(req);
  },
  message: "Too many Google sign-in attempts. Please try again later.",
});

router.post("/register", registerLimiter, registerUser);
router.post("/login", loginLimiter, loginUser);
router.post("/verify-email-otp", otpLimiter, verifyEmailOtp);
router.post("/resend-email-otp", otpResendLimiter, resendEmailOtp);
router.post("/forgot-password", forgotPasswordLimiter, forgotPassword);
router.post("/reset-password", resetPasswordLimiter, resetPassword);
router.post("/google-login", googleLoginLimiter, googleLogin);

router.get("/me", protect, getMyProfile);

/* =========================
   Notifications
========================= */
router.get("/notifications", protect, getUserNotifications);
router.patch("/notifications/read-all", protect, markAllNotificationsAsRead);

module.exports = router;
