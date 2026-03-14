const Internship = require("../models/Internship");

// helpers
const cleanDurations = (durations = []) => {
  if (!Array.isArray(durations)) return [];

  return durations
    .filter((d) => d && String(d.label || "").trim())
    .map((d, index) => ({
      label: String(d.label || "").trim(),
      price: Number(d.price || 0),
      durationDays:
        Number(d.durationDays || 0) > 0 ? Number(d.durationDays) : 30,
      order: Number(d.order ?? index + 1),
    }));
};

const cleanModules = (modules = []) => {
  if (!Array.isArray(modules)) return [];

  return modules
    .filter((m) => m && String(m.title || "").trim())
    .map((m, moduleIndex) => ({
      title: String(m.title || "").trim(),
      description: String(m.description || "").trim(),
      unlockDay:
        Number(m.unlockDay || 0) > 0 ? Number(m.unlockDay) : moduleIndex + 1,
      order: Number(m.order ?? moduleIndex + 1),
      videos: Array.isArray(m.videos)
        ? m.videos
            .filter((v) => v && String(v.title || "").trim() && String(v.videoUrl || "").trim())
            .map((v, videoIndex) => ({
              title: String(v.title || "").trim(),
              description: String(v.description || "").trim(),
              videoUrl: String(v.videoUrl || "").trim(),
              duration: String(v.duration || "").trim(),
              order: Number(v.order ?? videoIndex + 1),
            }))
        : [],
    }));
};

const cleanQuiz = (quiz = []) => {
  if (!Array.isArray(quiz)) return [];

  return quiz
    .filter(
      (q) =>
        q &&
        String(q.question || "").trim() &&
        Array.isArray(q.options) &&
        q.options.length === 4 &&
        q.options.every((opt) => String(opt || "").trim() !== "")
    )
    .map((q) => ({
      question: String(q.question || "").trim(),
      options: q.options.map((opt) => String(opt || "").trim()),
      correctAnswer: Math.max(0, Math.min(3, Number(q.correctAnswer || 0))),
    }));
};

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
      message: "Failed to fetch programs",
    });
  }
};

// GET all internships for admin
exports.getAllInternshipsAdmin = async (req, res) => {
  try {
    const internships = await Internship.find().sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: internships.length,
      internships,
    });
  } catch (error) {
    console.error("GET ADMIN INTERNSHIPS ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch admin internships",
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
      image,
      slug,
      durations,
      modules,
      quiz,
      requiredProgress,
      miniTestUnlockProgress,
      miniTestPassMarks,
      unlockAllPrice,
      certificateEnabled,
      isActive,
    } = req.body;

    if (!title || !branch || !description) {
      return res.status(400).json({
        success: false,
        message: "Title, branch and description are required",
      });
    }

    const cleanedDurations = cleanDurations(durations);
    if (!cleanedDurations.length) {
      return res.status(400).json({
        success: false,
        message: "At least one valid duration is required",
      });
    }

    const cleanedModules = cleanModules(modules);
    const cleanedQuiz = cleanQuiz(quiz);

    const primaryDuration = cleanedDurations[0];

    const internship = await Internship.create({
      title: String(title).trim(),
      slug: String(slug || "").trim(),
      branch: String(branch).trim(),
      category: String(category || "").trim(),
      description: String(description).trim(),
      thumbnail: String(thumbnail || "").trim(),
      image: String(image || "").trim(),
      duration: primaryDuration.label,
      durationDays: primaryDuration.durationDays,
      price: primaryDuration.price,
      durations: cleanedDurations,
      modules: cleanedModules,
      quiz: cleanedQuiz,
      requiredProgress: Number(requiredProgress || 80),
      miniTestUnlockProgress: Number(miniTestUnlockProgress || 80),
      miniTestPassMarks: Number(miniTestPassMarks || 60),
      unlockAllPrice: Number(unlockAllPrice || 99),
      certificateEnabled:
        typeof certificateEnabled === "boolean" ? certificateEnabled : true,
      isActive: typeof isActive === "boolean" ? isActive : true,
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
      image,
      slug,
      durations,
      modules,
      quiz,
      requiredProgress,
      miniTestUnlockProgress,
      miniTestPassMarks,
      unlockAllPrice,
      certificateEnabled,
      isActive,
    } = req.body;

    const cleanedDurations = cleanDurations(durations);
    const cleanedModules = cleanModules(modules);
    const cleanedQuiz = cleanQuiz(quiz);

    const primaryDuration =
      cleanedDurations[0] ||
      internship.durations?.[0] || {
        label: internship.duration || "1 Month",
        price: internship.price || 0,
        durationDays: internship.durationDays || 30,
      };

    internship.title = String(title || internship.title).trim();
    internship.slug = String(slug || internship.slug || "").trim();
    internship.branch = String(branch || internship.branch).trim();
    internship.category = String(category || internship.category || "").trim();
    internship.description = String(
      description || internship.description
    ).trim();
    internship.thumbnail = String(thumbnail || internship.thumbnail || "").trim();
    internship.image = String(image || internship.image || "").trim();

    internship.duration = primaryDuration.label;
    internship.durationDays = Number(primaryDuration.durationDays || 30);
    internship.price = Number(primaryDuration.price || 0);

    internship.durations = cleanedDurations.length
      ? cleanedDurations
      : internship.durations;

    internship.modules = cleanedModules;
    internship.quiz = cleanedQuiz;

    internship.requiredProgress = Number(requiredProgress || 80);
    internship.miniTestUnlockProgress = Number(miniTestUnlockProgress || 80);
    internship.miniTestPassMarks = Number(miniTestPassMarks || 60);
    internship.unlockAllPrice = Number(unlockAllPrice || 99);

    if (typeof certificateEnabled === "boolean") {
      internship.certificateEnabled = certificateEnabled;
    }

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