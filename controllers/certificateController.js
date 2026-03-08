const path = require("path");
const fs = require("fs");
const PDFDocument = require("pdfkit");
const QRCode = require("qrcode");

const Certificate = require("../models/Certificate");
const Progress = require("../models/Progress");
const Purchase = require("../models/Purchase");
const Internship = require("../models/Internship");
const User = require("../models/User");

const generateCertificateId = () => {
  const random = Math.floor(100000 + Math.random() * 900000);
  return `CERT-${Date.now()}-${random}`;
};

exports.checkCertificateEligibility = async (req, res) => {
  try {
    const { internshipId } = req.params;

    const purchase = await Purchase.findOne({
      userId: req.user.id,
      internshipId,
      paymentStatus: "paid",
    });

    if (!purchase) {
      return res.status(403).json({
        success: false,
        message: "You have not purchased this internship",
      });
    }

    const progress = await Progress.findOne({
      userId: req.user.id,
      internshipId,
    });

    if (!progress) {
      return res.status(200).json({
        success: true,
        eligible: false,
        reason: "Progress not found yet",
      });
    }

    return res.status(200).json({
      success: true,
      eligible: !!progress.finalEligible,
      progress: {
        progressPercent: progress.progressPercent,
        certificateEligible: progress.certificateEligible,
        testPassed: progress.testPassed,
        finalEligible: progress.finalEligible,
      },
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

    const purchase = await Purchase.findOne({
      userId: req.user.id,
      internshipId,
      paymentStatus: "paid",
    });

    if (!purchase) {
      return res.status(403).json({
        success: false,
        message: "You have not purchased this internship",
      });
    }

    const progress = await Progress.findOne({
      userId: req.user.id,
      internshipId,
    });

    if (!progress || !progress.finalEligible) {
      return res.status(403).json({
        success: false,
        message: "You are not eligible for certificate yet",
      });
    }

    let certificate = await Certificate.findOne({
      userId: req.user.id,
      internshipId,
    });

    if (!certificate) {
      certificate = await Certificate.create({
        userId: req.user.id,
        internshipId,
        purchaseId: purchase._id,
        certificateId: generateCertificateId(),
      });
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

    if (certificate.userId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to download this certificate",
      });
    }

    const user = await User.findById(certificate.userId);
    const internship = await Internship.findById(certificate.internshipId);
    const purchase = await Purchase.findById(certificate.purchaseId);

    const issuedDate = new Date(certificate.issuedAt).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });

    const doc = new PDFDocument({
      size: "A4",
      layout: "landscape",
      margins: {
        top: 40,
        bottom: 40,
        left: 40,
        right: 40,
      },
    });

    const safeName = (user.name || "candidate").replace(/[^a-z0-9]/gi, "_");
    const fileName = `${safeName}_certificate.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);

    doc.pipe(res);

    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;
    const left = doc.page.margins.left;
    const right = pageWidth - doc.page.margins.right;
    const contentWidth = right - left;

    const colors = {
      navy: "#0B1736",
      gold: "#B7892E",
      goldLight: "#E8D3A2",
      text: "#1F2937",
      soft: "#6B7280",
      white: "#FFFFFF",
      light: "#FCFBF7",
      border: "#D4C19C",
      green: "#0F766E",
    };

    // background
    doc.rect(0, 0, pageWidth, pageHeight).fill(colors.light);

    // double border
    doc
      .lineWidth(2)
      .strokeColor(colors.gold)
      .roundedRect(18, 18, pageWidth - 36, pageHeight - 36, 12)
      .stroke();

    doc
      .lineWidth(1)
      .strokeColor(colors.goldLight)
      .roundedRect(30, 30, pageWidth - 60, pageHeight - 60, 10)
      .stroke();

    // header
    doc
      .font("Helvetica-Bold")
      .fontSize(18)
      .fillColor(colors.gold)
      .text("INTERNSHIP COMPLETION CERTIFICATE", left, 58, {
        width: contentWidth,
        align: "center",
      });

    doc
      .font("Helvetica")
      .fontSize(15)
      .fillColor(colors.navy)
      .text("Internova", left, 84, {
        width: contentWidth,
        align: "center",
      });

    // decorative line
    doc
      .strokeColor(colors.goldLight)
      .lineWidth(1.5)
      .moveTo(180, 114)
      .lineTo(pageWidth - 180, 114)
      .stroke();

    // body
    doc
      .font("Helvetica")
      .fontSize(18)
      .fillColor(colors.soft)
      .text("This is to proudly certify that", left, 145, {
        width: contentWidth,
        align: "center",
      });

    doc
      .font("Helvetica-Bold")
      .fontSize(32)
      .fillColor(colors.navy)
      .text(user.name, left, 182, {
        width: contentWidth,
        align: "center",
      });

    doc
      .font("Helvetica")
      .fontSize(16)
      .fillColor(colors.text)
      .text(
        `has successfully completed the ${internship.title}`,
        left,
        238,
        {
          width: contentWidth,
          align: "center",
        }
      );

    doc
      .font("Helvetica")
      .fontSize(15)
      .fillColor(colors.text)
      .text(
        `internship program under the ${internship.branch} stream for a duration of ${purchase.durationLabel}.`,
        left,
        266,
        {
          width: contentWidth,
          align: "center",
        }
      );

    doc
      .font("Helvetica")
      .fontSize(13.5)
      .fillColor(colors.soft)
      .text(
        "The candidate has fulfilled the required learning progress and assessment criteria as defined by Internova.",
        left,
        308,
        {
          width: contentWidth,
          align: "center",
        }
      );

    // info strip
    const infoY = 372;
    doc
      .roundedRect(100, infoY, pageWidth - 200, 52, 10)
      .fillAndStroke("#FFFFFF", "#E5D4AE");

    doc
      .font("Helvetica-Bold")
      .fontSize(11)
      .fillColor(colors.text)
      .text("Certificate ID", 120, infoY + 12)
      .text("Issue Date", 355, infoY + 12)
      .text("Status", 560, infoY + 12);

    doc
      .font("Helvetica")
      .fontSize(11)
      .fillColor(colors.soft)
      .text(certificate.certificateId, 120, infoY + 28, { width: 180 })
      .text(issuedDate, 355, infoY + 28, { width: 130 })
      .text("VERIFIED", 560, infoY + 28, { width: 80 });

    // QR code
    const verifyUrl = `http://localhost:3000/verify/${certificate.certificateId}`;
    const qrDataUrl = await QRCode.toDataURL(verifyUrl);
    const qrBase64 = qrDataUrl.replace(/^data:image\/png;base64,/, "");
    const qrBuffer = Buffer.from(qrBase64, "base64");

    doc.image(qrBuffer, pageWidth - 150, pageHeight - 180, {
      fit: [90, 90],
    });

    doc
      .font("Helvetica")
      .fontSize(9.5)
      .fillColor(colors.soft)
      .text("Scan to verify", pageWidth - 162, pageHeight - 82, {
        width: 110,
        align: "center",
      });

    // signature
    const signY = pageHeight - 130;

    doc
      .strokeColor(colors.soft)
      .lineWidth(1)
      .moveTo(90, signY)
      .lineTo(250, signY)
      .stroke();

    doc
      .font("Helvetica-Bold")
      .fontSize(12)
      .fillColor(colors.navy)
      .text("Authorized Signatory", 95, signY + 8);

    doc
      .font("Helvetica")
      .fontSize(10.5)
      .fillColor(colors.soft)
      .text("Internova", 95, signY + 26);

    // seal badge
    doc
      .circle(330, signY + 20, 28)
      .fillAndStroke("#DBEAFE", "#93C5FD");

    doc
      .font("Helvetica-Bold")
      .fontSize(9)
      .fillColor("#1D4ED8")
      .text("SEALED", 305, signY + 16, {
        width: 50,
        align: "center",
      });

    doc.end();
  } catch (error) {
    console.error("DOWNLOAD CERTIFICATE ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to download certificate",
    });
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
        candidateName: user?.name,
        candidateEmail: user?.email,
        internshipTitle: internship?.title,
        branch: internship?.branch,
        category: internship?.category,
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