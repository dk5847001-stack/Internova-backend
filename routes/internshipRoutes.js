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

router.get("/", getAllInternships);
router.get("/admin/all", protect, adminOnly, getAllInternshipsAdmin);
router.get("/admin/stats", protect, adminOnly, getAdminInternshipStats);
router.get("/:id", getSingleInternship);

router.post("/", protect, adminOnly, createInternship);
router.put("/:id", protect, adminOnly, updateInternship);
router.delete("/:id", protect, adminOnly, deleteInternship);

module.exports = router;