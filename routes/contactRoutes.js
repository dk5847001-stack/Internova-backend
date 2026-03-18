const express = require("express");
const router = express.Router();

const {
  createContactMessage,
  getMyContactMessages,
  replyToContactMessage,
} = require("../controllers/contactController");

const {
  protect,
  optionalProtect,
} = require("../middleware/authMiddleware");

/* =========================
   Public + logged-in contact form submit
========================= */
router.post("/", optionalProtect, createContactMessage);

/* =========================
   Logged in user contact inbox
========================= */
router.get("/my", protect, getMyContactMessages);

/* =========================
   Logged in user reply on own thread
========================= */
router.post("/my/:messageId/reply", protect, replyToContactMessage);

module.exports = router;