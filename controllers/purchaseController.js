const Purchase = require("../models/Purchase");
const User = require("../models/User");
const Internship = require("../models/Internship");
const PDFDocument = require("pdfkit");

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
      margin: 0,
    });

    const safeName = (user.name || "candidate").replace(/[^a-z0-9]/gi, "_");
    const fileName = `${safeName}_offer_letter.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);

    doc.pipe(res);

    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;
    const left = 55;
    const right = pageWidth - 55;
    const width = right - left;

    const formatDate = (date) =>
      new Date(date).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      });

    const primary = "#0F172A";
    const secondary = "#1E293B";
    const accent = "#2563EB";
    const textDark = "#111827";
    const textSoft = "#475569";
    const lightBg = "#F8FAFC";
    const border = "#DCE3EA";
    const white = "#FFFFFF";

    const referenceId = `INVOFF-${purchase._id.toString().slice(-8).toUpperCase()}`;
    const issueDate = formatDate(new Date());

    // Background
    doc.rect(0, 0, pageWidth, pageHeight).fill("#FFFFFF");

    // Outer border
    doc
      .lineWidth(1.2)
      .strokeColor("#D9E1EA")
      .roundedRect(20, 20, pageWidth - 40, pageHeight - 40, 18)
      .stroke();

    // Top header
    doc
      .roundedRect(35, 35, pageWidth - 70, 105, 18)
      .fillAndStroke(primary, primary);

    // Brand badge
    doc
      .roundedRect(left, 52, 118, 28, 14)
      .fillAndStroke(accent, accent);

    doc
      .fillColor(white)
      .font("Helvetica-Bold")
      .fontSize(11)
      .text("INTERNSHIP PORTAL", left + 13, 61);

    // Title
    doc
      .fillColor(white)
      .font("Helvetica-Bold")
      .fontSize(25)
      .text("INTERNSHIP OFFER LETTER", 0, 68, {
        align: "center",
      });

    doc
      .fillColor("#CBD5E1")
      .font("Helvetica")
      .fontSize(13)
      .text("Internova", 0, 102, { align: "center" });

    // Right meta box
    doc
      .roundedRect(pageWidth - 205, 50, 130, 48, 10)
      .fillAndStroke(secondary, secondary);

    doc
      .fillColor("#E2E8F0")
      .font("Helvetica")
      .fontSize(9)
      .text("Issue Date", pageWidth - 192, 58)
      .text("Reference ID", pageWidth - 192, 77);

    doc
      .fillColor(white)
      .font("Helvetica-Bold")
      .fontSize(9)
      .text(issueDate, pageWidth - 120, 58, { width: 38, align: "right" })
      .text(referenceId, pageWidth - 120, 77, { width: 38, align: "right" });

    // Watermark style brand text
    doc.save();
    doc.rotate(-35, { origin: [300, 420] });
    doc
      .fillColor("#F1F5F9")
      .font("Helvetica-Bold")
      .fontSize(52)
      .text("INTERNOVA", 120, 380, {
        opacity: 0.08,
      });
    doc.restore();

    let y = 170;

    // Recipient block
    doc
      .fillColor(textSoft)
      .font("Helvetica")
      .fontSize(11)
      .text("To,", left, y);

    y += 18;

    doc
      .fillColor(textDark)
      .font("Helvetica-Bold")
      .fontSize(12)
      .text(user.name, left, y);

    y += 18;

    doc
      .fillColor(textSoft)
      .font("Helvetica")
      .fontSize(11)
      .text(user.email, left, y);

    // Date on right
    doc
      .fillColor(textSoft)
      .font("Helvetica")
      .fontSize(11)
      .text(`Date: ${issueDate}`, pageWidth - 200, 188, {
        width: 145,
        align: "right",
      });

    y += 34;

    // Subject line
    doc
      .strokeColor(border)
      .lineWidth(1)
      .moveTo(left, y)
      .lineTo(right, y)
      .stroke();

    y += 18;

    doc
      .fillColor(textDark)
      .font("Helvetica-Bold")
      .fontSize(12)
      .text("Subject: Formal Offer of Internship Enrollment", left, y);

    y += 34;

    // Greeting
    doc
      .fillColor(textDark)
      .font("Helvetica")
      .fontSize(11.5)
      .text(`Dear ${user.name},`, left, y);

    y += 24;

    // Main paragraphs
    doc
      .fillColor(textDark)
      .font("Helvetica")
      .fontSize(11.2)
      .text(
        `We are pleased to confirm your enrollment in the internship program "${internship.title}" offered by Internova. Based on your successful registration and payment confirmation, you have been provisionally admitted to the internship for a duration of ${purchase.durationLabel}.`,
        left,
        y,
        {
          width,
          align: "justify",
          lineGap: 5,
        }
      );

    y = doc.y + 14;

    doc.text(
      `This internship has been designed to provide you with structured learning, guided practical exposure, and domain-based assessment aligned with your selected program. During the tenure of this internship, you will be expected to complete the prescribed modules, maintain the required academic progress, and participate in evaluation activities wherever applicable.`,
      left,
      y,
      {
        width,
        align: "justify",
        lineGap: 5,
      }
    );

    y = doc.y + 14;

    doc.text(
      `Please note that this document serves as your official internship offer letter. The final certificate of completion shall be issued only upon successful satisfaction of the platform requirements, including minimum completion criteria and eligibility standards defined by Internova.`,
      left,
      y,
      {
        width,
        align: "justify",
        lineGap: 5,
      }
    );

    y = doc.y + 22;

    // Offer details card
    doc
      .roundedRect(left, y, width, 156, 14)
      .fillAndStroke(lightBg, "#E2E8F0");

    doc
      .roundedRect(left, y, width, 36, 14)
      .fillAndStroke("#EAF2FF", "#EAF2FF");

    doc
      .fillColor(primary)
      .font("Helvetica-Bold")
      .fontSize(13)
      .text("Internship Enrollment Details", left + 18, y + 12);

    let boxY = y + 52;

    doc
      .fillColor(textDark)
      .font("Helvetica")
      .fontSize(10.8)
      .text(`Candidate Name: ${user.name}`, left + 18, boxY)
      .text(`Registered Email: ${user.email}`, left + 18, boxY + 21)
      .text(`Program Name: ${internship.title}`, left + 18, boxY + 42)
      .text(`Branch / Stream: ${internship.branch}`, left + 18, boxY + 63)
      .text(`Category: ${internship.category}`, left + 18, boxY + 84);

    doc
      .text(`Duration: ${purchase.durationLabel}`, left + 320, boxY)
      .text(`Amount Paid: INR ${purchase.amount}`, left + 320, boxY + 21)
      .text(
        `Payment ID: ${purchase.razorpayPaymentId || "N/A"}`,
        left + 320,
        boxY + 42,
        { width: 165 }
      )
      .text(
        `Order ID: ${purchase.razorpayOrderId}`,
        left + 320,
        boxY + 69,
        { width: 165 }
      )
      .text(`Status: ${purchase.paymentStatus.toUpperCase()}`, left + 320, boxY + 108);

    y += 180;

    // Important note box
    doc
      .roundedRect(left, y, width, 72, 12)
      .fillAndStroke("#FFF7ED", "#FED7AA");

    doc
      .fillColor("#9A3412")
      .font("Helvetica-Bold")
      .fontSize(11)
      .text("Important Note", left + 16, y + 12);

    doc
      .fillColor("#7C2D12")
      .font("Helvetica")
      .fontSize(10.5)
      .text(
        "This offer letter confirms internship enrollment only. Certificate issuance is subject to successful completion of applicable course progress, assessments, and internal eligibility requirements.",
        left + 16,
        y + 30,
        {
          width: width - 32,
          lineGap: 4,
          align: "justify",
        }
      );

    y += 95;

    // Closing paragraph
    doc
      .fillColor(textDark)
      .font("Helvetica")
      .fontSize(11.2)
      .text(
        `We are delighted to welcome you to Internova. We wish you a valuable and enriching internship journey ahead.`,
        left,
        y,
        {
          width,
          lineGap: 5,
          align: "justify",
        }
      );

    y = doc.y + 40;

    // Signature section
    doc
      .fillColor(textDark)
      .font("Helvetica")
      .fontSize(11)
      .text("Sincerely,", left, y);

    y += 54;

    doc
      .strokeColor("#94A3B8")
      .lineWidth(1)
      .moveTo(left, y)
      .lineTo(left + 180, y)
      .stroke();

    doc
      .fillColor(primary)
      .font("Helvetica-Bold")
      .fontSize(12)
      .text("Authorized Signatory", left, y + 8);

    doc
      .fillColor(textSoft)
      .font("Helvetica")
      .fontSize(11)
      .text("Internova", left, y + 26)
      .text("Internship Program Management", left, y + 42);

    // Seal-style badge
    doc
      .circle(pageWidth - 110, y + 26, 34)
      .fillAndStroke("#DBEAFE", "#93C5FD");

    doc
      .fillColor("#1D4ED8")
      .font("Helvetica-Bold")
      .fontSize(10)
      .text("VERIFIED", pageWidth - 133, y + 18, {
        width: 46,
        align: "center",
      });

    // Footer
    doc
      .strokeColor(border)
      .lineWidth(1)
      .moveTo(45, pageHeight - 75)
      .lineTo(pageWidth - 45, pageHeight - 75)
      .stroke();

    doc
      .fillColor("#64748B")
      .font("Helvetica")
      .fontSize(9.5)
      .text(
        "This is a system-generated document issued by Internova and does not require a physical signature.",
        0,
        pageHeight - 60,
        { align: "center" }
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