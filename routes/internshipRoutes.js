const express = require("express");
const router = express.Router();
const {
  getAllInternships,
  getSingleInternship,
  createInternship,
  updateInternship,
} = require("../controllers/internshipController");

router.get("/", getAllInternships);
router.get("/:id", getSingleInternship);
router.post("/", createInternship);
router.put("/:id", updateInternship);

module.exports = router;