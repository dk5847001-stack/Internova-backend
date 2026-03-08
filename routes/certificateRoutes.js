const express = require("express");
const router = express.Router();
const {
  generateCertificate,
  downloadCertificate,
  verifyCertificate,
  checkCertificateEligibility,
} = require("../controllers/certificateController");

const { protect } = require("../middleware/authMiddleware");

router.post("/generate/:internshipId", protect, generateCertificate);
router.get("/eligibility/:internshipId", protect, checkCertificateEligibility);
router.get("/verify/:certificateId", verifyCertificate);
router.get("/:certificateId/download", protect, downloadCertificate);

module.exports = router;