const express = require("express");
const router = express.Router();

const {
  getAllInternships,
  getAllInternshipsAdmin,
  getAdminInternshipStats,
  getSingleInternship,
  createInternship,
  updateInternship,
  deleteInternship,
} = require("../controllers/internshipController");

const { protect, adminOnly } = require("../middleware/authMiddleware");

// Public routes
router.get("/", getAllInternships);
router.get("/:id", getSingleInternship);

// Admin routes
router.get("/admin/all", protect, adminOnly, getAllInternshipsAdmin);
router.get("/admin/stats", protect, adminOnly, getAdminInternshipStats);
router.post("/", protect, adminOnly, createInternship);
router.put("/:id", protect, adminOnly, updateInternship);
router.delete("/:id", protect, adminOnly, deleteInternship);

module.exports = router;