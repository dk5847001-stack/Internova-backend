const express = require("express");
const router = express.Router();

const {
  getAdminOverview,
  getAdminUsers,
  getAdminPurchases,
  updateUserStatus,
  updatePurchaseStatus,
  resendCertificateFromPurchase,
  getAdminContactMessages,
  replyToContactMessage,
  getAdminSubscribers,
} = require("../controllers/adminController");

const { protect, adminOnly } = require("../middleware/authMiddleware");
const registrationController = require("../controllers/internshipRegistrationController");
const offerLetterController = require("../controllers/offerLetterController");

/* =========================
   Overview
========================= */
router.get("/overview", protect, adminOnly, getAdminOverview);

/* =========================
   Users
========================= */
router.get("/users", protect, adminOnly, getAdminUsers);
router.patch("/users/:userId/status", protect, adminOnly, updateUserStatus);

/* =========================
   Purchases
========================= */
router.get("/purchases", protect, adminOnly, getAdminPurchases);
router.patch(
  "/purchases/:purchaseId/status",
  protect,
  adminOnly,
  updatePurchaseStatus
);

/* =========================
   Internship registrations
========================= */
router.get("/registrations", protect, adminOnly, registrationController.getAdminRegistrations);
router.get("/registrations/:id", protect, adminOnly, registrationController.getAdminRegistration);
router.patch("/registrations/:id/status", protect, adminOnly, registrationController.updateAdminRegistrationStatus);
router.get("/registration-settings", protect, adminOnly, registrationController.getAdminRegistrationSettings);
router.patch("/registration-settings", protect, adminOnly, registrationController.updateAdminRegistrationSettings);

router.get("/offer-letters", protect, adminOnly, offerLetterController.getAdminOfferLetters);
router.get("/offer-letter-candidates", protect, adminOnly, offerLetterController.getAdminEligibleCandidates);
router.patch("/offer-letter-candidates/:purchaseId", protect, adminOnly, offerLetterController.updateCandidateSelection);
router.post("/offer-letters/:purchaseId/issue", protect, adminOnly, offerLetterController.issueOfferLetter);
router.patch("/offer-letters/:offerLetterId/revoke", protect, adminOnly, offerLetterController.revokeOfferLetter);

/* =========================
   Certificates
========================= */
router.post(
  "/certificates/:purchaseId/resend",
  protect,
  adminOnly,
  resendCertificateFromPurchase
);

/* =========================
   Contact Messages
========================= */
router.get(
  "/contact-messages",
  protect,
  adminOnly,
  getAdminContactMessages
);

router.post(
  "/contact-messages/:messageId/reply",
  protect,
  adminOnly,
  replyToContactMessage
);

/* =========================
   Subscribers
========================= */
router.get("/subscribers", protect, adminOnly, getAdminSubscribers);

module.exports = router;
