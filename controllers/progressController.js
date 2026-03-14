const Internship = require("../models/Internship");
const Progress = require("../models/Progress");
const Purchase = require("../models/Purchase");
const TestResult = require("../models/TestResult");

// helper
const calculateProgressStats = (internship, progressDoc) => {
  const allModules = internship.modules || [];
  const totalModules = allModules.length;

  const allVideos = allModules.flatMap((module) =>
    (module.videos || []).map((video) => ({
      moduleId: module._id.toString(),
      videoId: video._id.toString(),
    }))
  );

  const totalVideos = allVideos.length;

  const completedVideoEntries = progressDoc.videoProgress.filter(
    (item) => item.completed
  );

  const completedVideos = completedVideoEntries.length;

  const completedModules = allModules.filter((module) => {
    const moduleVideos = module.videos || [];
    if (!moduleVideos.length) return false;

    return moduleVideos.every((video) =>
      progressDoc.videoProgress.some(
        (vp) =>
          vp.videoId.toString() === video._id.toString() && vp.completed === true
      )
    );
  }).length;

  const overallProgress =
    totalVideos > 0 ? Math.round((completedVideos / totalVideos) * 100) : 0;

  return {
    totalModules,
    totalVideos,
    completedModules,
    completedVideos,
    overallProgress,
  };
};

const calculateCompletedDays = (enrolledAt, selectedDurationDays) => {
  const start = new Date(enrolledAt);
  const today = new Date();

  const diffTime = today - start;
  const diffDays = Math.max(
    0,
    Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1
  );

  return diffDays > selectedDurationDays ? selectedDurationDays : diffDays;
};

const getUnlockedModules = (internship, progressDoc) => {
  const completedDays = calculateCompletedDays(
    progressDoc.enrolledAt,
    progressDoc.selectedDurationDays
  );

  return (internship.modules || []).map((module) => ({
    ...module.toObject(),
    isUnlocked:
      progressDoc.unlockAllPurchased || completedDays >= (module.unlockDay || 1),
  }));
};

// @desc   Get full course progress page data
// @route  GET /api/progress/course/:internshipId
// @access Private
exports.getCourseProgress = async (req, res) => {
  try {
    const { internshipId } = req.params;
    const userId = req.user._id;

    const internship = await Internship.findById(internshipId);
    if (!internship) {
      return res.status(404).json({
        success: false,
        message: "Internship not found",
      });
    }

    // ✅ FIXED according to Purchase.js
    const purchase = await Purchase.findOne({
      userId: userId,
      internshipId: internshipId,
      paymentStatus: "paid",
    });

    if (!purchase) {
      return res.status(403).json({
        success: false,
        message: "You have not purchased this internship",
      });
    }

    let progress = await Progress.findOne({
      user: userId,
      internship: internshipId,
    });

    if (!progress) {
      progress = await Progress.create({
        user: userId,
        internship: internshipId,
        purchase: purchase._id,
        enrolledAt: purchase.createdAt || new Date(),

        // Purchase.durationLabel ko days me map karna later better hoga,
        // abhi internship.durationDays fallback use kar rahe hain
        selectedDurationDays: internship.durationDays || 30,

        totalModules: internship.modules.length,
        totalVideos: internship.modules.reduce(
          (sum, module) => sum + (module.videos?.length || 0),
          0
        ),
      });
    }

    const latestTest = await TestResult.findOne({
      user: userId,
      internship: internshipId,
    }).sort({ createdAt: -1 });

    if (latestTest?.passed && !progress.miniTestPassed) {
      progress.miniTestPassed = true;
    }

    const stats = calculateProgressStats(internship, progress);
    progress.totalModules = stats.totalModules;
    progress.totalVideos = stats.totalVideos;
    progress.completedModules = stats.completedModules;
    progress.completedVideos = stats.completedVideos;
    progress.overallProgress = stats.overallProgress;

    progress.completedDays = calculateCompletedDays(
      progress.enrolledAt,
      progress.selectedDurationDays
    );

    progress.durationCompleted =
      progress.completedDays >= progress.selectedDurationDays;

    progress.miniTestUnlocked =
      progress.overallProgress >= (internship.miniTestUnlockProgress || 80);

    progress.certificateEligible =
      progress.overallProgress >= (internship.requiredProgress || 80) &&
      progress.miniTestPassed &&
      progress.durationCompleted;

    await progress.save();

    const unlockedModules = getUnlockedModules(internship, progress);

    return res.json({
      success: true,
      course: {
        id: internship._id,
        title: internship.title,
        category: internship.category,
        branch: internship.branch,
        duration: internship.duration,
        durationDays: internship.durationDays,
        requiredProgress: internship.requiredProgress,
        miniTestUnlockProgress: internship.miniTestUnlockProgress,
        miniTestPassMarks: internship.miniTestPassMarks,
        unlockAllPrice: internship.unlockAllPrice,
        certificateEnabled: internship.certificateEnabled,
      },
      progress,
      modules: unlockedModules,
      eligibility: {
        progressCompleted:
          progress.overallProgress >= (internship.requiredProgress || 80),
        miniTestCompleted: progress.miniTestPassed,
        durationCompleted: progress.durationCompleted,
        eligible: progress.certificateEligible,
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
    const userId = req.user._id;

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

    const progress = await Progress.findOne({
      user: userId,
      internship: internshipId,
    });

    if (!progress) {
      return res.status(404).json({
        success: false,
        message: "Progress record not found",
      });
    }

    const safePercent = Math.max(0, Math.min(100, Number(watchedPercent)));

    const existingIndex = progress.videoProgress.findIndex(
      (item) =>
        item.moduleId.toString() === moduleId.toString() &&
        item.videoId.toString() === videoId.toString()
    );

    if (existingIndex >= 0) {
      progress.videoProgress[existingIndex].watchedPercent = Math.max(
        progress.videoProgress[existingIndex].watchedPercent,
        safePercent
      );
      progress.videoProgress[existingIndex].completed =
        progress.videoProgress[existingIndex].watchedPercent >= 80;
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

    const latestTest = await TestResult.findOne({
      user: userId,
      internship: internshipId,
    }).sort({ createdAt: -1 });

    progress.miniTestPassed = latestTest?.passed || progress.miniTestPassed;

    const stats = calculateProgressStats(internship, progress);
    progress.totalModules = stats.totalModules;
    progress.totalVideos = stats.totalVideos;
    progress.completedModules = stats.completedModules;
    progress.completedVideos = stats.completedVideos;
    progress.overallProgress = stats.overallProgress;

    progress.completedDays = calculateCompletedDays(
      progress.enrolledAt,
      progress.selectedDurationDays
    );

    progress.durationCompleted =
      progress.completedDays >= progress.selectedDurationDays;

    progress.miniTestUnlocked =
      progress.overallProgress >= (internship.miniTestUnlockProgress || 80);

    progress.certificateEligible =
      progress.overallProgress >= (internship.requiredProgress || 80) &&
      progress.miniTestPassed &&
      progress.durationCompleted;

    await progress.save();

    return res.json({
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

// @desc   Unlock all modules
// @route  PATCH /api/progress/course/:internshipId/unlock-all
// @access Private
exports.unlockAllModules = async (req, res) => {
  try {
    const { internshipId } = req.params;
    const userId = req.user._id;

    const progress = await Progress.findOne({
      user: userId,
      internship: internshipId,
    });

    if (!progress) {
      return res.status(404).json({
        success: false,
        message: "Progress record not found",
      });
    }

    progress.unlockAllPurchased = true;
    await progress.save();

    return res.json({
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
    const userId = req.user._id;

    const internship = await Internship.findById(internshipId);
    const progress = await Progress.findOne({
      user: userId,
      internship: internshipId,
    });

    if (!internship || !progress) {
      return res.status(404).json({
        success: false,
        message: "Eligibility data not found",
      });
    }

    return res.json({
      success: true,
      eligibility: {
        progressCompleted:
          progress.overallProgress >= (internship.requiredProgress || 80),
        miniTestCompleted: progress.miniTestPassed,
        durationCompleted: progress.durationCompleted,
        eligible: progress.certificateEligible,
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