const express = require("express");
const router = express.Router();

const { getQuiz, submitQuiz } = require("../controllers/quizController");
const { protect } = require("../middleware/authMiddleware");

// Get quiz
router.get("/:internshipId", protect, getQuiz);

// Submit quiz
router.post("/:internshipId/submit", protect, submitQuiz);

module.exports = router;