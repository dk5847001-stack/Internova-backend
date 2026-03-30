const Internship = require("../models/Internship");
const Purchase = require("../models/Purchase");
const TestResult = require("../models/TestResult");
const Progress = require("../models/Progress");
const { isValidObjectId } = require("../utils/validation");

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const getUserId = (req) => req.user?.id || req.user?._id;

const getSelectedDurationDays = (purchase, internship) => {
  const purchaseDays =
    purchase?.selectedDurationDays ||
    purchase?.durationDays ||
    purchase?.selectedPlan?.durationDays;

  if (purchaseDays) {
    return Math.max(1, toNumber(purchaseDays, 30));
  }

  const firstDurationDays = Array.isArray(internship?.durations)
    ? internship.durations[0]?.durationDays
    : null;

  if (firstDurationDays) {
    return Math.max(1, toNumber(firstDurationDays, 30));
  }

  return Math.max(1, toNumber(internship?.durationDays, 30));
};

const calculateCompletedDays = (enrolledAt, selectedDurationDays) => {
  const safeDurationDays = Math.max(0, toNumber(selectedDurationDays, 0));

  if (!enrolledAt) return 0;

  const start = new Date(enrolledAt);
  const today = new Date();

  if (Number.isNaN(start.getTime())) return 0;

  const diffTime = today - start;
  const diffDays = Math.max(
    0,
    Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1
  );

  return diffDays > safeDurationDays ? safeDurationDays : diffDays;
};

const calculateProgressStats = (internship, progressDoc) => {
  const modules = Array.isArray(internship?.modules) ? internship.modules : [];

  let totalVideos = 0;
  let totalWatchedPercent = 0;
  let completedVideos = 0;

  modules.forEach((module) => {
    const videos = Array.isArray(module?.videos) ? module.videos : [];

    videos.forEach((video) => {
      totalVideos += 1;

      const matchedProgress = (progressDoc.videoProgress || []).find(
        (item) => String(item.videoId) === String(video._id)
      );

      const watchedPercent = toNumber(matchedProgress?.watchedPercent, 0);
      totalWatchedPercent += watchedPercent;

      if (watchedPercent >= 80 || matchedProgress?.completed) {
        completedVideos += 1;
      }
    });
  });

  const completedModules = modules.filter((module) => {
    const videos = Array.isArray(module?.videos) ? module.videos : [];
    if (!videos.length) return false;

    return videos.every((video) => {
      const matchedProgress = (progressDoc.videoProgress || []).find(
        (item) => String(item.videoId) === String(video._id)
      );

      return toNumber(matchedProgress?.watchedPercent, 0) >= 80;
    });
  }).length;

  const overallProgress =
    totalVideos > 0 ? Math.round(totalWatchedPercent / totalVideos) : 0;

  return {
    totalModules: modules.length,
    totalVideos,
    completedModules,
    completedVideos,
    overallProgress,
  };
};

const applyDerivedProgressFields = (internship, progressDoc) => {
  const stats = calculateProgressStats(internship, progressDoc);

  progressDoc.totalModules = stats.totalModules;
  progressDoc.totalVideos = stats.totalVideos;
  progressDoc.completedModules = stats.completedModules;
  progressDoc.completedVideos = stats.completedVideos;
  progressDoc.overallProgress = stats.overallProgress;

  progressDoc.completedDays = calculateCompletedDays(
    progressDoc.enrolledAt,
    progressDoc.selectedDurationDays
  );

  progressDoc.durationCompleted =
    progressDoc.completedDays >= toNumber(progressDoc.selectedDurationDays, 0);

  progressDoc.miniTestUnlocked =
    progressDoc.overallProgress >= toNumber(internship.miniTestUnlockProgress, 80);

  progressDoc.certificateEligible =
    Boolean(internship.certificateEnabled) &&
    progressDoc.overallProgress >= toNumber(internship.requiredProgress, 80) &&
    Boolean(progressDoc.miniTestPassed) &&
    Boolean(progressDoc.durationCompleted);

  return progressDoc;
};

const ensureProgressDoc = async ({ internship, internshipId, purchase, userId }) => {
  let progress = await Progress.findOne({
    userId,
    internshipId,
  });

  if (!progress) {
    const totalVideos = (internship.modules || []).reduce(
      (sum, module) => sum + ((module.videos || []).length || 0),
      0
    );

    progress = await Progress.create({
      userId,
      internshipId,
      purchaseId: purchase._id,
      enrolledAt: purchase.createdAt || new Date(),
      selectedDurationDays: getSelectedDurationDays(purchase, internship),
      totalModules: internship.modules?.length || 0,
      totalVideos,
      completedModules: 0,
      completedVideos: 0,
      overallProgress: 0,
      completedDays: 0,
      durationCompleted: false,
      miniTestUnlocked: false,
      miniTestPassed: false,
      certificateEligible: false,
      unlockAllPurchased: false,
      videoProgress: [],
    });
  }

  return progress;
};

exports.getQuiz = async (req, res) => {
  try {
    const { internshipId } = req.params;
    const userId = getUserId(req);

    if (!isValidObjectId(internshipId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid internship ID",
      });
    }

    const paidPurchase = await Purchase.findOne({
      userId,
      internshipId,
      paymentStatus: { $in: ["paid", "captured"] },
    });

    if (!paidPurchase) {
      return res.status(403).json({
        success: false,
        message: "You have not purchased this internship",
      });
    }

    const internship = await Internship.findById(internshipId).select(
      "title quiz miniTestUnlockProgress miniTestPassMarks requiredProgress certificateEnabled modules durations durationDays"
    );

    if (!internship) {
      return res.status(404).json({
        success: false,
        message: "Internship not found",
      });
    }

    const progress = await ensureProgressDoc({
      internship,
      internshipId,
      purchase: paidPurchase,
      userId,
    });

    applyDerivedProgressFields(internship, progress);
    await progress.save();

    const currentProgress = progress?.overallProgress || 0;
    const unlockProgress = toNumber(internship.miniTestUnlockProgress, 80);
    const isUnlocked = currentProgress >= unlockProgress;

    if (!isUnlocked) {
      return res.status(403).json({
        success: false,
        message: `Mini test unlocks after ${unlockProgress}% course progress`,
        unlocked: false,
        requiredProgress: unlockProgress,
        currentProgress,
      });
    }

    const safeQuiz = (internship.quiz || []).map((q, index) => ({
      index,
      question: q.question,
      options: Array.isArray(q.options) ? q.options : [],
    }));

    if (!safeQuiz.length) {
      return res.status(400).json({
        success: false,
        message: "No quiz available for this internship",
      });
    }

    const existingResult = await TestResult.findOne({
      userId,
      internshipId,
    });

    const locked = existingResult?.passed === true;

    return res.status(200).json({
      success: true,
      title: internship.title,
      quiz: safeQuiz,
      locked,
      unlocked: true,
      requiredProgress: unlockProgress,
      currentProgress,
      passMarks: toNumber(internship.miniTestPassMarks, 60),
      result: existingResult || null,
    });
  } catch (error) {
    console.error("GET QUIZ ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch quiz",
    });
  }
};

exports.submitQuiz = async (req, res) => {
  try {
    const { internshipId } = req.params;
    const { answers } = req.body;
    const userId = getUserId(req);

    if (!isValidObjectId(internshipId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid internship ID",
      });
    }

    const paidPurchase = await Purchase.findOne({
      userId,
      internshipId,
      paymentStatus: { $in: ["paid", "captured"] },
    });

    if (!paidPurchase) {
      return res.status(403).json({
        success: false,
        message: "You have not purchased this internship",
      });
    }

    const internship = await Internship.findById(internshipId).select(
      "quiz miniTestUnlockProgress miniTestPassMarks requiredProgress certificateEnabled modules durations durationDays"
    );

    if (!internship) {
      return res.status(404).json({
        success: false,
        message: "Internship not found",
      });
    }

    if (!Array.isArray(answers)) {
      return res.status(400).json({
        success: false,
        message: "Answers must be an array",
      });
    }

    const quiz = Array.isArray(internship.quiz) ? internship.quiz : [];
    const totalQuestions = quiz.length;

    if (totalQuestions === 0) {
      return res.status(400).json({
        success: false,
        message: "No quiz available for this internship",
      });
    }

    if (answers.length !== totalQuestions) {
      return res.status(400).json({
        success: false,
        message: `You must answer all ${totalQuestions} questions`,
      });
    }

    const normalizedAnswers = answers.map((answer) => Number(answer));

    const hasInvalidAnswer = normalizedAnswers.some(
      (answer) => ![0, 1, 2, 3].includes(answer)
    );

    if (hasInvalidAnswer) {
      return res.status(400).json({
        success: false,
        message: "Invalid answer format detected",
      });
    }

    const progress = await ensureProgressDoc({
      internship,
      internshipId,
      purchase: paidPurchase,
      userId,
    });

    applyDerivedProgressFields(internship, progress);

    const currentProgress = progress?.overallProgress || 0;
    const unlockProgress = toNumber(internship.miniTestUnlockProgress, 80);

    if (currentProgress < unlockProgress) {
      await progress.save();

      return res.status(403).json({
        success: false,
        message: `Mini test unlocks after ${unlockProgress}% course progress`,
        unlocked: false,
        requiredProgress: unlockProgress,
        currentProgress,
      });
    }

    const existingPassedResult = await TestResult.findOne({
      userId,
      internshipId,
      passed: true,
    });

    if (existingPassedResult) {
      progress.miniTestUnlocked = true;
      progress.miniTestPassed = true;
      applyDerivedProgressFields(internship, progress);
      await progress.save();

      return res.status(400).json({
        success: false,
        message: "You have already passed this quiz",
      });
    }

    let score = 0;

    quiz.forEach((question, index) => {
      if (normalizedAnswers[index] === Number(question.correctAnswer)) {
        score += 1;
      }
    });

    const percentage = Math.round((score / totalQuestions) * 100);
    const passMarks = toNumber(internship.miniTestPassMarks, 60);
    const passed = percentage >= passMarks;

    const previousResult = await TestResult.findOne({
      userId,
      internshipId,
    });

    const nextAttemptNumber = previousResult
      ? toNumber(previousResult.attemptNumber, 0) + 1
      : 1;

    const result = await TestResult.findOneAndUpdate(
      { userId, internshipId },
      {
        $set: {
          answers: normalizedAnswers,
          score,
          totalQuestions,
          percentage,
          passed,
          attemptNumber: nextAttemptNumber,
          submittedAt: new Date(),
        },
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      }
    );

    progress.miniTestUnlocked = currentProgress >= unlockProgress;
    progress.miniTestPassed = passed || progress.miniTestPassed;

    applyDerivedProgressFields(internship, progress);
    await progress.save();

    return res.status(200).json({
      success: true,
      message: passed
        ? "Quiz passed successfully"
        : "Quiz submitted. You can retry until you pass.",
      result,
      progress,
    });
  } catch (error) {
    console.error("SUBMIT QUIZ ERROR FULL:", error);

    if (error?.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Quiz result conflict detected. Please try again.",
      });
    }

    return res.status(500).json({
      success: false,
      message: error?.message || "Failed to submit quiz",
    });
  }
};
