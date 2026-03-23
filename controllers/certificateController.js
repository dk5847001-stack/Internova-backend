const path = require("path");
const fs = require("fs");
const PDFDocument = require("pdfkit");
const QRCode = require("qrcode");

const Certificate = require("../models/Certificate");
const Progress = require("../models/Progress");
const Purchase = require("../models/Purchase");
const Internship = require("../models/Internship");
const User = require("../models/User");
const TestResult = require("../models/TestResult");

const generateCertificateId = () => {
  const random = Math.floor(100000 + Math.random() * 900000);
  return `CERT-${Date.now()}-${random}`;
};

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

const applyCertificateDerivedFields = async ({
  internship,
  internshipId,
  progress,
  userId,
}) => {
  const latestTest = await TestResult.findOne({
    userId,
    internshipId,
  }).sort({ createdAt: -1 });

  if (latestTest?.passed) {
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
    progress.completedDays >= toNumber(progress.selectedDurationDays, 0);

  progress.miniTestUnlocked =
    progress.overallProgress >= toNumber(internship.miniTestUnlockProgress, 80);

  progress.certificateEligible =
    Boolean(internship.certificateEnabled) &&
    progress.overallProgress >= toNumber(internship.requiredProgress, 80) &&
    Boolean(progress.miniTestPassed) &&
    Boolean(progress.durationCompleted);

  return progress;
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

const getPurchaseDurationLabel = (purchase, internship) => {
  return (
    purchase?.durationLabel ||
    purchase?.selectedPlan?.label ||
    internship?.duration ||
    `${getSelectedDurationDays(purchase, internship)} Days`
  );
};

const getVerifyBaseUrl = () => {
  return (
    process.env.CLIENT_URL ||
    process.env.REACT_APP_FRONTEND_URL ||
    process.env.FRONTEND_URL ||
    "http://localhost:3000"
  );
};

exports.checkCertificateEligibility = async (req, res) => {
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

    if (!internship.certificateEnabled) {
      return res.status(200).json({
        success: true,
        eligible: false,
        progress: {
          overallProgress: 0,
          miniTestPassed: false,
          durationCompleted: false,
          certificateEligible: false,
        },
        certificate: null,
        message: "Certificate is disabled for this internship",
      });
    }

    const purchase = await Purchase.findOne({
      userId,
      internshipId,
      paymentStatus: "paid",
    });

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

    await applyCertificateDerivedFields({
      internship,
      internshipId,
      progress,
      userId,
    });

    await progress.save();

    const existingCertificate = await Certificate.findOne({
      internshipId,
      userId,
      status: "issued",
    });

    return res.status(200).json({
      success: true,
      eligible: Boolean(progress.certificateEligible),
      progress: {
        overallProgress: progress.overallProgress || 0,
        miniTestPassed: progress.miniTestPassed || false,
        durationCompleted: progress.durationCompleted || false,
        certificateEligible: progress.certificateEligible || false,
      },
      certificate: existingCertificate || null,
    });
  } catch (error) {
    console.error("CHECK CERTIFICATE ELIGIBILITY ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to check certificate eligibility",
    });
  }
};

exports.generateCertificate = async (req, res) => {
  try {
    const { internshipId } = req.params;
    const userId = getUserId(req);

    const purchase = await Purchase.findOne({
      userId,
      internshipId,
      paymentStatus: "paid",
    });

    if (!purchase) {
      return res.status(403).json({
        success: false,
        message: "You have not purchased this internship",
      });
    }

    const internship = await Internship.findById(internshipId);
    if (!internship) {
      return res.status(404).json({
        success: false,
        message: "Internship not found",
      });
    }

    if (!internship.certificateEnabled) {
      return res.status(403).json({
        success: false,
        message: "Certificate is disabled for this internship",
      });
    }

    const progress = await ensureProgressDoc({
      internship,
      internshipId,
      purchase,
      userId,
    });

    await applyCertificateDerivedFields({
      internship,
      internshipId,
      progress,
      userId,
    });

    await progress.save();

    if (!progress.certificateEligible) {
      return res.status(403).json({
        success: false,
        message: "You are not eligible for certificate yet",
      });
    }

    let certificate = await Certificate.findOne({
      userId,
      internshipId,
    });

    if (!certificate) {
      certificate = await Certificate.create({
        userId,
        internshipId,
        purchaseId: purchase._id,
        certificateId: generateCertificateId(),
        issuedAt: new Date(),
        status: "issued",
      });
    } else {
      if (!certificate.certificateId) {
        certificate.certificateId = generateCertificateId();
      }
      certificate.purchaseId = certificate.purchaseId || purchase._id;
      certificate.issuedAt = certificate.issuedAt || new Date();
      certificate.status = "issued";
      await certificate.save();
    }

    return res.status(200).json({
      success: true,
      message: "Certificate ready",
      certificate,
    });
  } catch (error) {
    console.error("GENERATE CERTIFICATE ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to generate certificate",
    });
  }
};

exports.downloadCertificate = async (req, res) => {
  try {
    const { certificateId } = req.params;
    const userId = getUserId(req);

    const certificate = await Certificate.findOne({
      certificateId,
      status: "issued",
    });

    if (!certificate) {
      return res.status(404).json({
        success: false,
        message: "Certificate not found",
      });
    }

    if (String(certificate.userId) !== String(userId)) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to download this certificate",
      });
    }

    const user = await User.findById(certificate.userId);
    const internship = await Internship.findById(certificate.internshipId);
    const purchase = await Purchase.findById(certificate.purchaseId);

    if (!user || !internship) {
      return res.status(404).json({
        success: false,
        message: "Certificate data is incomplete",
      });
    }

    const issuedDate = new Date(
      certificate.issuedAt || certificate.createdAt || new Date()
    ).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });

    const doc = new PDFDocument({
      size: "A4",
      layout: "landscape",
      margins: {
        top: 34,
        bottom: 34,
        left: 34,
        right: 34,
      },
    });

    const safeName = (user?.name || "candidate")
      .replace(/[^a-z0-9]/gi, "_")
      .replace(/_+/g, "_")
      .replace(/^_|_$/g, "");
    const fileName = `${safeName || "candidate"}_certificate.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);

    doc.pipe(res);

    const logoPath = path.join(__dirname, "../uploads/branding/logo.png");
    const signaturePath = path.join(__dirname, "../uploads/branding/signature.png");
    const sealPath = path.join(__dirname, "../uploads/branding/seal.png");

    const hasLogo = fs.existsSync(logoPath);
    const hasSignature = fs.existsSync(signaturePath);
    const hasSeal = fs.existsSync(sealPath);

    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;
    const left = doc.page.margins.left;
    const right = pageWidth - doc.page.margins.right;
    const contentWidth = right - left;

    const colors = {
      navy: "#0B1736",
      gold: "#B7892E",
      goldLight: "#E7D3A5",
      cream: "#FCFBF7",
      text: "#1F2937",
      soft: "#6B7280",
      white: "#FFFFFF",
    };

    doc.rect(0, 0, pageWidth, pageHeight).fill(colors.cream);

    const outerX = 16;
    const outerY = 16;
    const outerW = pageWidth - 32;
    const outerH = pageHeight - 32;

    const innerX = 30;
    const innerY = 30;
    const innerW = pageWidth - 60;
    const innerH = pageHeight - 60;

    doc
      .lineWidth(2.4)
      .strokeColor("#B7892E")
      .roundedRect(outerX, outerY, outerW, outerH, 10)
      .stroke();

    doc
      .lineWidth(1.2)
      .strokeColor("#D9BE7A")
      .roundedRect(innerX, innerY, innerW, innerH, 8)
      .stroke();

    doc
      .lineWidth(0.8)
      .strokeColor("#E9D8A6")
      .roundedRect(innerX + 8, innerY + 8, innerW - 16, innerH - 16, 6)
      .stroke();

    const drawCorner = (x, y, flipX = 1, flipY = 1) => {
      doc.save();
      doc.translate(x, y);
      doc.scale(flipX, flipY);

      doc
        .lineWidth(2)
        .strokeColor("#B7892E")
        .moveTo(0, 28)
        .bezierCurveTo(0, 8, 8, 0, 28, 0)
        .stroke();

      doc
        .lineWidth(1.2)
        .strokeColor("#D9BE7A")
        .moveTo(8, 28)
        .bezierCurveTo(8, 14, 14, 8, 28, 8)
        .stroke();

      doc
        .lineWidth(1.2)
        .strokeColor("#B7892E")
        .circle(10, 10, 2.2)
        .stroke();

      doc
        .lineWidth(1)
        .strokeColor("#D9BE7A")
        .moveTo(28, 0)
        .lineTo(52, 0)
        .stroke();

      doc
        .lineWidth(1)
        .strokeColor("#D9BE7A")
        .moveTo(0, 28)
        .lineTo(0, 52)
        .stroke();

      doc.restore();
    };

    drawCorner(outerX + 8, outerY + 8, 1, 1);
    drawCorner(pageWidth - outerX - 8, outerY + 8, -1, 1);
    drawCorner(outerX + 8, pageHeight - outerY - 8, 1, -1);
    drawCorner(pageWidth - outerX - 8, pageHeight - outerY - 8, -1, -1);

    const drawCenterFlourish = (centerX, y, flipY = 1) => {
      doc.save();
      doc.translate(centerX, y);
      doc.scale(1, flipY);

      doc
        .lineWidth(1.5)
        .strokeColor("#B7892E")
        .moveTo(-34, 0)
        .bezierCurveTo(-24, -10, -12, -10, 0, 0)
        .bezierCurveTo(12, -10, 24, -10, 34, 0)
        .stroke();

      doc
        .lineWidth(1)
        .strokeColor("#D9BE7A")
        .moveTo(-18, 0)
        .bezierCurveTo(-10, -6, -4, -6, 0, 0)
        .bezierCurveTo(4, -6, 10, -6, 18, 0)
        .stroke();

      doc.circle(0, 0, 2.2).fillAndStroke("#B7892E", "#B7892E");

      doc.restore();
    };

    drawCenterFlourish(pageWidth / 2, outerY + 10, 1);
    drawCenterFlourish(pageWidth / 2, pageHeight - outerY - 10, -1);

    if (hasLogo) {
      try {
        doc.image(logoPath, left + 8, 38, {
          fit: [240, 96],
          align: "left",
          valign: "center",
        });
      } catch (e) {}
    } else {
      doc
        .font("Helvetica-Bold")
        .fontSize(20)
        .fillColor(colors.navy)
        .text("Internova", left + 8, 52);
    }

    doc
      .font("Helvetica-Bold")
      .fontSize(18)
      .fillColor(colors.gold)
      .text("INTERNSHIP COMPLETION CERTIFICATE", left, 54, {
        width: contentWidth,
        align: "center",
      });

    doc
      .font("Helvetica")
      .fontSize(15)
      .fillColor(colors.navy)
      .text("Internova", left, 82, {
        width: contentWidth,
        align: "center",
      });

    doc
      .strokeColor(colors.goldLight)
      .lineWidth(1.2)
      .moveTo(180, 112)
      .lineTo(pageWidth - 180, 112)
      .stroke();

    doc
      .font("Helvetica")
      .fontSize(18)
      .fillColor(colors.soft)
      .text("This is to proudly certify that", left, 146, {
        width: contentWidth,
        align: "center",
      });

    doc
      .font("Helvetica-Bold")
      .fontSize(31)
      .fillColor(colors.navy)
      .text(user?.name || "Candidate", left, 182, {
        width: contentWidth,
        align: "center",
      });

    doc
      .font("Helvetica")
      .fontSize(15.5)
      .fillColor(colors.text)
      .text(
        `has successfully completed the ${internship?.title || "Training Program"}`,
        left,
        238,
        {
          width: contentWidth,
          align: "center",
        }
      );

    doc
      .font("Helvetica")
      .fontSize(14.5)
      .fillColor(colors.text)
      .text(
        `under the ${internship?.branch || "General"} stream for a duration of ${getPurchaseDurationLabel(
          purchase,
          internship
        )}.`,
        left,
        268,
        {
          width: contentWidth,
          align: "center",
        }
      );

    doc
      .font("Helvetica")
      .fontSize(12.8)
      .fillColor(colors.soft)
      .text(
        "The candidate has fulfilled the required learning progress and assessment criteria as defined by Internova.",
        left,
        310,
        {
          width: contentWidth,
          align: "center",
        }
      );

    const infoX = 110;
    const infoY = 368;
    const infoW = pageWidth - 250;
    const infoH = 58;

    doc
      .roundedRect(infoX, infoY, infoW, infoH, 10)
      .fillAndStroke(colors.white, "#E6D6B1");

    doc
      .font("Helvetica-Bold")
      .fontSize(10.5)
      .fillColor(colors.text)
      .text("Certificate ID", infoX + 18, infoY + 12)
      .text("Issue Date", infoX + 255, infoY + 12)
      .text("Status", infoX + 448, infoY + 12);

    doc
      .font("Helvetica")
      .fontSize(10.5)
      .fillColor(colors.soft)
      .text(certificate.certificateId, infoX + 18, infoY + 30, { width: 200 })
      .text(issuedDate, infoX + 255, infoY + 30, { width: 150 })
      .text("VERIFIED", infoX + 448, infoY + 30, { width: 100 });

    const signBaseY = pageHeight - 132;

    if (hasSignature) {
      try {
        doc.image(signaturePath, 86, signBaseY - 22, {
          fit: [150, 55],
        });
      } catch (e) {}
    }

    doc
      .strokeColor("#94A3B8")
      .lineWidth(1)
      .moveTo(84, signBaseY + 18)
      .lineTo(248, signBaseY + 18)
      .stroke();

    doc
      .font("Helvetica-Bold")
      .fontSize(11.5)
      .fillColor(colors.navy)
      .text("Authorized Signatory", 92, signBaseY + 28);

    doc
      .font("Helvetica")
      .fontSize(10.5)
      .fillColor(colors.soft)
      .text("Internova", 92, signBaseY + 46);

    if (hasSeal) {
      try {
        doc.image(sealPath, 276, signBaseY - 42, {
          fit: [190, 190],
        });
      } catch (e) {}
    } else {
      doc
        .circle(360, signBaseY + 34, 55)
        .fillAndStroke("#DBEAFE", "#93C5FD");

      doc
        .font("Helvetica-Bold")
        .fontSize(14)
        .fillColor("#1D4ED8")
        .text("SEALED", 320, signBaseY + 28, {
          width: 80,
          align: "center",
        });
    }

    const verifyUrl = `${getVerifyBaseUrl()}/verify/${certificate.certificateId}`;
    const qrDataUrl = await QRCode.toDataURL(verifyUrl);
    const qrBase64 = qrDataUrl.replace(/^data:image\/png;base64,/, "");
    const qrBuffer = Buffer.from(qrBase64, "base64");

    const qrX = pageWidth - 150;
    const qrY = pageHeight - 155;

    doc
      .roundedRect(qrX - 10, qrY - 10, 108, 124, 10)
      .fillAndStroke("#FFFFFF", "#E5D4AE");

    doc.image(qrBuffer, qrX, qrY, {
      fit: [86, 86],
    });

    doc
      .font("Helvetica")
      .fontSize(9.2)
      .fillColor(colors.soft)
      .text("Scan to verify", qrX - 6, qrY + 92, {
        width: 100,
        align: "center",
      });

    doc.end();
  } catch (error) {
    console.error("DOWNLOAD CERTIFICATE ERROR:", error);
    if (!res.headersSent) {
      return res.status(500).json({
        success: false,
        message: "Failed to download certificate",
      });
    }
  }
};

exports.verifyCertificate = async (req, res) => {
  try {
    const { certificateId } = req.params;

    const certificate = await Certificate.findOne({
      certificateId,
      status: "issued",
    });

    if (!certificate) {
      return res.status(404).json({
        success: false,
        message: "Certificate not found or invalid",
      });
    }

    const user = await User.findById(certificate.userId).select("name email");
    const internship = await Internship.findById(certificate.internshipId).select(
      "title branch category"
    );

    return res.status(200).json({
      success: true,
      verified: true,
      certificate: {
        certificateId: certificate.certificateId,
        issuedAt: certificate.issuedAt,
        candidateName: user?.name || "Candidate",
        candidateEmail: user?.email || "",
        internshipTitle: internship?.title || "Training Program",
        branch: internship?.branch || "",
        category: internship?.category || "",
        status: certificate.status,
      },
    });
  } catch (error) {
    console.error("VERIFY CERTIFICATE ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to verify certificate",
    });
  }
};