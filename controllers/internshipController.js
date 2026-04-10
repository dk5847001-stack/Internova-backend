const Internship = require("../models/Internship");
const InternshipContent = require("../models/InternshipContent");
const User = require("../models/User");
const Purchase = require("../models/Purchase");
const Certificate = require("../models/Certificate");
const TestResult = require("../models/TestResult");
const Progress = require("../models/Progress");
const { convertGoogleDriveToPreviewUrl } = require("../utils/googleDrive");
const {
  getInternshipContentByInternshipId,
  getInternshipContentMap,
  getInternshipContentSummaryMap,
  mergeInternshipWithContent,
  toIdString,
} = require("../utils/internshipContent");
const { isValidObjectId } = require("../utils/validation");

const INTERNSHIP_LIST_FIELDS = [
  "_id",
  "title",
  "slug",
  "branch",
  "category",
  "description",
  "thumbnail",
  "image",
  "durations",
  "isActive",
  "createdAt",
].join(" ");

const INTERNSHIP_DETAIL_FIELDS = "-__v";
const INTERNSHIP_ADMIN_FIELDS = "-__v";

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

  const convertedUrl = convertGoogleDriveToPreviewUrl(trimmedUrl);

  if (/^https?:\/\//i.test(convertedUrl)) {
    return convertedUrl;
  }

  return "";
};

const normalizeImageUrl = (url = "") => {
  const trimmedUrl = toTrimmedString(url);
  if (!trimmedUrl) return "";

  if (/^https?:\/\//i.test(trimmedUrl)) {
    return trimmedUrl;
  }

  if (/^data:image\/[a-zA-Z0-9.+-]+;base64,/i.test(trimmedUrl)) {
    return trimmedUrl;
  }

  return "";
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
    .filter(
      (module) => Array.isArray(module.videos) && module.videos.length > 0
    );
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
      correctAnswer: Math.min(
        3,
        Math.max(0, toNumber(question.correctAnswer, 0))
      ),
    }));
};

const buildSlug = (value = "") => {
  return toTrimmedString(value)
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
};

const sanitizeInternshipPayload = (body = {}) => {
  const cleanedDurations = sanitizeDurations(body.durations);
  const cleanedModules = sanitizeModules(body.modules);
  const cleanedQuiz = sanitizeQuiz(body.quiz);

  const title = toTrimmedString(body.title);
  const slug = toTrimmedString(body.slug) || buildSlug(title);

  return {
    title,
    slug,
    branch: toTrimmedString(body.branch),
    category: toTrimmedString(body.category),
    description: toTrimmedString(body.description),
    thumbnail: normalizeImageUrl(body.thumbnail),
    image: normalizeImageUrl(body.image),
    durations: cleanedDurations,
    modules: cleanedModules,
    quiz: cleanedQuiz,
    requiredProgress: Math.min(
      100,
      Math.max(1, toNumber(body.requiredProgress, 80))
    ),
    miniTestUnlockProgress: Math.min(
      100,
      Math.max(1, toNumber(body.miniTestUnlockProgress, 80))
    ),
    miniTestPassMarks: Math.min(
      100,
      Math.max(1, toNumber(body.miniTestPassMarks, 60))
    ),
    unlockAllPrice: Math.max(0, toNumber(body.unlockAllPrice, 99)),
    certificateEnabled:
      typeof body.certificateEnabled === "boolean"
        ? body.certificateEnabled
        : true,
    isActive: typeof body.isActive === "boolean" ? body.isActive : true,
  };
};

const validateInternshipPayload = (payload) => {
  if (!payload.title || !payload.branch || !payload.description) {
    return "Title, branch and description are required";
  }

  if (!payload.category) {
    return "Category is required";
  }

  if (!payload.durations.length) {
    return "At least one valid duration is required";
  }

  if (!payload.modules.length) {
    return "At least one valid module with video is required";
  }

  return null;
};

const buildInternshipSummaryPayload = (payload) => {
  const firstDuration = payload.durations[0] || {};

  return {
    title: payload.title,
    slug: payload.slug,
    branch: payload.branch,
    category: payload.category,
    description: payload.description,
    thumbnail: payload.thumbnail,
    image: payload.image,
    duration: firstDuration.label || "",
    durationDays: firstDuration.durationDays || 30,
    price: firstDuration.price || 0,
    durations: payload.durations,
    requiredProgress: payload.requiredProgress,
    miniTestUnlockProgress: payload.miniTestUnlockProgress,
    miniTestPassMarks: payload.miniTestPassMarks,
    unlockAllPrice: payload.unlockAllPrice,
    certificateEnabled: payload.certificateEnabled,
    isActive: payload.isActive,
  };
};

const buildInternshipContentPayload = (payload) => ({
  modules: payload.modules,
  quiz: payload.quiz,
});

const getContentSummary = (summaryMap, internshipId) => {
  return (
    summaryMap.get(toIdString(internshipId)) || {
      modulesCount: 0,
      videosCount: 0,
      quizCount: 0,
    }
  );
};

// PUBLIC LIST
exports.getAllInternships = async (req, res) => {
  const requestStartedAt = Date.now();

  try {
    const queryStartedAt = Date.now();

    // Listing cards only need lightweight summary fields.
    const internships = await Internship.find({ isActive: true })
      .select(INTERNSHIP_LIST_FIELDS)
      .sort({ createdAt: -1 })
      .lean();

    const queryDurationMs = Date.now() - queryStartedAt;
    const totalRequestMs = Date.now() - requestStartedAt;

    console.log(
      `[PERF] GET /api/internships db=${queryDurationMs}ms total=${totalRequestMs}ms count=${internships.length}`
    );

    return res.status(200).json({
      success: true,
      count: internships.length,
      internships,
    });
  } catch (error) {
    console.error("GET INTERNSHIPS ERROR:", error);
    console.log(
      `[PERF] GET /api/internships failed total=${Date.now() - requestStartedAt}ms`
    );
    return res.status(500).json({
      success: false,
      message: "Failed to fetch programs",
    });
  }
};

// ADMIN LIST
exports.getAllInternshipsAdmin = async (req, res) => {
  try {
    const internships = await Internship.find({})
      .select(INTERNSHIP_ADMIN_FIELDS)
      .sort({ _id: -1 })
      .lean();

    const contentMap = await getInternshipContentMap(
      internships.map((item) => item._id)
    );

    const mergedInternships = internships.map((item) =>
      mergeInternshipWithContent(item, contentMap.get(toIdString(item._id)))
    );

    return res.status(200).json({
      success: true,
      count: mergedInternships.length,
      internships: mergedInternships,
    });
  } catch (error) {
    console.error("GET ADMIN INTERNSHIPS ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch admin internships",
    });
  }
};

// ADMIN DASHBOARD STATS
exports.getAdminInternshipStats = async (req, res) => {
  try {
    const [
      internships,
      users,
      purchases,
      certificates,
      passedResults,
      progresses,
    ] = await Promise.all([
      Internship.find({})
        .select("title branch category isActive createdAt updatedAt")
        .sort({ _id: -1 })
        .lean(),
      User.find({})
        .select("name email role createdAt lastLoginAt isActive")
        .sort({ _id: -1 })
        .lean(),
      Purchase.find({})
        .populate("userId", "name email role lastLoginAt isActive createdAt")
        .populate("internshipId", "title branch category")
        .sort({ _id: -1 })
        .lean(),
      Certificate.find({ status: "issued" })
        .select("userId internshipId certificateId issuedAt status")
        .lean(),
      TestResult.find({ passed: true })
        .select("userId internshipId percentage passed submittedAt")
        .lean(),
      Progress.find({})
        .select(
          "userId internshipId overallProgress miniTestPassed certificateEligible completedDays durationCompleted unlockAllPurchased updatedAt"
        )
        .lean(),
    ]);

    const contentSummaryMap = await getInternshipContentSummaryMap(
      internships.map((item) => item._id)
    );

    const totalPrograms = internships.length;
    const activePrograms = internships.filter((item) => item.isActive).length;
    const inactivePrograms = totalPrograms - activePrograms;

    const totalModules = internships.reduce((sum, item) => {
      return sum + getContentSummary(contentSummaryMap, item._id).modulesCount;
    }, 0);

    const totalVideos = internships.reduce((sum, item) => {
      return sum + getContentSummary(contentSummaryMap, item._id).videosCount;
    }, 0);

    const totalQuizQuestions = internships.reduce((sum, item) => {
      return sum + getContentSummary(contentSummaryMap, item._id).quizCount;
    }, 0);

    const totalUsers = users.length;
    const totalAdmins = users.filter((user) => user.role === "admin").length;
    const totalNormalUsers = totalUsers - totalAdmins;
    const activeUsers = users.filter((user) => user.isActive !== false).length;
    const recentlyLoggedInUsers = users.filter((user) => !!user.lastLoginAt).length;

    const totalPurchases = purchases.length;
    const paidPurchases = purchases.filter(
      (purchase) => purchase.paymentStatus === "paid"
    ).length;
    const failedPurchases = purchases.filter(
      (purchase) => purchase.paymentStatus === "failed"
    ).length;

    const totalCertificatesIssued = certificates.length;
    const totalQuizPassed = passedResults.length;

    const progressMap = new Map(
      progresses.map((progress) => [
        `${String(progress.userId)}_${String(progress.internshipId)}`,
        progress,
      ])
    );

    const certificateMap = new Map(
      certificates.map((certificate) => [
        `${String(certificate.userId)}_${String(certificate.internshipId)}`,
        certificate,
      ])
    );

    const passedQuizMap = new Map(
      passedResults.map((result) => [
        `${String(result.userId)}_${String(result.internshipId)}`,
        result,
      ])
    );

    const purchaseCountByUser = purchases.reduce((acc, purchase) => {
      const userId = String(purchase.userId?._id || purchase.userId || "");
      if (userId) acc[userId] = (acc[userId] || 0) + 1;
      return acc;
    }, {});

    const certificateCountByUser = certificates.reduce((acc, certificate) => {
      const userId = String(certificate.userId || "");
      if (userId) acc[userId] = (acc[userId] || 0) + 1;
      return acc;
    }, {});

    const recentInternships = internships.slice(0, 6).map((item) => {
      const contentSummary = getContentSummary(contentSummaryMap, item._id);

      return {
        _id: item._id,
        title: item.title,
        branch: item.branch,
        category: item.category,
        isActive: item.isActive,
        modulesCount: contentSummary.modulesCount,
        videosCount: contentSummary.videosCount,
        quizCount: contentSummary.quizCount,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      };
    });

    const recentUsers = users.slice(0, 8).map((user) => ({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: typeof user.isActive === "boolean" ? user.isActive : true,
      lastLoginAt: user.lastLoginAt || null,
      createdAt: user.createdAt,
      purchasesCount: purchaseCountByUser[String(user._id)] || 0,
      certificatesCount: certificateCountByUser[String(user._id)] || 0,
    }));

    const recentPurchases = purchases.slice(0, 10).map((purchase) => {
      const userId = String(purchase.userId?._id || "");
      const internshipId = String(purchase.internshipId?._id || "");
      const joinKey = `${userId}_${internshipId}`;

      const progress = progressMap.get(joinKey);
      const certificate = certificateMap.get(joinKey);
      const passedQuiz = passedQuizMap.get(joinKey);

      return {
        _id: purchase._id,
        user: {
          _id: purchase.userId?._id || null,
          name: purchase.userId?.name || "Unknown User",
          email: purchase.userId?.email || "",
          role: purchase.userId?.role || "user",
          lastLoginAt: purchase.userId?.lastLoginAt || null,
          isActive:
            typeof purchase.userId?.isActive === "boolean"
              ? purchase.userId.isActive
              : true,
        },
        internship: {
          _id: purchase.internshipId?._id || null,
          title: purchase.internshipId?.title || "Unknown Internship",
          branch: purchase.internshipId?.branch || "",
          category: purchase.internshipId?.category || "",
        },
        durationLabel: purchase.durationLabel || "",
        selectedDurationDays: purchase.selectedDurationDays || 0,
        amount: purchase.amount || 0,
        paymentStatus: purchase.paymentStatus || "created",
        createdAt: purchase.createdAt,
        progress: {
          overallProgress: progress?.overallProgress || 0,
          miniTestPassed: !!progress?.miniTestPassed,
          certificateEligible: !!progress?.certificateEligible,
          durationCompleted: !!progress?.durationCompleted,
          completedDays: progress?.completedDays || 0,
          unlockAllPurchased: !!progress?.unlockAllPurchased,
        },
        certificate: certificate
          ? {
              certificateId: certificate.certificateId,
              issuedAt: certificate.issuedAt,
              status: certificate.status,
            }
          : null,
        quiz: {
          passed: !!passedQuiz?.passed || !!progress?.miniTestPassed,
          percentage: passedQuiz?.percentage || 0,
          submittedAt: passedQuiz?.submittedAt || null,
        },
      };
    });

    return res.status(200).json({
      success: true,
      stats: {
        totalPrograms,
        activePrograms,
        inactivePrograms,
        totalModules,
        totalVideos,
        totalQuizQuestions,
        totalUsers,
        totalAdmins,
        totalNormalUsers,
        activeUsers,
        recentlyLoggedInUsers,
        totalPurchases,
        paidPurchases,
        failedPurchases,
        totalCertificatesIssued,
        totalQuizPassed,
      },
      recentInternships,
      recentUsers,
      recentPurchases,
    });
  } catch (error) {
    console.error("GET ADMIN STATS ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch admin dashboard stats",
    });
  }
};

// SINGLE
exports.getSingleInternship = async (req, res) => {
  const requestStartedAt = Date.now();

  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid internship ID",
      });
    }

    const queryStartedAt = Date.now();

    // Details fetch summary + heavy content only when needed.
    const [internship, content] = await Promise.all([
      Internship.findById(req.params.id).select(INTERNSHIP_DETAIL_FIELDS).lean(),
      getInternshipContentByInternshipId(req.params.id),
    ]);

    const queryDurationMs = Date.now() - queryStartedAt;
    const totalRequestMs = Date.now() - requestStartedAt;

    if (!internship) {
      console.log(
        `[PERF] GET /api/internships/:id db=${queryDurationMs}ms total=${totalRequestMs}ms found=0`
      );
      return res.status(404).json({
        success: false,
        message: "Internship not found",
      });
    }

    const mergedInternship = mergeInternshipWithContent(internship, content);

    console.log(
      `[PERF] GET /api/internships/:id db=${queryDurationMs}ms total=${totalRequestMs}ms found=1`
    );

    return res.status(200).json({
      success: true,
      internship: mergedInternship,
    });
  } catch (error) {
    console.error("GET SINGLE INTERNSHIP ERROR:", error);
    console.log(
      `[PERF] GET /api/internships/:id failed total=${Date.now() - requestStartedAt}ms`
    );
    return res.status(500).json({
      success: false,
      message: "Failed to fetch internship details",
    });
  }
};

// CREATE
exports.createInternship = async (req, res) => {
  try {
    const payload = sanitizeInternshipPayload(req.body);
    const validationError = validateInternshipPayload(payload);

    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError,
      });
    }

    const existingSlug = await Internship.findOne({ slug: payload.slug })
      .select("_id")
      .lean();

    if (existingSlug) {
      return res.status(400).json({
        success: false,
        message: "An internship with this slug already exists",
      });
    }

    const internship = await Internship.create(
      buildInternshipSummaryPayload(payload)
    );

    try {
      await InternshipContent.create({
        internshipId: internship._id,
        ...buildInternshipContentPayload(payload),
      });
    } catch (contentError) {
      await Internship.findByIdAndDelete(internship._id);
      throw contentError;
    }

    return res.status(201).json({
      success: true,
      message: "Internship created successfully",
      internship: mergeInternshipWithContent(
        internship.toObject(),
        buildInternshipContentPayload(payload)
      ),
    });
  } catch (error) {
    console.error("CREATE INTERNSHIP ERROR:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to create internship",
    });
  }
};

// UPDATE
exports.updateInternship = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid internship ID",
      });
    }

    const internship = await Internship.findById(req.params.id);

    if (!internship) {
      return res.status(404).json({
        success: false,
        message: "Internship not found",
      });
    }

    const payload = sanitizeInternshipPayload(req.body);
    const validationError = validateInternshipPayload(payload);

    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError,
      });
    }

    const existingSlug = await Internship.findOne({
      slug: payload.slug,
      _id: { $ne: req.params.id },
    })
      .select("_id")
      .lean();

    if (existingSlug) {
      return res.status(400).json({
        success: false,
        message: "Another internship with this slug already exists",
      });
    }

    Object.assign(internship, buildInternshipSummaryPayload(payload));
    await internship.save();

    await InternshipContent.findOneAndUpdate(
      { internshipId: internship._id },
      {
        $set: buildInternshipContentPayload(payload),
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      }
    );

    return res.status(200).json({
      success: true,
      message: "Internship updated successfully",
      internship: mergeInternshipWithContent(
        internship.toObject(),
        buildInternshipContentPayload(payload)
      ),
    });
  } catch (error) {
    console.error("UPDATE INTERNSHIP ERROR:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to update internship",
    });
  }
};

// DELETE
exports.deleteInternship = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid internship ID",
      });
    }

    const internship = await Internship.findById(req.params.id).select("_id");

    if (!internship) {
      return res.status(404).json({
        success: false,
        message: "Internship not found",
      });
    }

    await Promise.all([
      Internship.findByIdAndDelete(req.params.id),
      InternshipContent.deleteOne({ internshipId: req.params.id }),
    ]);

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
