const express = require("express");
const router = express.Router();

const {
  getAdminOverview,
  getAdminUsers,
  getAdminPurchases,
  updateUserStatus,
  updatePurchaseStatus,
  resendCertificateFromPurchase,
} = require("../controllers/adminController");

const { protect, adminOnly } = require("../middleware/authMiddleware");

router.get("/overview", protect, adminOnly, getAdminOverview);
router.get("/users", protect, adminOnly, getAdminUsers);
router.get("/purchases", protect, adminOnly, getAdminPurchases);

router.patch("/users/:userId/status", protect, adminOnly, updateUserStatus);
router.patch(
  "/purchases/:purchaseId/status",
  protect,
  adminOnly,
  updatePurchaseStatus
);
router.post(
  "/certificates/:purchaseId/resend",
  protect,
  adminOnly,
  resendCertificateFromPurchase
);

module.exports = router;