const express = require("express");
const router = express.Router();

const {
  createContactMessage,
  getMyContactMessages,
  replyToContactMessage,
} = require("../controllers/contactController");

const {
  protect,
  optionalProtect,
} = require("../middleware/authMiddleware");
const { createRateLimiter, getClientIp } = require("../middleware/rateLimit");
const { normalizeEmail } = require("../utils/validation");

const contactSubmitLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  keyGenerator: (req) => normalizeEmail(req.body?.email) || getClientIp(req),
  message: "Too many contact requests. Please try again later.",
});

const contactReplyLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  max: 8,
  keyGenerator: (req) => String(req.user?.id || req.user?._id || getClientIp(req)),
  message: "Too many replies sent. Please try again later.",
});

/* =========================
   Public + logged-in contact form submit
========================= */
router.post("/", contactSubmitLimiter, optionalProtect, createContactMessage);

/* =========================
   Logged in user contact inbox
========================= */
router.get("/my", protect, getMyContactMessages);

/* =========================
   Logged in user reply on own thread
========================= */
router.post("/my/:messageId/reply", protect, contactReplyLimiter, replyToContactMessage);

module.exports = router;
