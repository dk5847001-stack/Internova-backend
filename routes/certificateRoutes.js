const express = require("express");
const router = express.Router();

const {
  generateCertificate,
  downloadCertificate,
  verifyCertificate,
  checkCertificateEligibility,
} = require("../controllers/certificateController");

const { protect } = require("../middleware/authMiddleware");
const { createRateLimiter, getClientIp } = require("../middleware/rateLimit");

const certificateVerifyLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  max: 30,
  keyGenerator: (req) => {
    const certificateId =
      typeof req.params?.certificateId === "string"
        ? req.params.certificateId.trim().slice(0, 80)
        : "";
    return certificateId || getClientIp(req);
  },
  message: "Too many certificate verification attempts. Please try again later.",
});

// Generate certificate   

router.post("/generate/:internshipId", protect, generateCertificate);

// Check certificate eligibility
router.get("/eligibility/:internshipId", protect, checkCertificateEligibility);

// Verify certificate (public)
router.get("/verify/:certificateId", certificateVerifyLimiter, verifyCertificate);

// Download certificate
router.get("/:certificateId/download", protect, downloadCertificate);

module.exports = router;
