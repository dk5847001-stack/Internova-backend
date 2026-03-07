const express = require("express");
const router = express.Router();
const {
  getCourseProgress,
  toggleModuleCompletion,
} = require("../controllers/progressController");
const { protect } = require("../middleware/authMiddleware");

router.get("/:internshipId", protect, getCourseProgress);
router.post("/:internshipId/toggle-module", protect, toggleModuleCompletion);

module.exports = router;