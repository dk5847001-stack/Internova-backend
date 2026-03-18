const Purchase = require("../models/Purchase");
const User = require("../models/User");
const Internship = require("../models/Internship");
const PDFDocument = require("pdfkit");
const path = require("path");
const fs = require("fs");

exports.getMyPurchases = async (req, res) => {
  try {
    const purchases = await Purchase.find({
      userId: req.user.id,
      purchaseType: "internship",
    })
      .populate("internshipId")
      .sort({ createdAt: -1 });

    const formatDate = (date) =>
      new Date(date).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });

    const enhancedPurchases = purchases.map((purchase) => {
      const internship = purchase.internshipId || {};

      return {
        _id: purchase._id,
        purchaseId: purchase._id,
        internshipId: internship._id || null,
        paymentStatus: purchase.paymentStatus,
        amount: purchase.amount,
        durationLabel: purchase.durationLabel,
        createdAt: purchase.createdAt,
        issueDate: formatDate(purchase.createdAt),
        referenceId: `INV-${purchase._id.toString().slice(-6).toUpperCase()}`,
        razorpayPaymentId: purchase.razorpayPaymentId || "N/A",
        razorpayOrderId: purchase.razorpayOrderId || "N/A",
        offerLetterAvailable: purchase.paymentStatus === "paid",
        downloadUrl: `/purchases/offer-letter/${purchase._id}`,
        internshipTitle: internship.title || "N/A",
        branch: internship.branch || "N/A",
        category: internship.category || "N/A",
      };
    });

    return res.status(200).json({
      success: true,
      count: enhancedPurchases.length,
      purchases: enhancedPurchases,
    });
  } catch (error) {
    console.error("GET MY Enrollments ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch enrollments",
    });
  }
};

exports.downloadOfferLetter = async (req, res) => {
  try {
    const { purchaseId } = req.params;

    const purchase = await Purchase.findOne({
      _id: purchaseId,
      userId: req.user.id,
      purchaseType: "internship",
      paymentStatus: "paid",
    }).populate("internshipId");

    if (!purchase) {
      return res.status(404).json({
        success: false,
        message: "Paid purchase not found",
      });
    }

    const user = await User.findById(req.user.id);
    const internship = purchase.internshipId || {};

    const userName = user?.name || "Candidate";
    const userEmail = user?.email || "N/A";
    const internshipTitle = internship?.title || "Program";

    const doc = new PDFDocument({
      size: "A4",
      margins: {
        top: 32,
        bottom: 32,
        left: 38,
        right: 38,
      },
    });

    const safeName = userName
      .replace(/[^a-z0-9]/gi, "_")
      .replace(/_+/g, "_")
      .replace(/^_|_$/g, "");

    const fileName = `${safeName}_access_letter_${purchase._id
      .toString()
      .slice(-6)
      .toUpperCase()}.pdf`;

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
      navySoft: "#1E2B4A",
      blue: "#2563EB",
      text: "#1F2937",
      soft: "#64748B",
      border: "#D9E2EC",
      light: "#F8FAFC",
      lightBlue: "#EFF6FF",
      warnBg: "#FFF7ED",
      warnBorder: "#FED7AA",
      warnText: "#9A3412",
      white: "#FFFFFF",
      green: "#065F46",
      greenBg: "#D1FAE5",
    };

    const formatDate = (date) =>
      new Date(date).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });

    const issueDate = formatDate(new Date());
    const referenceId = `INV-${purchase._id.toString().slice(-6).toUpperCase()}`;

    const amountPaid =
      purchase.amount !== undefined && purchase.amount !== null
        ? `INR ${Number(purchase.amount).toFixed(2)}`
        : "INR 0.00";

    doc.rect(0, 0, pageWidth, pageHeight).fill(colors.white);

    doc
      .lineWidth(1.2)
      .strokeColor("#E5E7EB")
      .roundedRect(16, 16, pageWidth - 32, pageHeight - 32, 18)
      .stroke();

    doc
      .lineWidth(0.8)
      .strokeColor("#F1F5F9")
      .roundedRect(24, 24, pageWidth - 48, pageHeight - 48, 16)
      .stroke();

    doc
      .roundedRect(24, 24, pageWidth - 48, 8, 4)
      .fill(colors.navy);

    const headerY = 42;
    const headerH = 82;

    doc
      .roundedRect(left, headerY, contentWidth, headerH, 18)
      .fillAndStroke(colors.navy, colors.navy);

    if (hasLogo) {
      try {
        doc.image(logoPath, left + 18, headerY + 11, {
          fit: [88, 58],
          align: "left",
          valign: "center",
        });
      } catch (e) {
        console.error("Logo load error:", e.message);
      }
    }

    doc
      .fillColor(colors.white)
      .font("Helvetica-Bold")
      .fontSize(21)
      .text("PROGRAM ACCESS LETTER", left, headerY + 18, {
        width: contentWidth,
        align: "center",
      });

    doc
      .font("Helvetica")
      .fontSize(11.5)
      .fillColor("#CBD5E1")
      .text("Internova", left, headerY + 48, {
        width: contentWidth,
        align: "center",
      });

    const metaY = headerY + headerH + 10;
    const metaH = 34;

    doc
      .roundedRect(left, metaY, contentWidth, metaH, 10)
      .fillAndStroke("#F8FAFC", "#E2E8F0");

    doc
      .font("Helvetica-Bold")
      .fontSize(9.5)
      .fillColor(colors.text)
      .text("Issue Date:", left + 16, metaY + 11)
      .text("Reference ID:", left + 210, metaY + 11)
      .text("Status:", left + 415, metaY + 11);

    doc
      .font("Helvetica")
      .fontSize(9.5)
      .fillColor(colors.soft)
      .text(issueDate, left + 74, metaY + 11, { width: 120 })
      .text(referenceId, left + 287, metaY + 11, { width: 120 })
      .text("PAID", left + 457, metaY + 11, { width: 70 });

    let y = metaY + metaH + 14;

    doc
      .font("Helvetica")
      .fontSize(10.3)
      .fillColor(colors.soft)
      .text("To,", left, y);

    y += 14;

    doc
      .font("Helvetica-Bold")
      .fontSize(11.6)
      .fillColor(colors.text)
      .text(userName, left, y);

    y += 15;

    doc
      .font("Helvetica")
      .fontSize(9.8)
      .fillColor(colors.soft)
      .text(userEmail, left, y);

    y += 22;

    doc
      .strokeColor(colors.border)
      .lineWidth(1)
      .moveTo(left, y)
      .lineTo(right, y)
      .stroke();

    y += 12;

    doc
      .font("Helvetica-Bold")
      .fontSize(11)
      .fillColor(colors.text)
      .text("Subject:  Formal Offer Letter of Internship Enrollment", left, y);

    y += 20;

    doc
      .font("Helvetica")
      .fontSize(10.2)
      .fillColor(colors.text)
      .text(`Dear ${userName},`, left, y);

    y += 18;

    const bodyText1 = `We are pleased to confirm your enrollment in the training program "${internshipTitle}" offered by Internova. Based on your successful registration and payment confirmation, you have been granted access for a duration of ${purchase.durationLabel || "the selected period"}.`;

    const bodyText2 = `This program is designed to provide structured learning, guided practical exposure, and domain-focused skill development. You are expected to complete the assigned modules, maintain the required progress, and follow the applicable assessment guidelines during the access period.`;

    const bodyText3 = `This document serves as your official internship offer letter. Certificate issuance remains subject to successful completion of the required progress, assessments, and eligibility criteria defined by Internova.`;

    doc.text(bodyText1, left, y, {
      width: contentWidth,
      align: "justify",
      lineGap: 2,
    });

    y = doc.y + 8;

    doc.text(bodyText2, left, y, {
      width: contentWidth,
      align: "justify",
      lineGap: 2,
    });

    y = doc.y + 8;

    doc.text(bodyText3, left, y, {
      width: contentWidth,
      align: "justify",
      lineGap: 2,
    });

    y = doc.y + 16;

    const cardY = y;
    const cardH = 128;

    doc
      .roundedRect(left, cardY, contentWidth, cardH, 14)
      .fillAndStroke(colors.light, "#E2E8F0");

    doc
      .roundedRect(left, cardY, contentWidth, 30, 14)
      .fillAndStroke(colors.lightBlue, colors.lightBlue);

    doc
      .font("Helvetica-Bold")
      .fontSize(11.5)
      .fillColor(colors.navy)
      .text("Enrollment Details", left + 14, cardY + 10);

    const labelStyle = () =>
      doc.font("Helvetica-Bold").fontSize(9.2).fillColor(colors.text);

    const valueStyle = () =>
      doc.font("Helvetica").fontSize(9.2).fillColor(colors.soft);

    const col1X = left + 16;
    const col2X = left + 290;

    labelStyle().text("Learner Name", col1X, cardY + 42);
    labelStyle().text("Duration", col2X, cardY + 42);
    valueStyle().text(userName, col1X, cardY + 55, { width: 210 });
    valueStyle().text(purchase.durationLabel || "N/A", col2X, cardY + 55, {
      width: 180,
    });

    labelStyle().text("Registered Email", col1X, cardY + 74);
    labelStyle().text("Amount Paid", col2X, cardY + 74);
    valueStyle().text(userEmail, col1X, cardY + 87, { width: 210 });
    valueStyle().text(amountPaid, col2X, cardY + 87, { width: 180 });

    labelStyle().text("Program Name", col1X, cardY + 106);
    labelStyle().text("Payment Status", col2X, cardY + 106);
    valueStyle().text(internshipTitle, col1X, cardY + 119, { width: 210 });
    valueStyle().text(
      (purchase.paymentStatus || "paid").toUpperCase(),
      col2X,
      cardY + 119,
      { width: 180 }
    );

    y = cardY + cardH + 14;

    const boxGap = 12;
    const boxW = (contentWidth - boxGap) / 2;
    const boxH = 74;

    doc
      .roundedRect(left, y, boxW, boxH, 12)
      .fillAndStroke("#FFFFFF", colors.border);

    doc
      .font("Helvetica-Bold")
      .fontSize(10)
      .fillColor(colors.text)
      .text("Payment Information", left + 12, y + 10);

    doc
      .font("Helvetica")
      .fontSize(8.8)
      .fillColor(colors.soft)
      .text(`Payment ID: ${purchase.razorpayPaymentId || "N/A"}`, left + 12, y + 28, {
        width: boxW - 24,
      })
      .text(`Order ID: ${purchase.razorpayOrderId || "N/A"}`, left + 12, y + 45, {
        width: boxW - 24,
      });

    const noteX = left + boxW + boxGap;

    doc
      .roundedRect(noteX, y, boxW, boxH, 12)
      .fillAndStroke(colors.warnBg, colors.warnBorder);

    doc
      .font("Helvetica-Bold")
      .fontSize(10)
      .fillColor(colors.warnText)
      .text("Important Note", noteX + 12, y + 10);

    doc
      .font("Helvetica")
      .fontSize(8.7)
      .fillColor(colors.warnText)
      .text(
        "Certificate issuance depends on successful completion of progress, assessments, and internal eligibility requirements.",
        noteX + 12,
        y + 28,
        {
          width: boxW - 24,
          align: "justify",
          lineGap: 1,
        }
      );

    y += boxH + 16;

    doc
      .font("Helvetica")
      .fontSize(10)
      .fillColor(colors.text)
      .text(
        "We are delighted to welcome you to Internova and wish you a valuable learning journey ahead.",
        left,
        y,
        {
          width: contentWidth,
          align: "justify",
          lineGap: 2,
        }
      );

    const footerY = pageHeight - 42;
    const signBaseY = footerY - 92;

    doc
      .font("Helvetica")
      .fontSize(10.2)
      .fillColor(colors.text)
      .text("Sincerely,", left, signBaseY - 18);

    if (hasSignature) {
      try {
        doc.image(signaturePath, left, signBaseY - 4, {
          fit: [125, 34],
        });
      } catch (e) {
        console.error("Signature load error:", e.message);
      }
    }

    doc
      .strokeColor("#94A3B8")
      .lineWidth(1)
      .moveTo(left, signBaseY + 26)
      .lineTo(left + 170, signBaseY + 26)
      .stroke();

    doc
      .font("Helvetica-Bold")
      .fontSize(10.8)
      .fillColor(colors.navy)
      .text("Authorized Signatory", left, signBaseY + 32);

    doc
      .font("Helvetica")
      .fontSize(9.4)
      .fillColor(colors.soft)
      .text("Internova", left, signBaseY + 47)
      .text("Program Management", left, signBaseY + 60);

    if (hasSeal) {
      try {
        doc.image(sealPath, right - 130, signBaseY - 24, {
          fit: [120, 120],
          align: "right",
        });
      } catch (e) {
        console.error("Seal load error:", e.message);
      }
    }

    doc
      .strokeColor(colors.border)
      .lineWidth(1)
      .moveTo(left, footerY - 8)
      .lineTo(right, footerY - 8)
      .stroke();

    doc
      .font("Helvetica")
      .fontSize(8.6)
      .fillColor(colors.soft)
      .text(
        "This is a system-generated document issued by Internova and does not require a physical signature.",
        left,
        footerY,
        {
          width: contentWidth,
          align: "center",
        }
      );

    doc.end();
  } catch (error) {
    console.error("DOWNLOAD ACCESS LETTER ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to generate access letter",
    });
  }
};