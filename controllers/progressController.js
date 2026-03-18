const Internship = require("../models/Internship");
const Progress = require("../models/Progress");
const Purchase = require("../models/Purchase");
const TestResult = require("../models/TestResult");

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const safeArray = (value) => (Array.isArray(value) ? value : []);

const sortByOrder = (items = []) => {
  return [...safeArray(items)].sort(
    (a, b) => toNumber(a?.order, 0) - toNumber(b?.order, 0)
  );
};

const getUserId = (req) => req.user?.id || req.user?._id;

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

const getSelectedDurationDays = (purchase, internship) => {
  const purchaseDays =
    purchase?.selectedDurationDays ||
    purchase?.durationDays ||
    purchase?.selectedPlan?.durationDays;

  if (purchaseDays) {
    return Math.max(1, toNumber(purchaseDays, 30));
  }

  const firstDurationDays = safeArray(internship?.durations)[0]?.durationDays;
  if (firstDurationDays) {
    return Math.max(1, toNumber(firstDurationDays, 30));
  }

  return Math.max(1, toNumber(internship?.durationDays, 30));
};

const findModuleById = (internship, moduleId) => {
  return safeArray(internship?.modules).find(
    (module) => String(module?._id) === String(moduleId)
  );
};

const findVideoInModule = (module, videoId) => {
  return safeArray(module?.videos).find(
    (video) => String(video?._id) === String(videoId)
  );
};

const isModuleUnlocked = (progressDoc, module) => {
  if (!module) return false;

  const completedDays = calculateCompletedDays(
    progressDoc.enrolledAt,
    progressDoc.selectedDurationDays
  );

  return (
    Boolean(progressDoc.unlockAllPurchased) ||
    completedDays >= Math.max(1, toNumber(module.unlockDay, 1))
  );
};

const getUnlockedModules = (internship, progressDoc) => {
  const completedDays = calculateCompletedDays(
    progressDoc.enrolledAt,
    progressDoc.selectedDurationDays
  );

  return sortByOrder(internship.modules).map((module, moduleIndex) => ({
    ...module.toObject(),
    order: toNumber(module.order, moduleIndex + 1),
    unlockDay: Math.max(1, toNumber(module.unlockDay, moduleIndex + 1)),
    videos: sortByOrder(module.videos),
    isUnlocked:
      progressDoc.unlockAllPurchased ||
      completedDays >= Math.max(1, toNumber(module.unlockDay, moduleIndex + 1)),
  }));
};

const calculateProgressStats = (internship, progressDoc) => {
  const allModules = sortByOrder(internship.modules);
  const totalModules = allModules.length;

  let totalVideos = 0;
  let totalWatchedPercent = 0;
  let completedVideos = 0;

  allModules.forEach((module) => {
    sortByOrder(module.videos).forEach((video) => {
      totalVideos += 1;

      const matchedProgress = safeArray(progressDoc.videoProgress).find(
        (item) => String(item.videoId) === String(video._id)
      );

      const watchedPercent = toNumber(matchedProgress?.watchedPercent, 0);
      totalWatchedPercent += watchedPercent;

      if (watchedPercent >= 80 || matchedProgress?.completed) {
        completedVideos += 1;
      }
    });
  });

  const completedModules = allModules.filter((module) => {
    const moduleVideos = safeArray(module.videos);
    if (!moduleVideos.length) return false;

    return moduleVideos.every((video) => {
      const matchedProgress = safeArray(progressDoc.videoProgress).find(
        (item) => String(item.videoId) === String(video._id)
      );

      return toNumber(matchedProgress?.watchedPercent, 0) >= 80;
    });
  }).length;

  const overallProgress =
    totalVideos > 0 ? Math.round(totalWatchedPercent / totalVideos) : 0;

  return {
    totalModules,
    totalVideos,
    completedModules,
    completedVideos,
    overallProgress,
  };
};

const applyDerivedProgressFields = async (
  internship,
  progressDoc,
  userId,
  internshipId
) => {
  const latestTest = await TestResult.findOne({
    userId,
    internshipId,
  }).sort({ createdAt: -1 });

  if (latestTest?.passed) {
    progressDoc.miniTestPassed = true;
  }

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
    progress = await Progress.create({
      userId,
      internshipId,
      purchaseId: purchase._id,
      enrolledAt: purchase.createdAt || new Date(),
      selectedDurationDays: getSelectedDurationDays(purchase, internship),
      totalModules: safeArray(internship.modules).length,
      totalVideos: safeArray(internship.modules).reduce(
        (sum, module) => sum + safeArray(module.videos).length,
        0
      ),
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

  const paidUnlockAllPurchase = await Purchase.findOne({
    userId,
    internshipId,
    purchaseType: "unlock_all",
    paymentStatus: "paid",
  });

  if (paidUnlockAllPurchase && !progress.unlockAllPurchased) {
    progress.unlockAllPurchased = true;
  }

  return progress;
};

// @desc   Get full course progress page data
// @route  GET /api/progress/course/:internshipId
// @access Private
exports.getCourseProgress = async (req, res) => {
  try {
    const { internshipId } = req.params;
    const userId = getUserId(req);

    if (!internshipId) {
      return res.status(400).json({
        success: false,
        message: "Internship ID is required",
      });
    }

    const internship = await Internship.findById(internshipId);
    if (!internship) {
      return res.status(404).json({
        success: false,
        message: "Internship not found",
      });
    }

    const purchase = await Purchase.findOne({
      userId,
      internshipId,
      purchaseType: "internship",
      paymentStatus: "paid",
    }).sort({ createdAt: -1 });

    if (!purchase) {
      return res.status(403).json({
        success: false,
        message: "You have not purchased this internship",
      });
    }

    const progress = await ensureProgressDoc({
      internship,
      internshipId,
      purchase,
      userId,
    });

    await applyDerivedProgressFields(internship, progress, userId, internshipId);
    await progress.save();

    const unlockedModules = getUnlockedModules(internship, progress);

    return res.status(200).json({
      success: true,
      course: {
        id: internship._id,
        title: internship.title,
        category: internship.category,
        branch: internship.branch,
        duration:
          internship.duration ||
          `${getSelectedDurationDays(purchase, internship)} Days`,
        durationDays: getSelectedDurationDays(purchase, internship),
        requiredProgress: toNumber(internship.requiredProgress, 80),
        miniTestUnlockProgress: toNumber(internship.miniTestUnlockProgress, 80),
        miniTestPassMarks: toNumber(internship.miniTestPassMarks, 60),
        unlockAllPrice: toNumber(internship.unlockAllPrice, 99),
        certificateEnabled:
          typeof internship.certificateEnabled === "boolean"
            ? internship.certificateEnabled
            : true,
      },
      progress,
      modules: unlockedModules,
      eligibility: {
        progressCompleted:
          progress.overallProgress >= toNumber(internship.requiredProgress, 80),
        miniTestCompleted: Boolean(progress.miniTestPassed),
        durationCompleted: Boolean(progress.durationCompleted),
        eligible: Boolean(progress.certificateEligible),
      },
    });
  } catch (error) {
    console.error("getCourseProgress error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load course progress",
    });
  }
};

// @desc   Update video progress
// @route  PATCH /api/progress/course/:internshipId/video
// @access Private
exports.updateVideoProgress = async (req, res) => {
  try {
    const { internshipId } = req.params;
    const { moduleId, videoId, watchedPercent } = req.body;
    const userId = getUserId(req);

    if (!moduleId || !videoId || watchedPercent === undefined) {
      return res.status(400).json({
        success: false,
        message: "moduleId, videoId and watchedPercent are required",
      });
    }

    const internship = await Internship.findById(internshipId);
    if (!internship) {
      return res.status(404).json({
        success: false,
        message: "Internship not found",
      });
    }

    const purchase = await Purchase.findOne({
      userId,
      internshipId,
      purchaseType: "internship",
      paymentStatus: "paid",
    }).sort({ createdAt: -1 });

    if (!purchase) {
      return res.status(403).json({
        success: false,
        message: "You have not purchased this internship",
      });
    }

    const progress = await ensureProgressDoc({
      internship,
      internshipId,
      purchase,
      userId,
    });

    const targetModule = findModuleById(internship, moduleId);
    if (!targetModule) {
      return res.status(404).json({
        success: false,
        message: "Module not found",
      });
    }

    const targetVideo = findVideoInModule(targetModule, videoId);
    if (!targetVideo) {
      return res.status(404).json({
        success: false,
        message: "Video not found in this module",
      });
    }

    const unlocked = isModuleUnlocked(progress, targetModule);
    if (!unlocked) {
      return res.status(403).json({
        success: false,
        message: "This module is still locked",
      });
    }

    const safePercent = Math.max(0, Math.min(100, toNumber(watchedPercent, 0)));

    const existingIndex = safeArray(progress.videoProgress).findIndex(
      (item) =>
        String(item.moduleId) === String(moduleId) &&
        String(item.videoId) === String(videoId)
    );

    if (existingIndex >= 0) {
      const existingPercent = toNumber(
        progress.videoProgress[existingIndex].watchedPercent,
        0
      );
      const finalPercent = Math.max(existingPercent, safePercent);

      progress.videoProgress[existingIndex].watchedPercent = finalPercent;
      progress.videoProgress[existingIndex].completed = finalPercent >= 80;
      progress.videoProgress[existingIndex].lastWatchedAt = new Date();
    } else {
      progress.videoProgress.push({
        moduleId,
        videoId,
        watchedPercent: safePercent,
        completed: safePercent >= 80,
        lastWatchedAt: new Date(),
      });
    }

    await applyDerivedProgressFields(internship, progress, userId, internshipId);
    await progress.save();

    return res.status(200).json({
      success: true,
      message: "Video progress updated successfully",
      progress,
    });
  } catch (error) {
    console.error("updateVideoProgress error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update video progress",
    });
  }
};

// @desc   Unlock all modules only after paid unlock-all addon
// @route  PATCH /api/progress/course/:internshipId/unlock-all
// @access Private
exports.unlockAllModules = async (req, res) => {
  try {
    const { internshipId } = req.params;
    const userId = getUserId(req);

    const internship = await Internship.findById(internshipId);
    if (!internship) {
      return res.status(404).json({
        success: false,
        message: "Internship not found",
      });
    }

    const purchase = await Purchase.findOne({
      userId,
      internshipId,
      purchaseType: "internship",
      paymentStatus: "paid",
    }).sort({ createdAt: -1 });

    if (!purchase) {
      return res.status(403).json({
        success: false,
        message: "You have not purchased this internship",
      });
    }

    const paidUnlockAllPurchase = await Purchase.findOne({
      userId,
      internshipId,
      purchaseType: "unlock_all",
      paymentStatus: "paid",
    });

    if (!paidUnlockAllPurchase) {
      return res.status(403).json({
        success: false,
        message: "Unlock-all payment required before unlocking all modules",
      });
    }

    const progress = await ensureProgressDoc({
      internship,
      internshipId,
      purchase,
      userId,
    });

    progress.unlockAllPurchased = true;

    await applyDerivedProgressFields(internship, progress, userId, internshipId);
    await progress.save();

    return res.status(200).json({
      success: true,
      message: "All modules unlocked successfully",
      progress,
    });
  } catch (error) {
    console.error("unlockAllModules error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to unlock all modules",
    });
  }
};

// @desc   Get eligibility status
// @route  GET /api/progress/course/:internshipId/eligibility
// @access Private
exports.getEligibilityStatus = async (req, res) => {
  try {
    const { internshipId } = req.params;
    const userId = getUserId(req);

    const internship = await Internship.findById(internshipId);
    if (!internship) {
      return res.status(404).json({
        success: false,
        message: "Internship not found",
      });
    }

    const purchase = await Purchase.findOne({
      userId,
      internshipId,
      purchaseType: "internship",
      paymentStatus: "paid",
    }).sort({ createdAt: -1 });

    if (!purchase) {
      return res.status(403).json({
        success: false,
        message: "You have not purchased this internship",
      });
    }

    const progress = await ensureProgressDoc({
      internship,
      internshipId,
      purchase,
      userId,
    });

    await applyDerivedProgressFields(internship, progress, userId, internshipId);
    await progress.save();

    return res.status(200).json({
      success: true,
      eligibility: {
        progressCompleted:
          progress.overallProgress >= toNumber(internship.requiredProgress, 80),
        miniTestCompleted: Boolean(progress.miniTestPassed),
        durationCompleted: Boolean(progress.durationCompleted),
        eligible: Boolean(progress.certificateEligible),
      },
      progress,
    });
  } catch (error) {
    console.error("getEligibilityStatus error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch eligibility status",
    });
  }
};