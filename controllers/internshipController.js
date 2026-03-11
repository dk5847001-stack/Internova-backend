const Internship = require("../models/Internship");

// GET all internships
exports.getAllInternships = async (req, res) => {
  try {
    const internships = await Internship.find({ isActive: true }).sort({
      createdAt: -1,
    });

    return res.status(200).json({
      success: true,
      count: internships.length,
      internships,
    });
  } catch (error) {
    console.error("GET INTERNSHIPS ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch internships",
    });
  }
};

// GET single internship
exports.getSingleInternship = async (req, res) => {
  try {
    const internship = await Internship.findById(req.params.id);

    if (!internship) {
      return res.status(404).json({
        success: false,
        message: "Internship not found",
      });
    }

    return res.status(200).json({
      success: true,
      internship,
    });
  } catch (error) {
    console.error("GET SINGLE INTERNSHIP ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch internship details",
    });
  }
};

// CREATE internship
exports.createInternship = async (req, res) => {
  try {
    const {
      title,
      branch,
      category,
      description,
      thumbnail,
      durations,
      modules,
      quiz,
    } = req.body;

    if (!title || !branch || !description || !durations?.length) {
      return res.status(400).json({
        success: false,
        message: "Title, branch, description and durations are required",
      });
    }

    const cleanedModules = Array.isArray(modules)
      ? modules
          .filter((m) => m.title && m.title.trim())
          .map((m) => ({
            title: m.title.trim(),
            description: m.description?.trim() || "",
          }))
      : [];

    const cleanedQuiz = Array.isArray(quiz)
      ? quiz
          .filter(
            (q) =>
              q.question &&
              q.question.trim() &&
              Array.isArray(q.options) &&
              q.options.length === 4 &&
              q.options.every((opt) => String(opt).trim() !== "")
          )
          .map((q) => ({
            question: q.question.trim(),
            options: q.options.map((opt) => String(opt).trim()),
            correctAnswer: Number(q.correctAnswer),
          }))
      : [];

    const internship = await Internship.create({
      title,
      branch,
      category,
      description,
      thumbnail,
      durations,
      modules: cleanedModules,
      quiz: cleanedQuiz,
    });

    return res.status(201).json({
      success: true,
      message: "Internship created successfully",
      internship,
    });
  } catch (error) {
    console.error("CREATE INTERNSHIP ERROR:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to create internship",
    });
  }
};

// UPDATE internship
exports.updateInternship = async (req, res) => {
  try {
    const internship = await Internship.findById(req.params.id);

    if (!internship) {
      return res.status(404).json({
        success: false,
        message: "Internship not found",
      });
    }

    const {
      title,
      branch,
      category,
      description,
      thumbnail,
      durations,
      modules,
      quiz,
      isActive,
    } = req.body;

    const cleanedModules = Array.isArray(modules)
      ? modules
          .filter((m) => m.title && m.title.trim())
          .map((m) => ({
            title: m.title.trim(),
            description: m.description?.trim() || "",
          }))
      : [];

    const cleanedQuiz = Array.isArray(quiz)
      ? quiz
          .filter(
            (q) =>
              q.question &&
              q.question.trim() &&
              Array.isArray(q.options) &&
              q.options.length === 4 &&
              q.options.every((opt) => String(opt).trim() !== "")
          )
          .map((q) => ({
            question: q.question.trim(),
            options: q.options.map((opt) => String(opt).trim()),
            correctAnswer: Number(q.correctAnswer),
          }))
      : [];

    internship.title = title;
    internship.branch = branch;
    internship.category = category;
    internship.description = description;
    internship.thumbnail = thumbnail;
    internship.durations = durations;
    internship.modules = cleanedModules;
    internship.quiz = cleanedQuiz;

    if (typeof isActive === "boolean") {
      internship.isActive = isActive;
    }

    await internship.save();

    return res.status(200).json({
      success: true,
      message: "Internship updated successfully",
      internship,
    });
  } catch (error) {
    console.error("UPDATE INTERNSHIP ERROR:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to update internship",
    });
  }
};

exports.deleteInternship = async (req, res) => {
  try {
    const internship = await Internship.findById(req.params.id);

    if (!internship) {
      return res.status(404).json({
        success: false,
        message: "Internship not found",
      });
    }

    await Internship.findByIdAndDelete(req.params.id);

    return res.status(200).json({
      success: true,
      message: "Internship deleted successfully",
    });
  } catch (error) {
    console.error("DELETE INTERNSHIP ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete internship",
    });
  }
};