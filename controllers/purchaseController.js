const Purchase = require("../models/Purchase");
const User = require("../models/User");
const Internship = require("../models/Internship");
const PDFDocument = require("pdfkit");
const path = require("path");
const fs = require("fs");

const resolveBrandingAsset = (fileNames = []) => {
  const brandingDir = path.join(__dirname, "../uploads/branding");

  for (const fileName of fileNames) {
    const fullPath = path.join(brandingDir, fileName);
    if (fs.existsSync(fullPath)) {
      return fullPath;
    }
  }

  return null;
};

const formatDate = (date) =>
  new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

exports.getMyPurchases = async (req, res) => {
  try {
    const purchases = await Purchase.find({
      userId: req.user.id,
      $or: [
        { purchaseType: "internship" },
        { purchaseType: { $exists: false } },
      ],
    })
      .populate("internshipId")
      .sort({ createdAt: -1 });

    const enhancedPurchases = purchases.map((purchase) => {
      const internship = purchase.internshipId || {};

      return {
        _id: purchase._id,
        purchaseId: purchase._id,
        internshipId: internship._id || null,
        paymentStatus: purchase.paymentStatus,
        amount: purchase.amount,
        durationLabel: purchase.durationLabel,
        purchaseType: purchase.purchaseType || "internship",
        createdAt: purchase.createdAt,
        issueDate: formatDate(purchase.createdAt),
        referenceId: `INV-${purchase._id.toString().slice(-6).toUpperCase()}`,
        razorpayPaymentId: purchase.razorpayPaymentId || "N/A",
        razorpayOrderId: purchase.razorpayOrderId || "N/A",
        offerLetterAvailable:
          purchase.paymentStatus === "paid" &&
          (purchase.purchaseType === "internship" || !purchase.purchaseType),
        paymentSlipAvailable: purchase.paymentStatus === "paid",
        downloadUrl: `/purchases/offer-letter/${purchase._id}`,
        paymentSlipUrl: `/payments/slip/${purchase._id}`,
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
    console.error("GET MY ENROLLMENTS ERROR:", error);
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
      paymentStatus: "paid",
      $or: [
        { purchaseType: "internship" },
        { purchaseType: { $exists: false } },
      ],
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

    const fileName = `${safeName}_offer_letter_${purchase._id
      .toString()
      .slice(-6)
      .toUpperCase()}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);

    doc.pipe(res);

    // Robust asset resolution
    const logoPath =
      resolveBrandingAsset([
        "logo.png",
        "brand_logo.png",
        "brand logo.png",
      ]) || null;

    const signaturePath =
      resolveBrandingAsset([
        "signature.png",
        "signature.PNG",
      ]) || null;

    // seal OR stamp, only one needed
    const sealPath =
      resolveBrandingAsset([
        "seal.png",
        "stamp.png",
        "seal.PNG",
        "stamp.PNG",
      ]) || null;

    const hasLogo = !!logoPath;
    const hasSignature = !!signaturePath;
    const hasSeal = !!sealPath;

    console.log("Offer letter branding assets:", {
      logoPath,
      signaturePath,
      sealPath,
      hasLogo,
      hasSignature,
      hasSeal,
    });

    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;
    const left = doc.page.margins.left;
    const right = pageWidth - doc.page.margins.right;
    const contentWidth = right - left;

    const colors = {
      navy: "#0B1736",
      text: "#1F2937",
      soft: "#64748B",
      border: "#D9E2EC",
      light: "#F8FAFC",
      lightBlue: "#EFF6FF",
      white: "#FFFFFF",
      green: "#065F46",
    };

    const issueDate = formatDate(new Date());
    const referenceId = `INV-${purchase._id.toString().slice(-6).toUpperCase()}`;
    const amountPaid =
      purchase.amount !== undefined && purchase.amount !== null
        ? `INR ${Number(purchase.amount).toFixed(2)}`
        : "INR 0.00";

    // page background
    doc.rect(0, 0, pageWidth, pageHeight).fill(colors.white);

    // outer frame
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

    doc.roundedRect(24, 24, pageWidth - 48, 8, 4).fill(colors.navy);

    // header
    const headerY = 42;
    const headerH = 82;

    doc
      .roundedRect(left, headerY, contentWidth, headerH, 18)
      .fillAndStroke(colors.navy, colors.navy);

    if (hasLogo) {
      try {
        doc.image(logoPath, left + 18, headerY + 10, {
          fit: [90, 58],
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
      .text("PROGRAM OFFER LETTER", left, headerY + 18, {
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

    // meta strip
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
      .text("CONFIRMED", left + 448, metaY + 11, { width: 80 });

    let y = metaY + metaH + 16;

    // recipient
    doc
      .font("Helvetica")
      .fontSize(10.3)
      .fillColor(colors.soft)
      .text("To,", left, y);

    y += 14;

    doc
      .font("Helvetica-Bold")
      .fontSize(11.8)
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

    y += 14;

    doc
      .font("Helvetica-Bold")
      .fontSize(11)
      .fillColor(colors.text)
      .text("Subject: Formal Confirmation of Program Enrollment", left, y);

    y += 22;

    doc
      .font("Helvetica")
      .fontSize(10.2)
      .fillColor(colors.text)
      .text(`Dear ${userName},`, left, y);

    y += 20;

    const bodyText1 = `We are pleased to confirm your successful enrollment in the training program "${internshipTitle}" offered by Internova. Based on your completed registration and payment confirmation, your access has been activated for ${purchase.durationLabel || "the selected duration"}.`;

    const bodyText2 = `This program is designed to provide structured learning, guided practical exposure, and domain-focused skill development. During the access period, you are expected to complete the assigned learning modules, maintain the required progress, and follow all applicable academic and assessment guidelines.`;

    const bodyText3 = `This letter serves as your official offer and enrollment confirmation for the selected program. Certificate issuance remains subject to successful completion of the required progress, assessments, and eligibility criteria defined by Internova.`;

    doc.text(bodyText1, left, y, {
      width: contentWidth,
      align: "justify",
      lineGap: 2,
    });

    y = doc.y + 10;

    doc.text(bodyText2, left, y, {
      width: contentWidth,
      align: "justify",
      lineGap: 2,
    });

    y = doc.y + 10;

    doc.text(bodyText3, left, y, {
      width: contentWidth,
      align: "justify",
      lineGap: 2,
    });

    y = doc.y + 18;

    // enrollment details only
    const cardY = y;
    const cardH = 124;

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

    labelStyle().text("Registered Email", col1X, cardY + 76);
    labelStyle().text("Amount Paid", col2X, cardY + 76);
    valueStyle().text(userEmail, col1X, cardY + 89, { width: 210 });
    valueStyle().text(amountPaid, col2X, cardY + 89, { width: 180 });

    labelStyle().text("Program Name", col1X, cardY + 108);
    valueStyle().text(internshipTitle, col1X, cardY + 121, { width: 420 });

    y = cardY + cardH + 22;

    doc
      .font("Helvetica")
      .fontSize(10)
      .fillColor(colors.text)
      .text(
        "We are delighted to welcome you to Internova and wish you a meaningful and valuable learning journey ahead.",
        left,
        y,
        {
          width: contentWidth,
          align: "justify",
          lineGap: 2,
        }
      );

    // sign area
    const footerY = pageHeight - 44;
    const signBaseY = footerY - 96;

    doc
      .font("Helvetica")
      .fontSize(10.2)
      .fillColor(colors.text)
      .text("Sincerely,", left, signBaseY - 18);

    // signature
    if (hasSignature) {
      try {
        doc.image(signaturePath, left, signBaseY - 2, {
          fit: [150, 46],
          align: "left",
          valign: "center",
        });
      } catch (e) {
        console.error("Signature load error:", e.message);
      }
    } else {
      console.error("Signature file not found");
    }

    doc
      .strokeColor("#94A3B8")
      .lineWidth(1)
      .moveTo(left, signBaseY + 34)
      .lineTo(left + 180, signBaseY + 34)
      .stroke();

    doc
      .font("Helvetica-Bold")
      .fontSize(10.8)
      .fillColor(colors.navy)
      .text("Authorized Signatory", left, signBaseY + 40);

    doc
      .font("Helvetica")
      .fontSize(9.4)
      .fillColor(colors.soft)
      .text("Internova", left, signBaseY + 55)
      .text("Program Management", left, signBaseY + 68);

    // seal (single asset only)
    if (hasSeal) {
      try {
        doc.save();
        doc.opacity(0.98);
        doc.image(sealPath, right - 150, signBaseY - 26, {
          fit: [132, 132],
          align: "right",
          valign: "center",
        });
        doc.restore();
      } catch (e) {
        console.error("Seal load error:", e.message);
      }
    } else {
      console.error("Seal/Stamp file not found");
    }

    // footer line
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