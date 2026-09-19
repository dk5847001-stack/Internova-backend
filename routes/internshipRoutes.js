const express = require("express");
const router = express.Router();

const {
  getAllInternships,
  getAllInternshipsAdmin,
  getAdminInternshipStats,
  getSingleInternship,
  getPublicInternshipBySlug,
  getInternshipsSitemap,
  createInternship,
  updateInternship,
  deleteInternship,
} = require("../controllers/internshipController");

const { protect, adminOnly } = require("../middleware/authMiddleware");

// Public routes
router.get("/", getAllInternships);
router.get("/sitemap.xml", getInternshipsSitemap);
router.get("/slug/:slug", getPublicInternshipBySlug);

// Keep explicit admin routes above the dynamic :id route.
router.get("/admin/all", protect, adminOnly, getAllInternshipsAdmin);
router.get("/admin/stats", protect, adminOnly, getAdminInternshipStats);
router.post("/", protect, adminOnly, createInternship);
router.put("/:id", protect, adminOnly, updateInternship);
router.delete("/:id", protect, adminOnly, deleteInternship);

// Keep the dynamic detail route last so admin paths are never shadowed.
router.get("/:id", getSingleInternship);

module.exports = router;
