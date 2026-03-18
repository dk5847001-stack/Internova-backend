const express = require("express");
const router = express.Router();

const {
  createContactMessage,
  getMyContactMessages,
  replyToContactMessage,
} = require("../controllers/contactController");

const { protect } = require("../middleware/authMiddleware");

/* =========================
   Public contact form submit
========================= */
router.post("/", createContactMessage);

/* =========================
   Logged in user contact inbox
========================= */
router.get("/my", protect, getMyContactMessages);

/* =========================
   Logged in user reply on own thread
========================= */
router.post("/my/:messageId/reply", protect, replyToContactMessage);

module.exports = router;