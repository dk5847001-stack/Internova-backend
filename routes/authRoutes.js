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

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/verify-email-otp", verifyEmailOtp);
router.post("/resend-email-otp", resendEmailOtp);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.post("/google-login", googleLogin);

router.get("/me", protect, getMyProfile);

/* =========================
   Notifications
========================= */
router.get("/notifications", protect, getUserNotifications);
router.patch("/notifications/read-all", protect, markAllNotificationsAsRead);

module.exports = router;