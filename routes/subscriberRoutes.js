const express = require("express");
const router = express.Router();

const {
  subscribeUser,
  getAllSubscribers,
} = require("../controllers/subscriberController");

const { protect, adminOnly } = require("../middleware/authMiddleware");

/* =========================
   Public subscribe
========================= */
router.post("/subscribe", subscribeUser);

/* Optional backward compatibility */
router.post("/", subscribeUser);

/* =========================
   Admin subscribers list
========================= */
router.get("/", protect, adminOnly, getAllSubscribers);

module.exports = router;