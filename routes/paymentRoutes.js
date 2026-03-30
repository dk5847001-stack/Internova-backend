const express = require("express");
const router = express.Router();
const {
  createOrder,
  verifyPayment,
  downloadPaymentSlip,
} = require("../controllers/paymentController");
const { protect } = require("../middleware/authMiddleware");
const { createRateLimiter } = require("../middleware/rateLimit");

const authenticatedUserKey = (req) =>
  String(req.user?.id || req.user?._id || req.ip || "unknown");

const createOrderLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  max: 15,
  keyGenerator: authenticatedUserKey,
  message: "Too many payment attempts. Please try again later.",
});

const verifyPaymentLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  max: 20,
  keyGenerator: authenticatedUserKey,
  message: "Too many payment verification attempts. Please try again later.",
});

router.post("/create-order", protect, createOrderLimiter, createOrder);
router.post("/verify", protect, verifyPaymentLimiter, verifyPayment);
router.get("/slip/:purchaseId", protect, downloadPaymentSlip);

module.exports = router;
