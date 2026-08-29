const express = require("express");
const router = express.Router();
const {
  getMyPurchases,
  downloadOfferLetter,
} = require("../controllers/purchaseController");
const { downloadMyOfferLetter, getMyOfferLetters, verifyOfferLetter } = require("../controllers/offerLetterController");
const { protect } = require("../middleware/authMiddleware");

router.get("/my-purchases", protect, getMyPurchases);
router.get("/offer-letter/:purchaseId", protect, downloadMyOfferLetter);
router.get("/offer-letters/my", protect, getMyOfferLetters);
router.get("/offer-letters/verify/:offerLetterId", verifyOfferLetter);

module.exports = router;
