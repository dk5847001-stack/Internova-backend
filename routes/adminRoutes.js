const express = require("express");
const router = express.Router();

const {
  getAdminOverview,
  getAdminUsers,
  getAdminPurchases,
} = require("../controllers/adminController");

const { protect, adminOnly } = require("../middleware/authMiddleware");

router.get("/overview", protect, adminOnly, getAdminOverview);
router.get("/users", protect, adminOnly, getAdminUsers);
router.get("/purchases", protect, adminOnly, getAdminPurchases);

module.exports = router;