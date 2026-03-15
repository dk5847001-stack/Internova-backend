const express = require("express");
const router = express.Router();

const {
  getCourseProgress,
  updateVideoProgress,
  unlockAllModules,
  getEligibilityStatus,
} = require("../controllers/progressController");

const { protect } = require("../middleware/authMiddleware");

// Course progress
router.get("/course/:internshipId", protect, getCourseProgress);

// Video progress update
router.patch("/course/:internshipId/video", protect, updateVideoProgress);

// Unlock all modules
router.patch("/course/:internshipId/unlock-all", protect, unlockAllModules);

// Eligibility status
router.get("/course/:internshipId/eligibility", protect, getEligibilityStatus);

module.exports = router;