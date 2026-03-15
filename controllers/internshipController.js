const Internship = require("../models/Internship");
const { convertGoogleDriveToPreviewUrl } = require("../utils/googleDrive");

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toTrimmedString = (value) => {
  return typeof value === "string" ? value.trim() : "";
};

const normalizeVideoUrl = (url = "") => {
  const trimmedUrl = toTrimmedString(url);
  if (!trimmedUrl) return "";
  return convertGoogleDriveToPreviewUrl(trimmedUrl);
};

const sanitizeDurations = (durations = []) => {
  if (!Array.isArray(durations)) return [];

  return durations
    .filter((duration) => toTrimmedString(duration?.label))
    .map((duration, index) => ({
      label: toTrimmedString(duration.label),
      price: toNumber(duration.price, 0),
      durationDays: toNumber(duration.durationDays, 30),
      order: toNumber(duration.order, index + 1),
    }));
};

const sanitizeModules = (modules = []) => {
  if (!Array.isArray(modules)) return [];

  return modules
    .filter((module) => toTrimmedString(module?.title))
    .map((module, index) => ({
      title: toTrimmedString(module.title),
      description: toTrimmedString(module.description),
      unlockDay: toNumber(module.unlockDay, index + 1),
      order: toNumber(module.order, index + 1),
      videos: Array.isArray(module.videos)
        ? module.videos
            .filter(
              (video) =>
                toTrimmedString(video?.title) &&
                toTrimmedString(video?.videoUrl)
            )
            .map((video, videoIndex) => ({
              title: toTrimmedString(video.title),
              description: toTrimmedString(video.description),
              videoUrl: normalizeVideoUrl(video.videoUrl),
              duration: toTrimmedString(video.duration),
              order: toNumber(video.order, videoIndex + 1),
            }))
            .filter((video) => video.videoUrl)
        : [],
    }))
    .filter((module) => Array.isArray(module.videos) && module.videos.length > 0);
};

const sanitizeQuiz = (quiz = []) => {
  if (!Array.isArray(quiz)) return [];

  return quiz
    .filter(
      (question) =>
        toTrimmedString(question?.question) &&
        Array.isArray(question?.options) &&
        question.options.length === 4 &&
        question.options.every((option) => toTrimmedString(option) !== "")
    )
    .map((question) => ({
      question: toTrimmedString(question.question),
      options: question.options.map((option) => toTrimmedString(option)),
      correctAnswer: Math.min(3, Math.max(0, toNumber(question.correctAnswer, 0))),
    }));
};

const sanitizeInternshipPayload = (body = {}) => {
  const cleanedDurations = sanitizeDurations(body.durations);
  const cleanedModules = sanitizeModules(body.modules);
  const cleanedQuiz = sanitizeQuiz(body.quiz);

  return {
    title: toTrimmedString(body.title),
    slug: toTrimmedString(body.slug),
    branch: toTrimmedString(body.branch),
    category: toTrimmedString(body.category),
    description: toTrimmedString(body.description),
    thumbnail: toTrimmedString(body.thumbnail),
    image: toTrimmedString(body.image),
    durations: cleanedDurations,
    modules: cleanedModules,
    quiz: cleanedQuiz,
    requiredProgress: toNumber(body.requiredProgress, 80),
    miniTestUnlockProgress: toNumber(body.miniTestUnlockProgress, 80),
    miniTestPassMarks: toNumber(body.miniTestPassMarks, 60),
    unlockAllPrice: toNumber(body.unlockAllPrice, 99),
    certificateEnabled:
      typeof body.certificateEnabled === "boolean" ? body.certificateEnabled : true,
    isActive: typeof body.isActive === "boolean" ? body.isActive : true,
  };
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
    const payload = sanitizeInternshipPayload(req.body);

    if (!payload.title || !payload.branch || !payload.description) {
      return res.status(400).json({
        success: false,
        message: "Title, branch and description are required",
      });
    }

    if (!payload.category) {
      return res.status(400).json({
        success: false,
        message: "Category is required",
      });
    }

    if (!payload.durations.length) {
      return res.status(400).json({
        success: false,
        message: "At least one valid duration is required",
      });
    }

    if (!payload.modules.length) {
      return res.status(400).json({
        success: false,
        message: "At least one valid module with video is required",
      });
    }

    const internship = await Internship.create({
      title: payload.title,
      slug: payload.slug || "",
      branch: payload.branch,
      category: payload.category,
      description: payload.description,
      thumbnail: payload.thumbnail,
      image: payload.image,
      durations: payload.durations,
      modules: payload.modules,
      quiz: payload.quiz,
      requiredProgress: payload.requiredProgress,
      miniTestUnlockProgress: payload.miniTestUnlockProgress,
      miniTestPassMarks: payload.miniTestPassMarks,
      unlockAllPrice: payload.unlockAllPrice,
      certificateEnabled: payload.certificateEnabled,
      isActive: payload.isActive,
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

    const payload = sanitizeInternshipPayload(req.body);

    if (!payload.title || !payload.branch || !payload.description) {
      return res.status(400).json({
        success: false,
        message: "Title, branch and description are required",
      });
    }

    if (!payload.category) {
      return res.status(400).json({
        success: false,
        message: "Category is required",
      });
    }

    if (!payload.durations.length) {
      return res.status(400).json({
        success: false,
        message: "At least one valid duration is required",
      });
    }

    if (!payload.modules.length) {
      return res.status(400).json({
        success: false,
        message: "At least one valid module with video is required",
      });
    }

    internship.title = payload.title;
    internship.slug = payload.slug || "";
    internship.branch = payload.branch;
    internship.category = payload.category;
    internship.description = payload.description;
    internship.thumbnail = payload.thumbnail;
    internship.image = payload.image;
    internship.durations = payload.durations;
    internship.modules = payload.modules;
    internship.quiz = payload.quiz;
    internship.requiredProgress = payload.requiredProgress;
    internship.miniTestUnlockProgress = payload.miniTestUnlockProgress;
    internship.miniTestPassMarks = payload.miniTestPassMarks;
    internship.unlockAllPrice = payload.unlockAllPrice;
    internship.certificateEnabled = payload.certificateEnabled;
    internship.isActive = payload.isActive;

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

// DELETE internship
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