const express = require("express");
const router = express.Router();
const {
  getAllInternships,
  getSingleInternship,
  createInternship,
} = require("../controllers/internshipController");

router.get("/", getAllInternships);
router.get("/:id", getSingleInternship);
router.post("/", createInternship);

module.exports = router;