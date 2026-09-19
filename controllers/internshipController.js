const Internship = require("../models/Internship");
const User = require("../models/User");
const Purchase = require("../models/Purchase");
const Certificate = require("../models/Certificate");
const TestResult = require("../models/TestResult");
const Progress = require("../models/Progress");
const { convertGoogleDriveToPreviewUrl } = require("../utils/googleDrive");
const { isValidObjectId } = require("../utils/validation");

const PUBLIC_INTERNSHIP_FIELDS = [
  "_id",
  "title",
  "slug",
  "branch",
  "category",
  "description",
  "thumbnail",
  "image",
  "duration",
  "durationDays",
  "price",
  "durations",
  "modules",
  "quiz",
  "requiredProgress",
  "miniTestUnlockProgress",
  "miniTestPassMarks",
  "unlockAllPrice",
  "certificateEnabled",
  "isActive",
  "createdAt",
  "updatedAt",
].join(" ");

const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const PLACEHOLDER_PATTERNS = [
  /^n\/a$/i,
  /^na$/i,
  /^tbd$/i,
  /^test$/i,
  /^coming soon$/i,
  /^lorem ipsum/i,
];

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const sortByOrder = (items = []) => {
  return [...items].sort((a, b) => toNumber(a?.order, 0) - toNumber(b?.order, 0));
};

const toTrimmedString = (value) => {
  return typeof value === "string" ? value.trim() : "";
};

const normalizeWhitespace = (value = "") => {
  return toTrimmedString(value).replace(/\s+/g, " ");
};

const hasMeaningfulText = (value, { minLength = 1 } = {}) => {
  const text = normalizeWhitespace(value);
  if (text.length < minLength) return false;

  const lowered = text.toLowerCase();
  if (PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(lowered))) return false;

  return /[a-z0-9]/i.test(text);
};

const isValidSlug = (value = "") => {
  return SLUG_REGEX.test(toTrimmedString(value));
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
      durationDays: Math.max(1, toNumber(duration.durationDays, 30)),
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

const buildSlug = (value = "") => {
  return toTrimmedString(value)
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
};

const sanitizeSlug = (value = "") => {
  const candidate = toTrimmedString(value).toLowerCase();
  return candidate ? buildSlug(candidate) : "";
};

const uniqueLowercaseValues = (values = []) => {
  const cleaned = values
    .map((value) => normalizeWhitespace(value).toLowerCase())
    .filter(Boolean);

  return new Set(cleaned).size === cleaned.length;
};

const validatePublicReadiness = (payload = {}) => {
  const errors = [];

  if (!hasMeaningfulText(payload.title, { minLength: 6 })) {
    errors.push("Program title must be meaningful");
  }

  if (!isValidSlug(payload.slug)) {
    errors.push("Program slug must contain only lowercase letters, numbers and hyphens");
  }

  if (!hasMeaningfulText(payload.branch, { minLength: 2 })) {
    errors.push("Program branch is required");
  }

  if (!hasMeaningfulText(payload.category, { minLength: 2 })) {
    errors.push("Program category is required");
  }

  if (!hasMeaningfulText(payload.description, { minLength: 120 })) {
    errors.push("Program description must be at least 120 meaningful characters");
  }

  if (!Array.isArray(payload.durations) || !payload.durations.length) {
    errors.push("At least one valid duration is required");
  } else {
    const hasInvalidDuration = payload.durations.some(
      (duration) =>
        !hasMeaningfulText(duration?.label, { minLength: 2 }) ||
        toNumber(duration?.durationDays, 0) < 1 ||
        toNumber(duration?.price, -1) < 0
    );

    if (hasInvalidDuration) {
      errors.push("Each duration must have a valid label, non-negative price and at least 1 day");
    }
  }

  if (!Array.isArray(payload.modules) || !payload.modules.length) {
    errors.push("At least one module with useful metadata is required");
  } else {
    if (!uniqueLowercaseValues(payload.modules.map((module) => module?.title))) {
      errors.push("Module titles must be unique");
    }

    payload.modules.forEach((module, moduleIndex) => {
      const moduleLabel = `Module ${moduleIndex + 1}`;

      if (!hasMeaningfulText(module?.title, { minLength: 4 })) {
        errors.push(`${moduleLabel} title must be meaningful`);
      }

      if (!hasMeaningfulText(module?.description, { minLength: 30 })) {
        errors.push(`${moduleLabel} description must be at least 30 meaningful characters`);
      }

      const videos = Array.isArray(module?.videos) ? module.videos : [];
      if (!videos.length) {
        errors.push(`${moduleLabel} must include at least one video`);
        return;
      }

      if (!uniqueLowercaseValues(videos.map((video) => video?.title))) {
        errors.push(`${moduleLabel} video titles must be unique`);
      }

      videos.forEach((video, videoIndex) => {
        const videoLabel = `${moduleLabel} video ${videoIndex + 1}`;
        if (!hasMeaningfulText(video?.title, { minLength: 4 })) {
          errors.push(`${videoLabel} title must be meaningful`);
        }
        if (!hasMeaningfulText(video?.description, { minLength: 12 })) {
          errors.push(`${videoLabel} description must be at least 12 meaningful characters`);
        }
        if (!hasMeaningfulText(video?.duration, { minLength: 2 })) {
          errors.push(`${videoLabel} duration is required`);
        }
      });
    });
  }

  const quizItems = Array.isArray(payload.quiz) ? payload.quiz : [];
  if (quizItems.length) {
    const hasInvalidQuiz = quizItems.some(
      (question) =>
        !hasMeaningfulText(question?.question, { minLength: 8 }) ||
        !Array.isArray(question?.options) ||
        question.options.length !== 4 ||
        question.options.some((option) => !hasMeaningfulText(option, { minLength: 1 }))
    );

    if (hasInvalidQuiz) {
      errors.push("Quiz questions must include meaningful question text and 4 valid options");
    }
  }

  if (payload.certificateEnabled && !quizItems.length) {
    errors.push(
      "Certificate eligibility requires an assessment quiz because certificate rules depend on quiz pass status"
    );
  }

  if (
    toNumber(payload.requiredProgress, 0) < 1 ||
    toNumber(payload.requiredProgress, 0) > 100
  ) {
    errors.push("Required progress must be between 1 and 100");
  }

  if (
    toNumber(payload.miniTestUnlockProgress, 0) < 1 ||
    toNumber(payload.miniTestUnlockProgress, 0) > 100
  ) {
    errors.push("Mini test unlock progress must be between 1 and 100");
  }

  if (
    toNumber(payload.miniTestPassMarks, 0) < 1 ||
    toNumber(payload.miniTestPassMarks, 0) > 100
  ) {
    errors.push("Mini test pass marks must be between 1 and 100");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

const resolveSupportInfo = () => {
  const supportEmail = toTrimmedString(
    process.env.SUPPORT_EMAIL || process.env.CONTACT_EMAIL || ""
  ).toLowerCase();

  const frontendOriginRaw = toTrimmedString(
    process.env.FRONTEND_ORIGIN || process.env.FRONTEND_URL || process.env.CLIENT_URL || ""
  );

  let frontendOrigin = "";
  if (frontendOriginRaw) {
    try {
      frontendOrigin = new URL(frontendOriginRaw).origin;
    } catch (error) {
      frontendOrigin = "";
    }
  }

  return {
    supportEmail: supportEmail || null,
    supportPath: "/contact",
    supportUrl: frontendOrigin ? `${frontendOrigin}/contact` : null,
  };
};

const toPublicDuration = (duration = {}, index = 0) => ({
  label: toTrimmedString(duration.label),
  price: Math.max(0, toNumber(duration.price, 0)),
  durationDays: Math.max(1, toNumber(duration.durationDays, 30)),
  order: toNumber(duration.order, index + 1),
});

const toPublicModule = (module = {}, moduleIndex = 0) => {
  const videos = Array.isArray(module.videos) ? sortByOrder(module.videos) : [];
  const safeVideos = videos.map((video, videoIndex) => ({
    _id: video._id,
    title: toTrimmedString(video.title),
    description: toTrimmedString(video.description),
    duration: toTrimmedString(video.duration),
    order: toNumber(video.order, videoIndex + 1),
  }));

  return {
    _id: module._id,
    title: toTrimmedString(module.title),
    description: toTrimmedString(module.description),
    unlockDay: Math.max(1, toNumber(module.unlockDay, moduleIndex + 1)),
    order: toNumber(module.order, moduleIndex + 1),
    videos: safeVideos,
  };
};

const isInternshipPublicReady = (internship = {}) => {
  if (!internship?.isActive) {
    return { valid: false, errors: ["Program is not active"] };
  }

  return validatePublicReadiness(internship);
};

const toPublicInternshipListItem = (internship = {}) => {
  const durations = Array.isArray(internship.durations) ? internship.durations : [];
  const normalizedDurations = durations.map((duration, index) =>
    toPublicDuration(duration, index)
  );
  const fallbackDuration = {
    label: toTrimmedString(internship.duration),
    price: Math.max(0, toNumber(internship.price, 0)),
    durationDays: Math.max(1, toNumber(internship.durationDays, 30)),
    order: 1,
  };

  return {
    _id: internship._id,
    title: internship.title,
    slug: internship.slug,
    branch: internship.branch,
    category: internship.category,
    description: internship.description,
    thumbnail: internship.thumbnail || internship.image || "",
    image: internship.image || internship.thumbnail || "",
    durations: normalizedDurations.length ? normalizedDurations : [fallbackDuration],
    createdAt: internship.createdAt,
    updatedAt: internship.updatedAt,
  };
};

const toPublicInternshipDetail = (internship = {}) => {
  const durations = Array.isArray(internship.durations) ? internship.durations : [];
  const normalizedDurations = sortByOrder(durations).map((duration, index) =>
    toPublicDuration(duration, index)
  );
  const fallbackDuration = {
    label: toTrimmedString(internship.duration),
    price: Math.max(0, toNumber(internship.price, 0)),
    durationDays: Math.max(1, toNumber(internship.durationDays, 30)),
    order: 1,
  };
  const modules = Array.isArray(internship.modules)
    ? sortByOrder(internship.modules)
    : [];
  const normalizedModules = modules.map((module, moduleIndex) =>
    toPublicModule(module, moduleIndex)
  );
  const quiz = Array.isArray(internship.quiz) ? internship.quiz : [];
  const support = resolveSupportInfo();

  return {
    _id: internship._id,
    title: internship.title,
    slug: internship.slug,
    branch: internship.branch,
    category: internship.category,
    description: internship.description,
    thumbnail: internship.thumbnail || internship.image || "",
    image: internship.image || internship.thumbnail || "",
    durations: normalizedDurations.length ? normalizedDurations : [fallbackDuration],
    modules: normalizedModules,
    assessment: {
      hasQuiz: quiz.length > 0,
      quizQuestionCount: quiz.length,
      miniTestUnlockProgress: toNumber(internship.miniTestUnlockProgress, 80),
      miniTestPassMarks: toNumber(internship.miniTestPassMarks, 60),
    },
    certificate: {
      enabled:
        typeof internship.certificateEnabled === "boolean"
          ? internship.certificateEnabled
          : true,
      requiredProgress: toNumber(internship.requiredProgress, 80),
      requiresQuizPass: quiz.length > 0,
      requiresDurationCompletion: true,
    },
    pricing: {
      unlockAllPrice: Math.max(0, toNumber(internship.unlockAllPrice, 99)),
    },
    support,
    updatedAt: internship.updatedAt,
    createdAt: internship.createdAt,
  };
};

const sanitizeInternshipPayload = (body = {}) => {
  const cleanedDurations = sanitizeDurations(body.durations);
  const cleanedModules = sanitizeModules(body.modules);
  const cleanedQuiz = sanitizeQuiz(body.quiz);

  const title = normalizeWhitespace(body.title);
  const slug = sanitizeSlug(body.slug) || buildSlug(title);

  return {
    title,
    slug,
    branch: normalizeWhitespace(body.branch),
    category: normalizeWhitespace(body.category),
    description: toTrimmedString(body.description),
    thumbnail: normalizeImageUrl(body.thumbnail),
    image: normalizeImageUrl(body.image),
    durations: cleanedDurations,
    modules: cleanedModules,
    quiz: cleanedQuiz,
    requiredProgress: Math.min(100, Math.max(1, toNumber(body.requiredProgress, 80))),
    miniTestUnlockProgress: Math.min(
      100,
      Math.max(1, toNumber(body.miniTestUnlockProgress, 80))
    ),
    miniTestPassMarks: Math.min(100, Math.max(1, toNumber(body.miniTestPassMarks, 60))),
    unlockAllPrice: Math.max(0, toNumber(body.unlockAllPrice, 99)),
    certificateEnabled:
      typeof body.certificateEnabled === "boolean" ? body.certificateEnabled : true,
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

  if (!isValidSlug(payload.slug)) {
    return "Program slug is required and must use lowercase letters, numbers and hyphens only";
  }

  const readinessCheck = validatePublicReadiness(payload);
  if (payload.isActive && !readinessCheck.valid) {
    return readinessCheck.errors[0] || "Program data is not ready for public publishing";
  }

  return null;
};

// PUBLIC LIST
exports.getAllInternships = async (req, res) => {
  const requestStartedAt = Date.now();

  try {
    const queryStartedAt = Date.now();

    // Listing cards only need lightweight fields, not full course content.
    const internships = await Internship.find({ isActive: true })
      .select(PUBLIC_INTERNSHIP_FIELDS)
      .sort({ createdAt: -1 })
      .lean();

    const publicInternships = internships
      .filter((internship) => isInternshipPublicReady(internship).valid)
      .map((internship) => toPublicInternshipListItem(internship));

    const queryDurationMs = Date.now() - queryStartedAt;
    const totalRequestMs = Date.now() - requestStartedAt;

    console.log(
      `[PERF] GET /api/internships db=${queryDurationMs}ms total=${totalRequestMs}ms count=${publicInternships.length}`
    );

    return res.status(200).json({
      success: true,
      count: publicInternships.length,
      internships: publicInternships,
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

const respondWithPublicInternshipDetail = (internship, res) => {
  if (!internship || !internship.isActive) {
    return res.status(404).json({
      success: false,
      message: "Program not found",
    });
  }

  const readinessCheck = isInternshipPublicReady(internship);
  if (!readinessCheck.valid) {
    return res.status(404).json({
      success: false,
      message: "Program not available for public viewing",
    });
  }

  return res.status(200).json({
    success: true,
    internship: toPublicInternshipDetail(internship),
  });
};

// ADMIN LIST
exports.getAllInternshipsAdmin = async (req, res) => {
  try {
    const internships = await Internship.find({})
      .select("-__v")
      .sort({ _id: -1 })
      .lean();

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
        .select("title branch category isActive modules quiz createdAt updatedAt")
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
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid internship ID",
      });
    }

    const internship = await Internship.findById(req.params.id)
      .select(PUBLIC_INTERNSHIP_FIELDS)
      .lean();

    return respondWithPublicInternshipDetail(internship, res);
  } catch (error) {
    console.error("GET SINGLE INTERNSHIP ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch internship details",
    });
  }
};

exports.getPublicInternshipBySlug = async (req, res) => {
  try {
    const slug = sanitizeSlug(req.params.slug || "");

    if (!isValidSlug(slug)) {
      return res.status(400).json({
        success: false,
        message: "Invalid program slug",
      });
    }

    const internship = await Internship.findOne({ slug, isActive: true })
      .select(PUBLIC_INTERNSHIP_FIELDS)
      .lean();

    if (!internship) {
      return res.status(404).json({
        success: false,
        message: "Program not found",
      });
    }

    return respondWithPublicInternshipDetail(internship, res);
  } catch (error) {
    console.error("GET SINGLE INTERNSHIP BY SLUG ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch internship details",
    });
  }
};

exports.getInternshipsSitemap = async (_req, res) => {
  try {
    const frontendOriginRaw = toTrimmedString(
      process.env.FRONTEND_ORIGIN || process.env.FRONTEND_URL || process.env.CLIENT_URL || ""
    );

    let frontendOrigin = "";
    try {
      frontendOrigin = frontendOriginRaw ? new URL(frontendOriginRaw).origin : "";
    } catch (error) {
      frontendOrigin = "";
    }

    if (!frontendOrigin) {
      return res.status(503).json({
        success: false,
        message:
          "Sitemap unavailable: set FRONTEND_ORIGIN (or FRONTEND_URL/CLIENT_URL) to your canonical public site origin.",
      });
    }

    const pathTemplateRaw = toTrimmedString(
      process.env.PUBLIC_PROGRAM_PATH_TEMPLATE || "/internships/:slug"
    );
    const pathTemplate = pathTemplateRaw.startsWith("/")
      ? pathTemplateRaw
      : `/${pathTemplateRaw}`;

    const internships = await Internship.find({
      isActive: true,
      slug: { $ne: "" },
    })
      .select("slug updatedAt isActive title branch category description durations modules quiz requiredProgress miniTestUnlockProgress miniTestPassMarks certificateEnabled")
      .sort({ updatedAt: -1 })
      .lean();

    const entries = internships.filter((internship) => isInternshipPublicReady(internship).valid);
    const urls = entries
      .map((internship) => {
        const safeSlug = sanitizeSlug(internship.slug);
        if (!safeSlug) return null;

        const path = pathTemplate.replace(":slug", safeSlug);
        return {
          loc: `${frontendOrigin}${path}`,
          lastmod: new Date(internship.updatedAt || Date.now()).toISOString(),
        };
      })
      .filter(Boolean);

    const xmlBody = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
      .map(
        (item) =>
          `  <url>\n    <loc>${item.loc}</loc>\n    <lastmod>${item.lastmod}</lastmod>\n  </url>`
      )
      .join("\n")}\n</urlset>`;

    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=300");
    return res.status(200).send(xmlBody);
  } catch (error) {
    console.error("GET INTERNSHIPS SITEMAP ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to generate internships sitemap",
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

    const firstDuration = payload.durations[0] || {};

    const internship = await Internship.create({
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

    const firstDuration = payload.durations[0] || {};

    internship.title = payload.title;
    internship.slug = payload.slug;
    internship.branch = payload.branch;
    internship.category = payload.category;
    internship.description = payload.description;
    internship.thumbnail = payload.thumbnail;
    internship.image = payload.image;
    internship.duration = firstDuration.label || "";
    internship.durationDays = firstDuration.durationDays || 30;
    internship.price = firstDuration.price || 0;
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
