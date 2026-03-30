const express = require("express");
const router = express.Router();

const {
  subscribeUser,
  getAllSubscribers,
} = require("../controllers/subscriberController");

const { protect, adminOnly } = require("../middleware/authMiddleware");
const { createRateLimiter, getClientIp } = require("../middleware/rateLimit");
const { normalizeEmail } = require("../utils/validation");

const subscribeLimiter = createRateLimiter({
  windowMs: 30 * 60 * 1000,
  max: 5,
  keyGenerator: (req) => normalizeEmail(req.body?.email) || getClientIp(req),
  message: "Too many subscription attempts. Please try again later.",
});

/* =========================
   Public subscribe
========================= */
router.post("/subscribe", subscribeLimiter, subscribeUser);

/* Optional backward compatibility */
router.post("/", subscribeLimiter, subscribeUser);

/* =========================
   Admin subscribers list
========================= */
router.get("/", protect, adminOnly, getAllSubscribers);

module.exports = router;
