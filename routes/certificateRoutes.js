const express = require("express");
const router = express.Router();
const {
  generateCertificate,
  downloadCertificate,
  verifyCertificate,
} = require("../controllers/certificateController");

const { protect } = require("../middleware/authMiddleware");

// Generate certificate
router.post("/generate/:internshipId", protect, generateCertificate);

// Verify certificate
router.get("/verify/:certificateId", verifyCertificate);

// Download certificate
router.get("/:certificateId/download", downloadCertificate);

module.exports = router;