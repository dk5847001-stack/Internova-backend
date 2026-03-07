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
        top: 50,
        bottom: 50,
        left: 50,
        right: 50,
      },
    });

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
      navy: "#0F172A",
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
        month: "long",
        year: "numeric",
      });

    const issueDate = formatDate(new Date());
    const referenceId = `INVOFF-${purchase._id.toString().slice(-8).toUpperCase()}`;

    const ensureSpace = (needed = 120) => {
      if (doc.y + needed > pageHeight - doc.page.margins.bottom - 40) {
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
      doc.moveDown(1);
    };

    const drawInfoRow = (label1, value1, label2, value2, startY) => {
      const col1X = left + 18;
      const col2X = left + 300;

      doc
        .font("Helvetica-Bold")
        .fontSize(10.5)
        .fillColor(colors.text)
        .text(label1, col1X, startY)
        .text(label2, col2X, startY);

      doc
        .font("Helvetica")
        .fontSize(10.5)
        .fillColor(colors.soft)
        .text(value1, col1X, startY + 14, { width: 220 })
        .text(value2, col2X, startY + 14, { width: 180 });
    };

    // Background
    doc.rect(0, 0, pageWidth, pageHeight).fill(colors.white);

    // Outer border
    doc
      .lineWidth(1)
      .strokeColor("#E5E7EB")
      .roundedRect(18, 18, pageWidth - 36, pageHeight - 36, 16)
      .stroke();

    // Header
    doc
      .roundedRect(left, doc.y, contentWidth, 95, 16)
      .fillAndStroke(colors.navy, colors.navy);

    if (hasLogo) {
      try {
        doc.image(logoPath, left + 18, doc.y + 18, {
          fit: [52, 52],
          align: "left",
          valign: "center",
        });
      } catch (e) {}
    }

    doc
      .fillColor(colors.white)
      .font("Helvetica-Bold")
      .fontSize(24)
      .text("INTERNSHIP OFFER LETTER", left, doc.y + 18, {
        width: contentWidth,
        align: "center",
      });

    doc
      .font("Helvetica")
      .fontSize(13)
      .fillColor("#CBD5E1")
      .text("Internova", left, doc.y + 50, {
        width: contentWidth,
        align: "center",
      });

    doc
      .roundedRect(right - 150, doc.y + 18, 132, 40, 10)
      .fillAndStroke("#1E293B", "#1E293B");

    doc
      .font("Helvetica")
      .fontSize(8.5)
      .fillColor("#CBD5E1")
      .text("Issue Date", right - 138, doc.y + 25)
      .text("Reference ID", right - 138, doc.y + 39);

    doc
      .font("Helvetica-Bold")
      .fontSize(8.5)
      .fillColor(colors.white)
      .text(issueDate, right - 78, doc.y + 25, { width: 48, align: "right" })
      .text(referenceId, right - 92, doc.y + 39, { width: 62, align: "right" });

    doc.y += 115;

    // Watermark
    doc.save();
    doc.rotate(-35, { origin: [300, 420] });
    doc
      .fillColor("#F1F5F9")
      .font("Helvetica-Bold")
      .fontSize(50)
      .text("INTERNOVA", 120, 395);
    doc.restore();

    // Recipient block
    doc
      .font("Helvetica")
      .fontSize(11)
      .fillColor(colors.soft)
      .text("To,", left, doc.y);

    doc.moveDown(0.4);

    doc
      .font("Helvetica-Bold")
      .fontSize(12)
      .fillColor(colors.text)
      .text(user.name || "Candidate");

    doc
      .font("Helvetica")
      .fontSize(10.8)
      .fillColor(colors.soft)
      .text(user.email || "N/A");

    doc.moveDown(0.8);

    doc
      .font("Helvetica")
      .fontSize(10.5)
      .fillColor(colors.soft)
      .text(`Date: ${issueDate}`, {
        align: "right",
      });

    drawDivider();

    // Subject
    doc
      .font("Helvetica-Bold")
      .fontSize(12)
      .fillColor(colors.text)
      .text("Subject: Formal Offer of Internship Enrollment");

    doc.moveDown(1);

    // Body
    doc
      .font("Helvetica")
      .fontSize(11.2)
      .fillColor(colors.text)
      .text(`Dear ${user.name},`, {
        lineGap: 4,
      });

    doc.moveDown(0.8);

    doc.text(
      `We are pleased to confirm your enrollment in the internship program "${internship.title}" offered by Internova. Based on your successful registration and payment confirmation, you have been provisionally admitted to the internship for a duration of ${purchase.durationLabel}.`,
      {
        width: contentWidth,
        align: "justify",
        lineGap: 4,
      }
    );

    doc.moveDown(0.8);

    doc.text(
      `This internship is designed to provide structured learning, guided practical exposure, and domain-focused skill development. During the internship tenure, you will be expected to complete the prescribed modules, maintain the required progress, and participate in assessments wherever applicable.`,
      {
        width: contentWidth,
        align: "justify",
        lineGap: 4,
      }
    );

    doc.moveDown(0.8);

    doc.text(
      `Please note that this document serves as your official internship offer letter. Final certificate issuance shall remain subject to successful completion of the applicable requirements, including minimum course progress and assessment eligibility as defined by Internova.`,
      {
        width: contentWidth,
        align: "justify",
        lineGap: 4,
      }
    );

    doc.moveDown(1.2);

    // Details card
    ensureSpace(220);

    const cardY = doc.y;
    const cardHeight = 170;

    doc
      .roundedRect(left, cardY, contentWidth, cardHeight, 14)
      .fillAndStroke(colors.light, "#E2E8F0");

    doc
      .roundedRect(left, cardY, contentWidth, 36, 14)
      .fillAndStroke(colors.lightBlue, colors.lightBlue);

    doc
      .font("Helvetica-Bold")
      .fontSize(13)
      .fillColor(colors.navy)
      .text("Internship Enrollment Details", left + 18, cardY + 12);

    drawInfoRow("Candidate Name", user.name || "N/A", "Duration", purchase.durationLabel || "N/A", cardY + 52);
    drawInfoRow("Registered Email", user.email || "N/A", "Amount Paid", `INR ${purchase.amount}`, cardY + 84);
    drawInfoRow("Program Name", internship.title || "N/A", "Status", (purchase.paymentStatus || "paid").toUpperCase(), cardY + 116);

    doc
      .font("Helvetica-Bold")
      .fontSize(10.5)
      .fillColor(colors.text)
      .text("Branch / Stream", left + 18, cardY + 148)
      .text("Category", left + 300, cardY + 148);

    doc
      .font("Helvetica")
      .fontSize(10.5)
      .fillColor(colors.soft)
      .text(internship.branch || "N/A", left + 18, cardY + 162, { width: 220 })
      .text(internship.category || "N/A", left + 300, cardY + 162, { width: 180 });

    doc.y = cardY + cardHeight + 18;

    // Payment meta box
    ensureSpace(100);

    const metaY = doc.y;
    const metaHeight = 74;

    doc
      .roundedRect(left, metaY, contentWidth, metaHeight, 12)
      .fillAndStroke("#FFFFFF", colors.border);

    doc
      .font("Helvetica-Bold")
      .fontSize(10.5)
      .fillColor(colors.text)
      .text("Payment Information", left + 16, metaY + 12);

    doc
      .font("Helvetica")
      .fontSize(10)
      .fillColor(colors.soft)
      .text(`Payment ID: ${purchase.razorpayPaymentId || "N/A"}`, left + 16, metaY + 32, {
        width: 240,
      })
      .text(`Order ID: ${purchase.razorpayOrderId || "N/A"}`, left + 280, metaY + 32, {
        width: 220,
      });

    doc.y = metaY + metaHeight + 18;

    // Important note box
    ensureSpace(110);

    const noteY = doc.y;
    const noteHeight = 78;

    doc
      .roundedRect(left, noteY, contentWidth, noteHeight, 12)
      .fillAndStroke(colors.warnBg, colors.warnBorder);

    doc
      .font("Helvetica-Bold")
      .fontSize(11)
      .fillColor(colors.warnText)
      .text("Important Note", left + 16, noteY + 12);

    doc
      .font("Helvetica")
      .fontSize(10.3)
      .fillColor(colors.warnText)
      .text(
        "This offer letter confirms internship enrollment only. Certificate issuance will depend on successful completion of progress requirements, assessments, and internal eligibility conditions defined by Internova.",
        left + 16,
        noteY + 30,
        {
          width: contentWidth - 32,
          align: "justify",
          lineGap: 3,
        }
      );

    doc.y = noteY + noteHeight + 20;

    // Closing
    ensureSpace(150);

    doc
      .font("Helvetica")
      .fontSize(11.2)
      .fillColor(colors.text)
      .text(
        "We are delighted to welcome you to Internova and wish you a valuable, practical, and enriching internship journey ahead.",
        {
          width: contentWidth,
          align: "justify",
          lineGap: 4,
        }
      );

    doc.moveDown(1.8);

    doc
      .font("Helvetica")
      .fontSize(11)
      .fillColor(colors.text)
      .text("Sincerely,");

    doc.moveDown(1.6);

    // Signature section
    const signStartY = doc.y;

    if (hasSignature) {
      try {
        doc.image(signaturePath, left, signStartY - 10, {
          fit: [140, 45],
        });
      } catch (e) {}
    }

    doc
      .strokeColor("#94A3B8")
      .lineWidth(1)
      .moveTo(left, signStartY + 32)
      .lineTo(left + 180, signStartY + 32)
      .stroke();

    doc
      .font("Helvetica-Bold")
      .fontSize(11.5)
      .fillColor(colors.navy)
      .text("Authorized Signatory", left, signStartY + 40);

    doc
      .font("Helvetica")
      .fontSize(10.5)
      .fillColor(colors.soft)
      .text("Internova", left, signStartY + 56)
      .text("Internship Program Management", left, signStartY + 70);

    if (hasSeal) {
      try {
        doc.image(sealPath, right - 95, signStartY + 5, {
          fit: [70, 70],
          align: "right",
        });
      } catch (e) {}
    } else {
      doc
        .circle(right - 52, signStartY + 38, 28)
        .fillAndStroke(colors.greenBg, "#A7F3D0");

      doc
        .fillColor(colors.green)
        .font("Helvetica-Bold")
        .fontSize(9)
        .text("VERIFIED", right - 80, signStartY + 34, {
          width: 56,
          align: "center",
        });
    }

    // Footer
    const footerY = pageHeight - 60;

    doc
      .strokeColor(colors.border)
      .lineWidth(1)
      .moveTo(left, footerY - 10)
      .lineTo(right, footerY - 10)
      .stroke();

    doc
      .font("Helvetica")
      .fontSize(9.3)
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