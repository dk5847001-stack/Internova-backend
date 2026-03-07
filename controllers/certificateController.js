const path = require("path");
const fs = require("fs");
const Certificate = require("../models/Certificate");
const Internship = require("../models/Internship");
const User = require("../models/User");
const Purchase = require("../models/Purchase");
const generateCertificatePdf = require("../utils/generateCertificatePdf");

const generateCertificateId = () => {
  const random = Math.floor(100000 + Math.random() * 900000);
  return `CERT-${Date.now()}-${random}`;
};

// POST /api/certificates/generate/:internshipId
exports.generateCertificate = async (req, res) => {
  try {
    const userId = req.user.id;
    const { internshipId } = req.params;
    const { duration } = req.body;

    const user = await User.findById(userId);
    const internship = await Internship.findById(internshipId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (!internship) {
      return res.status(404).json({
        success: false,
        message: "Internship not found",
      });
    }

    const purchased = await Purchase.findOne({
      userId: userId,
      internshipId: internshipId,
      paymentStatus: "paid",
    });

    if (!purchased) {
      return res.status(403).json({
        success: false,
        message: "Please purchase this internship before generating certificate",
      });
    }

    const existingCertificate = await Certificate.findOne({
      user: userId,
      internship: internshipId,
    });

    if (existingCertificate) {
      return res.status(200).json({
        success: true,
        message: "Certificate already generated",
        certificate: existingCertificate,
        downloadUrl: `/api/certificates/${existingCertificate.certificateId}/download`,
      });
    }

    const certificateId = generateCertificateId();
    const issueDate = new Date();

    const finalDuration = duration || purchased.durationLabel || "Not specified";

    const pdfResult = await generateCertificatePdf({
      studentName: user.name,
      internshipTitle: internship.title,
      duration: finalDuration,
      certificateId,
      issueDate,
    });

    const pdfUrl = `/uploads/certificates/${pdfResult.fileName}`;

    const certificate = await Certificate.create({
      user: userId,
      internship: internshipId,
      certificateId,
      studentName: user.name,
      internshipTitle: internship.title,
      duration: finalDuration,
      issueDate,
      pdfUrl,
    });

    return res.status(201).json({
      success: true,
      message: "Certificate generated successfully",
      certificate,
      downloadUrl: `/api/certificates/${certificate.certificateId}/download`,
    });
  } catch (error) {
    console.error("Generate Certificate Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to generate certificate",
      error: error.message,
    });
  }
};

// GET /api/certificates/:certificateId/download
exports.downloadCertificate = async (req, res) => {
  try {
    const { certificateId } = req.params;

    const certificate = await Certificate.findOne({ certificateId });

    if (!certificate) {
      return res.status(404).json({
        success: false,
        message: "Certificate not found",
      });
    }

    const filePath = path.join(
      __dirname,
      "..",
      certificate.pdfUrl.replace(/^\/+/, "")
    );

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: "Certificate PDF file not found",
      });
    }

    return res.download(filePath, `${certificate.studentName}-certificate.pdf`);
  } catch (error) {
    console.error("Download Certificate Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to download certificate",
      error: error.message,
    });
  }
};

// GET /api/certificates/verify/:certificateId
exports.verifyCertificate = async (req, res) => {
  try {
    const { certificateId } = req.params;

    const certificate = await Certificate.findOne({ certificateId })
      .populate("user", "name email")
      .populate("internship", "title");

    if (!certificate) {
      return res.status(404).json({
        success: false,
        message: "Invalid certificate ID",
      });
    }

    return res.status(200).json({
      success: true,
      certificate,
    });
  } catch (error) {
    console.error("Verify Certificate Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to verify certificate",
      error: error.message,
    });
  }
};