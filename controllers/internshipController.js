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

// GET admin dashboard stats
exports.getAdminInternshipStats = async (req, res) => {
  try {
    const internships = await Internship.find().sort({ createdAt: -1 });

    const totalPrograms = internships.length;
    const activePrograms = internships.filter((item) => item.isActive).length;
    const inactivePrograms = totalPrograms - activePrograms;

    const totalModules = internships.reduce(
      (sum, item) => sum + (item.modules?.length || 0),
      0
    );

    const totalVideos = internships.reduce(
      (sum, item) =>
        sum +
        (item.modules || []).reduce(
          (moduleSum, module) => moduleSum + (module.videos?.length || 0),
          0
        ),
      0
    );

    const totalQuizQuestions = internships.reduce(
      (sum, item) => sum + (item.quiz?.length || 0),
      0
    );

    const recentInternships = internships.slice(0, 6).map((item) => ({
      _id: item._id,
      title: item.title,
      branch: item.branch,
      category: item.category,
      isActive: item.isActive,
      modulesCount: item.modules?.length || 0,
      videosCount: (item.modules || []).reduce(
        (sum, module) => sum + (module.videos?.length || 0),
        0
      ),
      quizCount: item.quiz?.length || 0,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    }));

    return res.status(200).json({
      success: true,
      stats: {
        totalPrograms,
        activePrograms,
        inactivePrograms,
        totalModules,
        totalVideos,
        totalQuizQuestions,
      },
      recentInternships,
    });
  } catch (error) {
    console.error("GET ADMIN STATS ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch admin dashboard stats",
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
      slug,
      branch,
      category,
      description,
      thumbnail,
      image,
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

    if (!title || !branch || !description || !durations?.length) {
      return res.status(400).json({
        success: false,
        message: "Title, branch, description and durations are required",
      });
    }

    const cleanedDurations = Array.isArray(durations)
      ? durations
          .filter((d) => d.label && d.label.trim())
          .map((d, index) => ({
            label: d.label.trim(),
            price: Number(d.price || 0),
            durationDays: Number(d.durationDays || 30),
            order: Number(d.order || index + 1),
          }))
      : [];

    const cleanedModules = Array.isArray(modules)
      ? modules
          .filter((m) => m.title && m.title.trim())
          .map((m, index) => ({
            title: m.title.trim(),
            description: m.description?.trim() || "",
            unlockDay: Number(m.unlockDay || index + 1),
            order: Number(m.order || index + 1),
            videos: Array.isArray(m.videos)
              ? m.videos
                  .filter((v) => v.title && v.title.trim() && v.videoUrl && v.videoUrl.trim())
                  .map((v, vIndex) => ({
                    title: v.title.trim(),
                    description: v.description?.trim() || "",
                    videoUrl: v.videoUrl.trim(),
                    duration: v.duration?.trim() || "",
                    order: Number(v.order || vIndex + 1),
                  }))
              : [],
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
      slug: slug?.trim() || "",
      branch,
      category,
      description,
      thumbnail,
      image,
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
      slug,
      branch,
      category,
      description,
      thumbnail,
      image,
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

    const cleanedDurations = Array.isArray(durations)
      ? durations
          .filter((d) => d.label && d.label.trim())
          .map((d, index) => ({
            label: d.label.trim(),
            price: Number(d.price || 0),
            durationDays: Number(d.durationDays || 30),
            order: Number(d.order || index + 1),
          }))
      : internship.durations;

    const cleanedModules = Array.isArray(modules)
      ? modules
          .filter((m) => m.title && m.title.trim())
          .map((m, index) => ({
            title: m.title.trim(),
            description: m.description?.trim() || "",
            unlockDay: Number(m.unlockDay || index + 1),
            order: Number(m.order || index + 1),
            videos: Array.isArray(m.videos)
              ? m.videos
                  .filter((v) => v.title && v.title.trim() && v.videoUrl && v.videoUrl.trim())
                  .map((v, vIndex) => ({
                    title: v.title.trim(),
                    description: v.description?.trim() || "",
                    videoUrl: v.videoUrl.trim(),
                    duration: v.duration?.trim() || "",
                    order: Number(v.order || vIndex + 1),
                  }))
              : [],
          }))
      : internship.modules;

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
      : internship.quiz;

    internship.title = title;
    internship.slug = slug?.trim() || "";
    internship.branch = branch;
    internship.category = category;
    internship.description = description;
    internship.thumbnail = thumbnail;
    internship.image = image;
    internship.durations = cleanedDurations;
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