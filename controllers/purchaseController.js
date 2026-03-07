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
            paymentStatus: "paid",
        })
            .populate("internshipId")
            .sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            count: purchases.length,
            purchases,
        });
    } catch (error) {
        console.error("GET MY PURCHASES ERROR:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch purchases",
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
    }).populate("internshipId");

    if (!purchase) {
      return res.status(404).json({
        success: false,
        message: "Paid purchase not found",
      });
    }

    const user = await User.findById(req.user.id);
    const internship = purchase.internshipId;

    const doc = new PDFDocument({
      size: "A4",
      margins: {
        top: 40,
        bottom: 45,
        left: 45,
        right: 45,
      },
    });

    const path = require("path");
    const fs = require("fs");

    const safeName = (user.name || "candidate").replace(/[^a-z0-9]/gi, "_");
    const fileName = `${safeName}_offer_letter.pdf`;

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

    const ensureSpace = (needed = 120) => {
      if (doc.y + needed > pageHeight - doc.page.margins.bottom - 30) {
        doc.addPage();
      }
    };

    const drawDivider = () => {
      doc
        .strokeColor(colors.border)
        .lineWidth(1)
        .moveTo(left, doc.y)
        .lineTo(right, doc.y)
        .stroke();
      doc.moveDown(0.8);
    };

    const drawInfoRow = (label1, value1, label2, value2, startY) => {
      const col1X = left + 18;
      const col2X = left + 300;

      doc
        .font("Helvetica-Bold")
        .fontSize(10.4)
        .fillColor(colors.text)
        .text(label1, col1X, startY)
        .text(label2, col2X, startY);

      doc
        .font("Helvetica")
        .fontSize(10.2)
        .fillColor(colors.soft)
        .text(value1, col1X, startY + 14, { width: 220 })
        .text(value2, col2X, startY + 14, { width: 170 });
    };

    // Page background
    doc.rect(0, 0, pageWidth, pageHeight).fill(colors.white);

    // Outer border
    doc
      .lineWidth(1)
      .strokeColor("#E5E7EB")
      .roundedRect(18, 18, pageWidth - 36, pageHeight - 36, 16)
      .stroke();

    // ================= HEADER =================
    const headerY = doc.y;
    const headerH = 88;

    doc
      .roundedRect(left, headerY, contentWidth, headerH, 18)
      .fillAndStroke(colors.navy, colors.navy);

    if (hasLogo) {
      try {
        doc.image(logoPath, left + 18, headerY + 21, {
          fit: [60, 42],
          align: "left",
          valign: "center",
        });
      } catch (e) {}
    }

    doc
      .fillColor(colors.white)
      .font("Helvetica-Bold")
      .fontSize(23)
      .text("INTERNSHIP OFFER LETTER", left, headerY + 20, {
        width: contentWidth,
        align: "center",
      });

    doc
      .font("Helvetica")
      .fontSize(12.5)
      .fillColor("#CBD5E1")
      .text("Internova", left, headerY + 52, {
        width: contentWidth,
        align: "center",
      });

    doc.y = headerY + headerH + 12;

    // ============== META STRIP BELOW HEADER ==============
    const metaY = doc.y;
    const metaH = 42;

    doc
      .roundedRect(left, metaY, contentWidth, metaH, 12)
      .fillAndStroke("#F8FAFC", "#E2E8F0");

    doc
      .font("Helvetica-Bold")
      .fontSize(10.5)
      .fillColor(colors.text)
      .text("Issue Date", left + 18, metaY + 13)
      .text("Reference ID", left + 280, metaY + 13);

    doc
      .font("Helvetica")
      .fontSize(10.5)
      .fillColor(colors.soft)
      .text(issueDate, left + 95, metaY + 13, {
        width: 120,
      })
      .text(referenceId, left + 375, metaY + 13, {
        width: 120,
      });

    doc.y = metaY + metaH + 18;

    // Watermark
    doc.save();
    doc.rotate(-35, { origin: [300, 430] });
    doc
      .fillColor("#F1F5F9")
      .font("Helvetica-Bold")
      .fontSize(46)
      .text("INTERNOVA", 130, 410);
    doc.restore();

    // ================= RECIPIENT =================
    doc
      .font("Helvetica")
      .fontSize(11)
      .fillColor(colors.soft)
      .text("To,", left, doc.y);

    doc.moveDown(0.35);

    doc
      .font("Helvetica-Bold")
      .fontSize(12)
      .fillColor(colors.text)
      .text(user.name || "Candidate");

    doc
      .font("Helvetica")
      .fontSize(10.6)
      .fillColor(colors.soft)
      .text(user.email || "N/A");

    doc.moveDown(0.8);

    drawDivider();

    // ================= SUBJECT =================
    doc
      .font("Helvetica-Bold")
      .fontSize(12)
      .fillColor(colors.text)
      .text("Subject: Formal Offer of Internship Enrollment");

    doc.moveDown(0.9);

    // ================= BODY =================
    doc
      .font("Helvetica")
      .fontSize(11.1)
      .fillColor(colors.text)
      .text(`Dear ${user.name},`, {
        lineGap: 4,
      });

    doc.moveDown(0.7);

    doc.text(
      `We are pleased to confirm your enrollment in the internship program "${internship.title}" offered by Internova. Based on your successful registration and payment confirmation, you have been provisionally admitted to the internship for a duration of ${purchase.durationLabel}.`,
      {
        width: contentWidth,
        align: "justify",
        lineGap: 4,
      }
    );

    doc.moveDown(0.7);

    doc.text(
      `This internship is designed to provide structured learning, guided practical exposure, and domain-focused skill development. During the internship tenure, you will be expected to complete the prescribed modules, maintain the required progress, and participate in assessments wherever applicable.`,
      {
        width: contentWidth,
        align: "justify",
        lineGap: 4,
      }
    );

    doc.moveDown(0.7);

    doc.text(
      `Please note that this document serves as your official internship offer letter. Final certificate issuance shall remain subject to successful completion of the applicable requirements, including minimum course progress and assessment eligibility as defined by Internova.`,
      {
        width: contentWidth,
        align: "justify",
        lineGap: 4,
      }
    );

    doc.moveDown(1.1);

    // ================= DETAILS CARD =================
    ensureSpace(225);

    const cardY = doc.y;
    const cardHeight = 176;

    doc
      .roundedRect(left, cardY, contentWidth, cardHeight, 14)
      .fillAndStroke(colors.light, "#E2E8F0");

    doc
      .roundedRect(left, cardY, contentWidth, 36, 14)
      .fillAndStroke(colors.lightBlue, colors.lightBlue);

    doc
      .font("Helvetica-Bold")
      .fontSize(12.8)
      .fillColor(colors.navy)
      .text("Internship Enrollment Details", left + 18, cardY + 12);

    drawInfoRow(
      "Candidate Name",
      user.name || "N/A",
      "Duration",
      purchase.durationLabel || "N/A",
      cardY + 52
    );

    drawInfoRow(
      "Registered Email",
      user.email || "N/A",
      "Amount Paid",
      `INR ${purchase.amount}`,
      cardY + 84
    );

    drawInfoRow(
      "Program Name",
      internship.title || "N/A",
      "Status",
      (purchase.paymentStatus || "paid").toUpperCase(),
      cardY + 116
    );

    doc
      .font("Helvetica-Bold")
      .fontSize(10.4)
      .fillColor(colors.text)
      .text("Branch / Stream", left + 18, cardY + 148)
      .text("Category", left + 300, cardY + 148);

    doc
      .font("Helvetica")
      .fontSize(10.2)
      .fillColor(colors.soft)
      .text(internship.branch || "N/A", left + 18, cardY + 162, { width: 220 })
      .text(internship.category || "N/A", left + 300, cardY + 162, { width: 170 });

    doc.y = cardY + cardHeight + 16;

    // ================= PAYMENT BOX =================
    ensureSpace(95);

    const payY = doc.y;
    const payH = 68;

    doc
      .roundedRect(left, payY, contentWidth, payH, 12)
      .fillAndStroke("#FFFFFF", colors.border);

    doc
      .font("Helvetica-Bold")
      .fontSize(10.5)
      .fillColor(colors.text)
      .text("Payment Information", left + 16, payY + 11);

    doc
      .font("Helvetica")
      .fontSize(10)
      .fillColor(colors.soft)
      .text(`Payment ID: ${purchase.razorpayPaymentId || "N/A"}`, left + 16, payY + 31, {
        width: 240,
      })
      .text(`Order ID: ${purchase.razorpayOrderId || "N/A"}`, left + 280, payY + 31, {
        width: 220,
      });

    doc.y = payY + payH + 16;

    // ================= IMPORTANT NOTE =================
    ensureSpace(105);

    const noteY = doc.y;
    const noteH = 76;

    doc
      .roundedRect(left, noteY, contentWidth, noteH, 12)
      .fillAndStroke(colors.warnBg, colors.warnBorder);

    doc
      .font("Helvetica-Bold")
      .fontSize(11)
      .fillColor(colors.warnText)
      .text("Important Note", left + 16, noteY + 11);

    doc
      .font("Helvetica")
      .fontSize(10.2)
      .fillColor(colors.warnText)
      .text(
        "This offer letter confirms internship enrollment only. Certificate issuance will depend on successful completion of progress requirements, assessments, and internal eligibility conditions defined by Internova.",
        left + 16,
        noteY + 29,
        {
          width: contentWidth - 32,
          align: "justify",
          lineGap: 3,
        }
      );

    doc.y = noteY + noteH + 18;

    // ================= CLOSING =================
    ensureSpace(145);

    doc
      .font("Helvetica")
      .fontSize(11.1)
      .fillColor(colors.text)
      .text(
        "We are delighted to welcome you to Internova and wish you a valuable, practical, and enriching internship journey ahead.",
        {
          width: contentWidth,
          align: "justify",
          lineGap: 4,
        }
      );

    doc.moveDown(1.6);

    doc
      .font("Helvetica")
      .fontSize(11)
      .fillColor(colors.text)
      .text("Sincerely,");

    doc.moveDown(1.5);

    // ================= SIGNATURE =================
    const signY = doc.y;

    if (hasSignature) {
      try {
        doc.image(signaturePath, left, signY - 8, {
          fit: [140, 42],
        });
      } catch (e) {}
    }

    doc
      .strokeColor("#94A3B8")
      .lineWidth(1)
      .moveTo(left, signY + 30)
      .lineTo(left + 180, signY + 30)
      .stroke();

    doc
      .font("Helvetica-Bold")
      .fontSize(11.5)
      .fillColor(colors.navy)
      .text("Authorized Signatory", left, signY + 38);

    doc
      .font("Helvetica")
      .fontSize(10.4)
      .fillColor(colors.soft)
      .text("Internova", left, signY + 54)
      .text("Internship Program Management", left, signY + 68);

    if (hasSeal) {
      try {
        doc.image(sealPath, right - 90, signY + 2, {
          fit: [68, 68],
          align: "right",
        });
      } catch (e) {}
    } else {
      doc
        .circle(right - 50, signY + 34, 27)
        .fillAndStroke(colors.greenBg, "#A7F3D0");

      doc
        .fillColor(colors.green)
        .font("Helvetica-Bold")
        .fontSize(8.8)
        .text("VERIFIED", right - 78, signY + 30, {
          width: 56,
          align: "center",
        });
    }

    // ================= FOOTER =================
    const footerY = pageHeight - 52;

    doc
      .strokeColor(colors.border)
      .lineWidth(1)
      .moveTo(left, footerY - 10)
      .lineTo(right, footerY - 10)
      .stroke();

    doc
      .font("Helvetica")
      .fontSize(9.2)
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
    console.error("DOWNLOAD OFFER LETTER ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to generate offer letter",
    });
  }
};