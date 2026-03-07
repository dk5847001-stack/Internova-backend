const express = require("express");
const router = express.Router();
const {
  getMyPurchases,
  downloadOfferLetter,
} = require("../controllers/purchaseController");
const { protect } = require("../middleware/authMiddleware");

router.get("/my-purchases", protect, getMyPurchases);
router.get("/offer-letter/:purchaseId", protect, downloadOfferLetter);

module.exports = router;