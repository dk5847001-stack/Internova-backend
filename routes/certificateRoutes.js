const express = require("express");
const router = express.Router();

const {
  generateCertificate,
  downloadCertificate,
  verifyCertificate,
  checkCertificateEligibility,
} = require("../controllers/certificateController");

const { protect } = require("../middleware/authMiddleware");

// Generate certificate   

router.post("/generate/:internshipId", protect, generateCertificate);

// Check certificate eligibility
router.get("/eligibility/:internshipId", protect, checkCertificateEligibility);

// Verify certificate (public)
router.get("/verify/:certificateId", verifyCertificate);

// Download certificate
router.get("/:certificateId/download", protect, downloadCertificate);

module.exports = router;