const User = require("../models/User");
const Purchase = require("../models/Purchase");
const Internship = require("../models/Internship");
const Certificate = require("../models/Certificate");
const TestResult = require("../models/TestResult");
const Progress = require("../models/Progress");

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const buildDateRange = (from, to) => {
  const query = {};

  if (from) {
    query.$gte = new Date(`${from}T00:00:00.000Z`);
  }

  if (to) {
    query.$lte = new Date(`${to}T23:59:59.999Z`);
  }

  return Object.keys(query).length ? query : null;
};

const buildUserSearchQuery = ({ search = "", role = "All", from = "", to = "" }) => {
  const query = {};

  const trimmedSearch = String(search || "").trim();
  if (trimmedSearch) {
    query.$or = [
      { name: { $regex: trimmedSearch, $options: "i" } },
      { email: { $regex: trimmedSearch, $options: "i" } },
    ];
  }

  if (role && role !== "All") {
    query.role = String(role).toLowerCase();
  }

  const createdAtRange = buildDateRange(from, to);
  if (createdAtRange) {
    query.createdAt = createdAtRange;
  }

  return query;
};

const getPurchaseBaseData = async (purchaseDocs = []) => {
  const progressDocs = await Progress.find().select(
    "userId internshipId overallProgress miniTestPassed certificateEligible completedDays durationCompleted unlockAllPurchased"
  );

  const certificateDocs = await Certificate.find({ status: "issued" }).select(
    "userId internshipId certificateId issuedAt status"
  );

  const passedResults = await TestResult.find({ passed: true }).select(
    "userId internshipId percentage passed submittedAt"
  );

  const progressMap = new Map(
    progressDocs.map((item) => [
      `${String(item.userId)}_${String(item.internshipId)}`,
      item,
    ])
  );

  const certificateMap = new Map(
    certificateDocs.map((item) => [
      `${String(item.userId)}_${String(item.internshipId)}`,
      item,
    ])
  );

  const quizMap = new Map(
    passedResults.map((item) => [
      `${String(item.userId)}_${String(item.internshipId)}`,
      item,
    ])
  );

  return purchaseDocs.map((purchase) => {
    const userId = String(purchase.userId?._id || "");
    const internshipId = String(purchase.internshipId?._id || "");
    const key = `${userId}_${internshipId}`;

    const progress = progressMap.get(key);
    const certificate = certificateMap.get(key);
    const quiz = quizMap.get(key);

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
        passed: !!quiz?.passed || !!progress?.miniTestPassed,
        percentage: quiz?.percentage || 0,
        submittedAt: quiz?.submittedAt || null,
      },
    };
  });
};

// GET /api/admin/overview
exports.getAdminOverview = async (req, res) => {
  try {
    const [
      internships,
      totalUsers,
      totalAdmins,
      activeUsers,
      recentlyLoggedInUsers,
      totalPurchases,
      paidPurchases,
      failedPurchases,
      totalCertificatesIssued,
      totalQuizPassed,
      recentUsers,
      recentInternships,
      recentPurchasesRaw,
    ] = await Promise.all([
      Internship.find().sort({ createdAt: -1 }),
      User.countDocuments(),
      User.countDocuments({ role: "admin" }),
      User.countDocuments({ isActive: { $ne: false } }),
      User.countDocuments({ lastLoginAt: { $ne: null } }),
      Purchase.countDocuments(),
      Purchase.countDocuments({ paymentStatus: "paid" }),
      Purchase.countDocuments({ paymentStatus: "failed" }),
      Certificate.countDocuments({ status: "issued" }),
      TestResult.countDocuments({ passed: true }),
      User.find()
        .select("name email role createdAt lastLoginAt isActive")
        .sort({ createdAt: -1 })
        .limit(8),
      Internship.find()
        .sort({ createdAt: -1 })
        .limit(6),
      Purchase.find()
        .populate("userId", "name email role lastLoginAt isActive createdAt")
        .populate("internshipId", "title branch category")
        .sort({ createdAt: -1 })
        .limit(10),
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

    const recentUsersIds = recentUsers.map((u) => String(u._id));
    const recentUsersPurchaseCounts = await Purchase.aggregate([
      { $match: { userId: { $in: recentUsers.map((u) => u._id) } } },
      { $group: { _id: "$userId", count: { $sum: 1 } } },
    ]);

    const recentUsersCertificateCounts = await Certificate.aggregate([
      {
        $match: {
          status: "issued",
          userId: { $in: recentUsers.map((u) => u._id) },
        },
      },
      { $group: { _id: "$userId", count: { $sum: 1 } } },
    ]);

    const purchaseCountMap = new Map(
      recentUsersPurchaseCounts.map((item) => [String(item._id), item.count])
    );

    const certificateCountMap = new Map(
      recentUsersCertificateCounts.map((item) => [String(item._id), item.count])
    );

    const recentUsersFormatted = recentUsers.map((user) => ({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: typeof user.isActive === "boolean" ? user.isActive : true,
      lastLoginAt: user.lastLoginAt || null,
      createdAt: user.createdAt,
      purchasesCount: purchaseCountMap.get(String(user._id)) || 0,
      certificatesCount: certificateCountMap.get(String(user._id)) || 0,
    }));

    const recentInternshipsFormatted = recentInternships.map((item) => ({
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

    const recentPurchases = await getPurchaseBaseData(recentPurchasesRaw);

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
        totalNormalUsers: totalUsers - totalAdmins,
        activeUsers,
        recentlyLoggedInUsers,
        totalPurchases,
        paidPurchases,
        failedPurchases,
        totalCertificatesIssued,
        totalQuizPassed,
      },
      recentInternships: recentInternshipsFormatted,
      recentUsers: recentUsersFormatted,
      recentPurchases,
    });
  } catch (error) {
    console.error("GET ADMIN OVERVIEW ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch admin overview",
    });
  }
};

// GET /api/admin/users
exports.getAdminUsers = async (req, res) => {
  try {
    const page = Math.max(1, toNumber(req.query.page, 1));
    const limit = Math.max(1, Math.min(100, toNumber(req.query.limit, 10)));
    const skip = (page - 1) * limit;

    const query = buildUserSearchQuery({
      search: req.query.search,
      role: req.query.role,
      from: req.query.from,
      to: req.query.to,
    });

    const [users, total] = await Promise.all([
      User.find(query)
        .select("name email role createdAt lastLoginAt isActive")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      User.countDocuments(query),
    ]);

    const userIds = users.map((u) => u._id);

    const [purchaseCounts, certificateCounts] = await Promise.all([
      Purchase.aggregate([
        { $match: { userId: { $in: userIds } } },
        { $group: { _id: "$userId", count: { $sum: 1 } } },
      ]),
      Certificate.aggregate([
        { $match: { status: "issued", userId: { $in: userIds } } },
        { $group: { _id: "$userId", count: { $sum: 1 } } },
      ]),
    ]);

    const purchaseCountMap = new Map(
      purchaseCounts.map((item) => [String(item._id), item.count])
    );

    const certificateCountMap = new Map(
      certificateCounts.map((item) => [String(item._id), item.count])
    );

    const items = users.map((user) => ({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: typeof user.isActive === "boolean" ? user.isActive : true,
      lastLoginAt: user.lastLoginAt || null,
      createdAt: user.createdAt,
      purchasesCount: purchaseCountMap.get(String(user._id)) || 0,
      certificatesCount: certificateCountMap.get(String(user._id)) || 0,
    }));

    return res.status(200).json({
      success: true,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      items,
    });
  } catch (error) {
    console.error("GET ADMIN USERS ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch admin users",
    });
  }
};

// GET /api/admin/purchases
exports.getAdminPurchases = async (req, res) => {
  try {
    const page = Math.max(1, toNumber(req.query.page, 1));
    const limit = Math.max(1, Math.min(100, toNumber(req.query.limit, 10)));
    const skip = (page - 1) * limit;

    const search = String(req.query.search || "").trim();
    const paymentStatus = String(req.query.paymentStatus || "All");
    const certificateStatus = String(req.query.certificateStatus || "All");
    const from = String(req.query.from || "");
    const to = String(req.query.to || "");

    const purchaseQuery = {};
    if (paymentStatus !== "All") {
      purchaseQuery.paymentStatus = paymentStatus.toLowerCase();
    }

    const createdAtRange = buildDateRange(from, to);
    if (createdAtRange) {
      purchaseQuery.createdAt = createdAtRange;
    }

    const [rawPurchases, totalRaw] = await Promise.all([
      Purchase.find(purchaseQuery)
        .populate("userId", "name email role lastLoginAt isActive createdAt")
        .populate("internshipId", "title branch category")
        .sort({ createdAt: -1 }),
      Purchase.countDocuments(purchaseQuery),
    ]);

    let formatted = await getPurchaseBaseData(rawPurchases);

    if (search) {
      const q = search.toLowerCase();
      formatted = formatted.filter((item) => {
        return (
          item.user?.name?.toLowerCase().includes(q) ||
          item.user?.email?.toLowerCase().includes(q) ||
          item.internship?.title?.toLowerCase().includes(q) ||
          item.internship?.branch?.toLowerCase().includes(q) ||
          item.internship?.category?.toLowerCase().includes(q)
        );
      });
    }

    if (certificateStatus !== "All") {
      formatted = formatted.filter((item) => {
        const hasCertificate = !!item.certificate?.certificateId;
        if (certificateStatus === "Issued") return hasCertificate;
        if (certificateStatus === "Not Issued") return !hasCertificate;
        return true;
      });
    }

    const total = formatted.length;
    const paginatedItems = formatted.slice(skip, skip + limit);

    return res.status(200).json({
      success: true,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      items: paginatedItems,
      rawCount: totalRaw,
    });
  } catch (error) {
    console.error("GET ADMIN PURCHASES ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch admin purchases",
    });
  }
};

// PATCH /api/admin/users/:userId/status
exports.updateUserStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    const { isActive } = req.body;

    if (typeof isActive !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "isActive must be true or false",
      });
    }

    const user = await User.findById(userId).select(
      "name email role isActive createdAt lastLoginAt"
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    user.isActive = isActive;
    await user.save();

    return res.status(200).json({
      success: true,
      message: `User ${isActive ? "activated" : "deactivated"} successfully`,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt || null,
      },
    });
  } catch (error) {
    console.error("UPDATE USER STATUS ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update user status",
    });
  }
};

// PATCH /api/admin/purchases/:purchaseId/status
exports.updatePurchaseStatus = async (req, res) => {
  try {
    const { purchaseId } = req.params;
    const { paymentStatus } = req.body;

    const allowedStatuses = ["created", "paid", "failed"];

    if (!allowedStatuses.includes(String(paymentStatus))) {
      return res.status(400).json({
        success: false,
        message: "Invalid paymentStatus value",
      });
    }

    const purchase = await Purchase.findById(purchaseId)
      .populate("userId", "name email role lastLoginAt isActive createdAt")
      .populate("internshipId", "title branch category");

    if (!purchase) {
      return res.status(404).json({
        success: false,
        message: "Purchase not found",
      });
    }

    purchase.paymentStatus = paymentStatus;
    await purchase.save();

    return res.status(200).json({
      success: true,
      message: `Purchase marked as ${paymentStatus}`,
      purchase: {
        _id: purchase._id,
        paymentStatus: purchase.paymentStatus,
        amount: purchase.amount,
        durationLabel: purchase.durationLabel,
        createdAt: purchase.createdAt,
        user: purchase.userId
          ? {
              _id: purchase.userId._id,
              name: purchase.userId.name,
              email: purchase.userId.email,
            }
          : null,
        internship: purchase.internshipId
          ? {
              _id: purchase.internshipId._id,
              title: purchase.internshipId.title,
              branch: purchase.internshipId.branch,
              category: purchase.internshipId.category,
            }
          : null,
      },
    });
  } catch (error) {
    console.error("UPDATE PURCHASE STATUS ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update purchase status",
    });
  }
};

// POST /api/admin/certificates/:purchaseId/resend
exports.resendCertificateFromPurchase = async (req, res) => {
  try {
    const { purchaseId } = req.params;

    const purchase = await Purchase.findById(purchaseId)
      .populate("userId", "name email")
      .populate("internshipId", "title branch category certificateEnabled");

    if (!purchase) {
      return res.status(404).json({
        success: false,
        message: "Purchase not found",
      });
    }

    const userId = purchase.userId?._id;
    const internshipId = purchase.internshipId?._id;

    if (!userId || !internshipId) {
      return res.status(400).json({
        success: false,
        message: "Purchase user or internship data is missing",
      });
    }

    const progress = await Progress.findOne({ userId, internshipId });

    if (!progress) {
      return res.status(404).json({
        success: false,
        message: "Progress record not found for this purchase",
      });
    }

    let certificate = await Certificate.findOne({
      userId,
      internshipId,
      status: "issued",
    });

    if (!certificate) {
      return res.status(404).json({
        success: false,
        message: "Issued certificate not found for this purchase",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Certificate record found successfully",
      certificate: {
        _id: certificate._id,
        certificateId: certificate.certificateId,
        issuedAt: certificate.issuedAt,
        status: certificate.status,
      },
      user: {
        name: purchase.userId?.name || "",
        email: purchase.userId?.email || "",
      },
      internship: {
        title: purchase.internshipId?.title || "",
        branch: purchase.internshipId?.branch || "",
        category: purchase.internshipId?.category || "",
      },
      downloadUrl: `/api/certificates/${certificate.certificateId}/download`,
    });
  } catch (error) {
    console.error("RESEND CERTIFICATE FROM PURCHASE ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch certificate for resend",
    });
  }
};