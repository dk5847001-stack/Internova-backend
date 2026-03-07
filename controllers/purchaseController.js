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
      margin: 50,
    });

    const safeName = (user.name || "candidate").replace(/[^a-z0-9]/gi, "_");
    const fileName = `${safeName}_offer_letter.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);

    doc.pipe(res);

    // ===== Helpers =====
    const pageWidth = doc.page.width;
    const left = 50;
    const right = pageWidth - 50;
    const contentWidth = right - left;

    const drawLine = (y) => {
      doc
        .strokeColor("#D9DDE3")
        .lineWidth(1)
        .moveTo(left, y)
        .lineTo(right, y)
        .stroke();
    };

    const drawBox = (y, h, fill = "#F7F9FC") => {
      doc
        .roundedRect(left, y, contentWidth, h, 10)
        .fillAndStroke(fill, "#E3E8EF");
    };

    const today = new Date();
    const formattedDate = today.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });

    // ===== Header =====
    doc
      .roundedRect(40, 35, pageWidth - 80, 95, 16)
      .fillAndStroke("#0F172A", "#0F172A");

    doc
      .fillColor("#FFFFFF")
      .font("Helvetica-Bold")
      .fontSize(24)
      .text("INTERNSHIP OFFER LETTER", 0, 58, { align: "center" });

    doc
      .fontSize(17)
      .font("Helvetica")
      .text("Internova", 0, 92, { align: "center" });

    doc
      .fontSize(10)
      .fillColor("#CBD5E1")
      .text("Professional Internship Program", 0, 114, { align: "center" });

    doc.moveDown(2);

    // ===== Ref + date =====
    let y = 155;

    doc
      .fillColor("#111827")
      .font("Helvetica")
      .fontSize(11)
      .text(`Date: ${formattedDate}`, left, y, { align: "right", width: contentWidth });

    doc
      .text(`Reference ID: OFF-${purchase._id.toString().slice(-6).toUpperCase()}`, left, y);

    y += 28;
    drawLine(y);

    // ===== Recipient =====
    y += 20;

    doc
      .font("Helvetica")
      .fontSize(12)
      .fillColor("#111827")
      .text("To,", left, y)
      .text(user.name, left, y + 18)
      .text(user.email, left, y + 36);

    y += 72;

    // ===== Subject =====
    doc
      .font("Helvetica-Bold")
      .fontSize(12)
      .text("Subject: Offer of Internship at Internova", left, y);

    y += 30;

    // ===== Body =====
    doc
      .font("Helvetica")
      .fontSize(11.5)
      .fillColor("#1F2937")
      .text(`Dear ${user.name},`, left, y);

    y += 28;

    doc.text(
      `We are pleased to offer you an internship opportunity with Internova for the program titled "${internship.title}". Based on your enrollment, you have been provisionally selected to participate in this internship for the duration of ${purchase.durationLabel}.`,
      left,
      y,
      {
        width: contentWidth,
        lineGap: 5,
        align: "justify",
      }
    );

    y = doc.y + 14;

    doc.text(
      `This internship is structured to provide practical exposure, guided learning, and skill development in your selected domain. During the internship period, you will be expected to complete the assigned modules, maintain satisfactory learning progress, and participate in assessments or evaluations wherever applicable.`,
      left,
      y,
      {
        width: contentWidth,
        lineGap: 5,
        align: "justify",
      }
    );

    y = doc.y + 14;

    doc.text(
      `Please note that this offer letter confirms your enrollment in the internship program. The final completion certificate, where applicable, shall be issued only after successful fulfillment of the platform requirements, including course completion criteria and assessment eligibility.`,
      left,
      y,
      {
        width: contentWidth,
        lineGap: 5,
        align: "justify",
      }
    );

    y = doc.y + 20;

    // ===== Offer details box =====
    drawBox(y, 150, "#F8FAFC");

    doc
      .fillColor("#0F172A")
      .font("Helvetica-Bold")
      .fontSize(13)
      .text("Offer Details", left + 18, y + 16);

    doc
      .font("Helvetica")
      .fontSize(11)
      .fillColor("#1F2937")
      .text(`Candidate Name: ${user.name}`, left + 18, y + 42)
      .text(`Registered Email: ${user.email}`, left + 18, y + 62)
      .text(`Internship Program: ${internship.title}`, left + 18, y + 82)
      .text(`Branch / Stream: ${internship.branch}`, left + 18, y + 102)
      .text(`Category: ${internship.category}`, left + 18, y + 122);

    doc
      .text(`Duration: ${purchase.durationLabel}`, left + 300, y + 42)
      .text(`Amount Paid: INR ${purchase.amount}`, left + 300, y + 62)
      .text(
        `Payment ID: ${purchase.razorpayPaymentId || "N/A"}`,
        left + 300,
        y + 82,
        { width: 180 }
      )
      .text(
        `Order ID: ${purchase.razorpayOrderId}`,
        left + 300,
        y + 112,
        { width: 180 }
      );

    y += 175;

    // ===== Closing text =====
    doc
      .font("Helvetica")
      .fontSize(11.5)
      .fillColor("#1F2937")
      .text(
        `We are delighted to welcome you to Internova and look forward to supporting your learning journey through this internship experience.`,
        left,
        y,
        {
          width: contentWidth,
          lineGap: 5,
          align: "justify",
        }
      );

    y = doc.y + 35;

    // ===== Signature section =====
    doc
      .font("Helvetica")
      .fontSize(11)
      .text("Sincerely,", left, y);

    y += 48;

    doc
      .strokeColor("#9CA3AF")
      .lineWidth(1)
      .moveTo(left, y)
      .lineTo(left + 180, y)
      .stroke();

    doc
      .font("Helvetica-Bold")
      .fontSize(12)
      .fillColor("#111827")
      .text("Authorized Signatory", left, y + 8)
      .font("Helvetica")
      .fontSize(11)
      .text("Internova", left, y + 26);

    // ===== Footer =====
    doc
      .fontSize(9.5)
      .fillColor("#6B7280")
      .text(
        "This is a system-generated internship offer letter issued by Internova.",
        0,
        doc.page.height - 55,
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