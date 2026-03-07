const express = require("express");
const router = express.Router();

const {
  generateCertificate,
  downloadCertificate,
  verifyCertificate,
} = require("../controllers/certificateController");

const authMiddleware = require("../middleware/authMiddleware");

// Generate certificate
router.post("/generate/:internshipId", authMiddleware, generateCertificate);

// Verify certificate
router.get("/verify/:certificateId", verifyCertificate);

// Download certificate
router.get("/:certificateId/download", downloadCertificate);

module.exports = router;