const express = require("express");
const router = express.Router();

const {
  getCourseProgress,
  updateVideoProgress,
  unlockAllModules,
  getEligibilityStatus,
} = require("../controllers/progressController");

const { protect } = require("../middleware/authMiddleware");

router.get("/course/:internshipId", protect, getCourseProgress);
router.patch("/course/:internshipId/video", protect, updateVideoProgress);
router.patch("/course/:internshipId/unlock-all", protect, unlockAllModules);
router.get("/course/:internshipId/eligibility", protect, getEligibilityStatus);

module.exports = router;