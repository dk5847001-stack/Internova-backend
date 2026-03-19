const PDFDocument = require("pdfkit");
const path = require("path");
const fs = require("fs");

const formatDate = (date) =>
  new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

const formatDateTime = (date) =>
  new Date(date).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const formatAmount = (amount) => `INR ${Number(amount || 0).toFixed(2)}`;

const getReferenceId = (purchase) =>
  `PAY-${purchase._id.toString().slice(-6).toUpperCase()}`;

const safeFileName = (value = "") =>
  String(value)
    .replace(/[^a-z0-9]/gi, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");

const drawLabelValue = (doc, label, value, x, y, width) => {
  doc
    .font("Helvetica-Bold")
    .fontSize(9)
    .fillColor("#0F172A")
    .text(label, x, y, { width });

  doc
    .font("Helvetica")
    .fontSize(9.2)
    .fillColor("#475569")
    .text(value || "N/A", x, y + 13, { width });
};

const generatePaymentSlipPdf = ({ res, purchase, user, internship }) => {
  const doc = new PDFDocument({
    size: "A4",
    margins: {
      top: 28,
      bottom: 28,
      left: 34,
      right: 34,
    },
  });

  const pageWidth = doc.page.width;
  const pageHeight = doc.page.height;
  const left = doc.page.margins.left;
  const right = pageWidth - doc.page.margins.right;
  const contentWidth = right - left;

  const colors = {
    dark: "#081225",
    dark2: "#0F1B35",
    text: "#0F172A",
    soft: "#64748B",
    border: "#DCE6F2",
    white: "#FFFFFF",
    light: "#F8FAFC",
    lightBlue: "#EEF4FF",
    blue: "#1D4ED8",
    green: "#065F46",
    greenBg: "#D1FAE5",
    greenBorder: "#6EE7B7",
    gold: "#B45309",
    goldBg: "#FFF7ED",
    goldBorder: "#FED7AA",
    red: "#991B1B",
    redBg: "#FEF2F2",
    redBorder: "#FECACA",
  };

  const brandLogo = path.join(__dirname, "../uploads/branding/logo.png");
  const brandSeal = path.join(__dirname, "../uploads/branding/seal.png");
  const brandSignature = path.join(__dirname, "../uploads/branding/signature.png");

  const hasLogo = fs.existsSync(brandLogo);
  const hasSeal = fs.existsSync(brandSeal);
  const hasSignature = fs.existsSync(brandSignature);

  const userName = user?.name || "Candidate";
  const userEmail = user?.email || "N/A";
  const userPhone = user?.phone || "N/A";

  const internshipTitle = internship?.title || "Program";
  const internshipCategory = internship?.category || "General";
  const internshipBranch = internship?.branch || "N/A";

  const purchaseTypeLabel =
    purchase?.purchaseType === "unlock_all"
      ? "Unlock All Add-on"
      : "Internship Enrollment";

  const paymentStatus = String(purchase?.paymentStatus || "paid").toUpperCase();
  const issueDate = formatDate(purchase?.updatedAt || purchase?.createdAt || new Date());
  const issueDateTime = formatDateTime(
    purchase?.updatedAt || purchase?.createdAt || new Date()
  );
  const referenceId = getReferenceId(purchase);
  const amountPaid = formatAmount(purchase?.amount);

  const safeName = safeFileName(userName || "candidate");
  const fileName = `${safeName}_payment_slip_${referenceId}.pdf`;

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);

  doc.pipe(res);

  // Background
  doc.rect(0, 0, pageWidth, pageHeight).fill(colors.white);

  // Outer premium frame
  doc
    .lineWidth(1.1)
    .strokeColor("#D7E3F1")
    .roundedRect(14, 14, pageWidth - 28, pageHeight - 28, 18)
    .stroke();

  doc
    .lineWidth(0.7)
    .strokeColor("#EEF4FB")
    .roundedRect(22, 22, pageWidth - 44, pageHeight - 44, 16)
    .stroke();

  // Top strip
  doc.roundedRect(22, 22, pageWidth - 44, 9, 4).fill(colors.dark);

  // Watermark
  doc.save();
  doc.opacity(0.05);
  doc
    .font("Helvetica-Bold")
    .fontSize(58)
    .fillColor(colors.blue)
    .rotate(-28, { origin: [pageWidth / 2, pageHeight / 2] })
    .text("PAID", 145, 360, { align: "center", width: 320 });
  doc.restore();

  // Header
  const headerY = 42;
  const headerH = 88;

  doc
    .roundedRect(left, headerY, contentWidth, headerH, 18)
    .fillAndStroke(colors.dark, colors.dark);

  if (hasLogo) {
    try {
      doc.image(brandLogo, left + 18, headerY + 14, {
        fit: [92, 58],
        align: "left",
        valign: "center",
      });
    } catch (error) {
      console.error("PAYMENT SLIP LOGO ERROR:", error.message);
    }
  }

  doc
    .font("Helvetica-Bold")
    .fontSize(22)
    .fillColor(colors.white)
    .text("PAYMENT SLIP", left, headerY + 18, {
      width: contentWidth,
      align: "center",
    });

  doc
    .font("Helvetica")
    .fontSize(11)
    .fillColor("#CBD5E1")
    .text("Internova • Secure Payment Acknowledgement", left, headerY + 50, {
      width: contentWidth,
      align: "center",
    });

  // status badge
  const badgeW = 88;
  const badgeX = right - badgeW - 16;
  const badgeY = headerY + 16;

  doc
    .roundedRect(badgeX, badgeY, badgeW, 28, 14)
    .fillAndStroke(colors.greenBg, colors.greenBorder);

  doc
    .font("Helvetica-Bold")
    .fontSize(10)
    .fillColor(colors.green)
    .text(paymentStatus, badgeX, badgeY + 9, {
      width: badgeW,
      align: "center",
    });

  // Meta bar
  const metaY = headerY + headerH + 10;
  const metaH = 42;

  doc
    .roundedRect(left, metaY, contentWidth, metaH, 12)
    .fillAndStroke(colors.light, "#E2E8F0");

  drawLabelValue(doc, "Issue Date", issueDate, left + 16, metaY + 8, 120);
  drawLabelValue(doc, "Reference ID", referenceId, left + 175, metaY + 8, 130);
  drawLabelValue(
    doc,
    "Payment Time",
    issueDateTime,
    left + 335,
    metaY + 8,
    180
  );

  let y = metaY + metaH + 16;

  // Intro block
  doc
    .roundedRect(left, y, contentWidth, 76, 14)
    .fillAndStroke("#FCFDFE", "#E2E8F0");

  doc
    .font("Helvetica-Bold")
    .fontSize(11)
    .fillColor(colors.text)
    .text("Payment Confirmed", left + 14, y + 12);

  doc
    .font("Helvetica")
    .fontSize(9.8)
    .fillColor(colors.soft)
    .text(
      `This document confirms that payment has been successfully received by Internova for the selected ${purchaseTypeLabel.toLowerCase()}. Please retain this slip for your records and future support requests.`,
      left + 14,
      y + 30,
      {
        width: contentWidth - 28,
        align: "justify",
        lineGap: 2,
      }
    );

  y += 92;

  // Two main cards
  const gap = 14;
  const colW = (contentWidth - gap) / 2;
  const cardH = 160;

  // Learner card
  doc
    .roundedRect(left, y, colW, cardH, 14)
    .fillAndStroke(colors.white, colors.border);

  doc
    .roundedRect(left, y, colW, 32, 14)
    .fillAndStroke(colors.lightBlue, colors.lightBlue);

  doc
    .font("Helvetica-Bold")
    .fontSize(11)
    .fillColor(colors.dark2)
    .text("Learner Details", left + 14, y + 11);

  drawLabelValue(doc, "Full Name", userName, left + 14, y + 44, colW - 28);
  drawLabelValue(doc, "Email Address", userEmail, left + 14, y + 78, colW - 28);
  drawLabelValue(doc, "Phone Number", userPhone, left + 14, y + 112, colW - 28);

  // Program card
  const card2X = left + colW + gap;

  doc
    .roundedRect(card2X, y, colW, cardH, 14)
    .fillAndStroke(colors.white, colors.border);

  doc
    .roundedRect(card2X, y, colW, 32, 14)
    .fillAndStroke("#EEFDF5", "#EEFDF5");

  doc
    .font("Helvetica-Bold")
    .fontSize(11)
    .fillColor(colors.green)
    .text("Program Details", card2X + 14, y + 11);

  drawLabelValue(doc, "Program Name", internshipTitle, card2X + 14, y + 44, colW - 28);
  drawLabelValue(
    doc,
    "Plan / Access Type",
    purchaseTypeLabel,
    card2X + 14,
    y + 78,
    colW - 28
  );
  drawLabelValue(
    doc,
    "Selected Duration",
    purchase?.durationLabel || "N/A",
    card2X + 14,
    y + 112,
    colW - 28
  );

  y += cardH + 16;

  // Payment summary card
  const summaryH = 138;

  doc
    .roundedRect(left, y, contentWidth, summaryH, 14)
    .fillAndStroke(colors.light, "#E2E8F0");

  doc
    .roundedRect(left, y, contentWidth, 34, 14)
    .fillAndStroke("#FFF8EB", "#FFF8EB");

  doc
    .font("Helvetica-Bold")
    .fontSize(11)
    .fillColor(colors.gold)
    .text("Payment Summary", left + 14, y + 12);

  const summaryY = y + 48;
  const w1 = 150;
  const w2 = 170;
  const w3 = 170;

  drawLabelValue(doc, "Amount Paid", amountPaid, left + 16, summaryY, w1);
  drawLabelValue(
    doc,
    "Payment ID",
    purchase?.razorpayPaymentId || "N/A",
    left + 185,
    summaryY,
    w2
  );
  drawLabelValue(
    doc,
    "Order ID",
    purchase?.razorpayOrderId || "N/A",
    left + 370,
    summaryY,
    w3
  );

  drawLabelValue(
    doc,
    "Category",
    internshipCategory,
    left + 16,
    summaryY + 42,
    w1
  );
  drawLabelValue(
    doc,
    "Branch",
    internshipBranch,
    left + 185,
    summaryY + 42,
    w2
  );
  drawLabelValue(
    doc,
    "Payment Status",
    paymentStatus,
    left + 370,
    summaryY + 42,
    w3
  );

  y += summaryH + 14;

  // Security note
  doc
    .roundedRect(left, y, contentWidth, 74, 14)
    .fillAndStroke(colors.goldBg, colors.goldBorder);

  doc
    .font("Helvetica-Bold")
    .fontSize(10.4)
    .fillColor(colors.gold)
    .text("Verification Note", left + 14, y + 12);

  doc
    .font("Helvetica")
    .fontSize(9.2)
    .fillColor("#92400E")
    .text(
      "This is a system-generated premium payment acknowledgment issued by Internova. The transaction details shown above are based on the verified payment record stored in the platform.",
      left + 14,
      y + 30,
      {
        width: contentWidth - 28,
        align: "justify",
        lineGap: 2,
      }
    );

  // Footer area
  const footerY = pageHeight - 92;

  if (hasSignature) {
    try {
      doc.image(brandSignature, left, footerY - 8, {
        fit: [120, 34],
      });
    } catch (error) {
      console.error("PAYMENT SLIP SIGNATURE ERROR:", error.message);
    }
  }

  doc
    .strokeColor("#94A3B8")
    .lineWidth(1)
    .moveTo(left, footerY + 24)
    .lineTo(left + 170, footerY + 24)
    .stroke();

  doc
    .font("Helvetica-Bold")
    .fontSize(10.4)
    .fillColor(colors.dark2)
    .text("Authorized Signatory", left, footerY + 30);

  doc
    .font("Helvetica")
    .fontSize(9.2)
    .fillColor(colors.soft)
    .text("Internova Finance & Enrollment Desk", left, footerY + 45);

  if (hasSeal) {
    try {
      doc.image(brandSeal, right - 124, footerY - 26, {
        fit: [112, 112],
        align: "right",
      });
    } catch (error) {
      console.error("PAYMENT SLIP SEAL ERROR:", error.message);
    }
  }

  doc
    .strokeColor(colors.border)
    .lineWidth(1)
    .moveTo(left, pageHeight - 44)
    .lineTo(right, pageHeight - 44)
    .stroke();

  doc
    .font("Helvetica")
    .fontSize(8.5)
    .fillColor(colors.soft)
    .text(
      "This document is system generated and intended for record purposes. Altered or manually modified copies may be considered invalid.",
      left,
      pageHeight - 36,
      {
        width: contentWidth,
        align: "center",
      }
    );

  doc.end();
};

module.exports = generatePaymentSlipPdf;