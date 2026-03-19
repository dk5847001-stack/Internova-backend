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

const safeFileName = (value = "") =>
  String(value)
    .replace(/[^a-z0-9]/gi, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");

const getReceiptNumber = (purchase) =>
  `RCPT-${purchase._id.toString().slice(-8).toUpperCase()}`;

const drawInfoLabelValue = (doc, label, value, x, y, width) => {
  doc
    .font("Helvetica")
    .fontSize(8.5)
    .fillColor("#64748B")
    .text(label, x, y, { width });

  doc
    .font("Helvetica-Bold")
    .fontSize(10.2)
    .fillColor("#0F172A")
    .text(value || "N/A", x, y + 12, { width });
};

const drawSummaryRow = (doc, label, value, x1, x2, y, isTotal = false) => {
  doc
    .font(isTotal ? "Helvetica-Bold" : "Helvetica")
    .fontSize(isTotal ? 10.8 : 10)
    .fillColor(isTotal ? "#047857" : "#475569")
    .text(label, x1, y, { width: 100 });

  doc
    .font(isTotal ? "Helvetica-Bold" : "Helvetica")
    .fontSize(isTotal ? 12 : 10)
    .fillColor(isTotal ? "#047857" : "#0F172A")
    .text(value, x2, y, { width: 90, align: "right" });
};

const generatePaymentSlipPdf = ({ res, purchase, user, internship }) => {
  const doc = new PDFDocument({
    size: "A4",
    margins: {
      top: 26,
      bottom: 26,
      left: 30,
      right: 30,
    },
  });

  const pageWidth = doc.page.width;
  const pageHeight = doc.page.height;
  const left = doc.page.margins.left;
  const right = pageWidth - doc.page.margins.right;
  const contentWidth = right - left;

  const colors = {
    pageBg: "#F4F7FB",
    white: "#FFFFFF",
    dark: "#0B1220",
    text: "#0F172A",
    soft: "#64748B",
    border: "#E2E8F0",
    primary: "#1D4ED8",
    success: "#047857",
    successBg: "#D1FAE5",
    successBorder: "#86EFAC",
    lightBlue: "#EFF6FF",
    lightGreen: "#ECFDF5",
    amberBg: "#FFF7ED",
    amberBorder: "#FED7AA",
    amberText: "#9A3412",
    slateBg: "#F8FAFC",
  };

  const logoPath = path.join(__dirname, "../uploads/branding/logo.png");
  const altLogoPath = path.join(__dirname, "../uploads/branding/brand_logo.png");
  const finalLogoPath = fs.existsSync(logoPath)
    ? logoPath
    : fs.existsSync(altLogoPath)
    ? altLogoPath
    : null;

  const userName = user?.name || "Candidate";
  const userEmail = user?.email || "N/A";
  const userPhone = user?.phone || "N/A";

  const internshipTitle = internship?.title || "Program";
  const internshipCategory = internship?.category || "General";
  const internshipBranch = internship?.branch || "N/A";

  const receiptNumber = getReceiptNumber(purchase);
  const issueDate = formatDate(purchase?.updatedAt || purchase?.createdAt || new Date());
  const issueDateTime = formatDateTime(
    purchase?.updatedAt || purchase?.createdAt || new Date()
  );

  const paymentId = purchase?.razorpayPaymentId || "N/A";
  const orderId = purchase?.razorpayOrderId || "N/A";
  const durationLabel = purchase?.durationLabel || "N/A";

  const purchaseTypeLabel =
    purchase?.purchaseType === "unlock_all"
      ? "Unlock All Add-on Access"
      : "Internship Enrollment";

  const amountNumber = Number(purchase?.amount || 0);
  const amountPaid = `INR ${amountNumber.toFixed(2)}`;

  const safeName = safeFileName(userName || "candidate");
  const fileName = `${safeName}_payment_receipt_${receiptNumber}.pdf`;

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);

  doc.pipe(res);

  // Page background
  doc.rect(0, 0, pageWidth, pageHeight).fill(colors.pageBg);

  // Sheet
  doc
    .roundedRect(16, 16, pageWidth - 32, pageHeight - 32, 18)
    .fillAndStroke(colors.white, "#E7EDF5");

  // Header band
  const headerY = 30;
  const headerH = 76;

  doc
    .roundedRect(left, headerY, contentWidth, headerH, 16)
    .fillAndStroke(colors.dark, colors.dark);

  if (finalLogoPath) {
    try {
      doc.image(finalLogoPath, left + 14, headerY + 13, {
        fit: [82, 48],
      });
    } catch (error) {
      console.error("PAYMENT RECEIPT LOGO ERROR:", error.message);
    }
  }

  doc
    .font("Helvetica-Bold")
    .fontSize(21)
    .fillColor(colors.white)
    .text("PAYMENT RECEIPT", left + 108, headerY + 16);

  doc
    .font("Helvetica")
    .fontSize(10)
    .fillColor("#CBD5E1")
    .text("Official payment acknowledgement", left + 108, headerY + 44);

  doc
    .roundedRect(right - 108, headerY + 18, 92, 28, 14)
    .fillAndStroke(colors.successBg, colors.successBorder);

  doc
    .font("Helvetica-Bold")
    .fontSize(10)
    .fillColor(colors.success)
    .text("PAID", right - 108, headerY + 27, {
      width: 92,
      align: "center",
    });

  // Receipt meta
  const metaY = headerY + headerH + 14;
  const metaH = 58;

  doc
    .roundedRect(left, metaY, contentWidth, metaH, 14)
    .fillAndStroke(colors.slateBg, colors.border);

  drawInfoLabelValue(doc, "Receipt No.", receiptNumber, left + 14, metaY + 12, 150);
  drawInfoLabelValue(doc, "Issue Date", issueDate, left + 185, metaY + 12, 110);
  drawInfoLabelValue(
    doc,
    "Transaction Time",
    issueDateTime,
    left + 320,
    metaY + 12,
    200
  );

  // Two boxes
  const infoY = metaY + metaH + 16;
  const gap = 14;
  const halfW = (contentWidth - gap) / 2;
  const infoH = 132;

  // Customer
  doc
    .roundedRect(left, infoY, halfW, infoH, 15)
    .fillAndStroke(colors.white, colors.border);

  doc
    .roundedRect(left, infoY, halfW, 30, 15)
    .fillAndStroke(colors.lightBlue, colors.lightBlue);

  doc
    .font("Helvetica-Bold")
    .fontSize(10.8)
    .fillColor(colors.primary)
    .text("Customer Details", left + 14, infoY + 10);

  drawInfoLabelValue(doc, "Name", userName, left + 14, infoY + 42, halfW - 28);
  drawInfoLabelValue(doc, "Email", userEmail, left + 14, infoY + 74, halfW - 28);
  drawInfoLabelValue(doc, "Phone", userPhone, left + 14, infoY + 106, halfW - 28);

  // Transaction
  const txX = left + halfW + gap;

  doc
    .roundedRect(txX, infoY, halfW, infoH, 15)
    .fillAndStroke(colors.white, colors.border);

  doc
    .roundedRect(txX, infoY, halfW, 30, 15)
    .fillAndStroke(colors.lightGreen, colors.lightGreen);

  doc
    .font("Helvetica-Bold")
    .fontSize(10.8)
    .fillColor(colors.success)
    .text("Transaction Details", txX + 14, infoY + 10);

  drawInfoLabelValue(doc, "Payment ID", paymentId, txX + 14, infoY + 42, halfW - 28);
  drawInfoLabelValue(doc, "Order ID", orderId, txX + 14, infoY + 74, halfW - 28);
  drawInfoLabelValue(
    doc,
    "Payment Method",
    "Razorpay Online Payment",
    txX + 14,
    infoY + 106,
    halfW - 28
  );

  // Items title row
  const tableY = infoY + infoH + 18;

  doc
    .roundedRect(left, tableY, contentWidth, 34, 10)
    .fillAndStroke("#F8FAFC", colors.border);

  doc
    .font("Helvetica-Bold")
    .fontSize(9.2)
    .fillColor(colors.soft)
    .text("ITEM", left + 14, tableY + 12)
    .text("TYPE", left + 270, tableY + 12)
    .text("DURATION", left + 385, tableY + 12)
    .text("AMOUNT", right - 88, tableY + 12, {
      width: 70,
      align: "right",
    });

  // Item row
  const itemY = tableY + 34;
  const itemH = 66;

  doc
    .roundedRect(left, itemY, contentWidth, itemH, 10)
    .fillAndStroke(colors.white, colors.border);

  doc
    .font("Helvetica-Bold")
    .fontSize(10.3)
    .fillColor(colors.text)
    .text(internshipTitle, left + 14, itemY + 14, {
      width: 235,
    });

  doc
    .font("Helvetica")
    .fontSize(8.7)
    .fillColor(colors.soft)
    .text(`Branch: ${internshipBranch}`, left + 14, itemY + 35, {
      width: 235,
    });

  doc
    .font("Helvetica")
    .fontSize(9.6)
    .fillColor(colors.text)
    .text(purchaseTypeLabel, left + 270, itemY + 23, {
      width: 100,
    });

  doc
    .font("Helvetica")
    .fontSize(9.6)
    .fillColor(colors.text)
    .text(durationLabel, left + 385, itemY + 23, {
      width: 90,
    });

  doc
    .font("Helvetica-Bold")
    .fontSize(10.8)
    .fillColor(colors.text)
    .text(amountPaid, right - 100, itemY + 22, {
      width: 82,
      align: "right",
    });

  // Bottom two-column layout
  const bottomY = itemY + itemH + 18;
  const summaryW = 220;
  const programW = contentWidth - summaryW - gap;

  // Program info
  doc
    .roundedRect(left, bottomY, programW, 122, 15)
    .fillAndStroke(colors.white, colors.border);

  doc
    .font("Helvetica-Bold")
    .fontSize(11)
    .fillColor(colors.text)
    .text("Program Information", left + 14, bottomY + 14);

  drawInfoLabelValue(
    doc,
    "Program Name",
    internshipTitle,
    left + 14,
    bottomY + 42,
    programW - 28
  );

  drawInfoLabelValue(
    doc,
    "Branch",
    internshipBranch,
    left + 14,
    bottomY + 84,
    140
  );

  drawInfoLabelValue(
    doc,
    "Category",
    internshipCategory,
    left + 190,
    bottomY + 84,
    programW - 204
  );

  // Summary
  const summaryX = left + programW + gap;

  doc
    .roundedRect(summaryX, bottomY, summaryW, 122, 15)
    .fillAndStroke("#FCFDFE", colors.border);

  doc
    .font("Helvetica-Bold")
    .fontSize(11)
    .fillColor(colors.text)
    .text("Payment Summary", summaryX + 14, bottomY + 14);

  drawSummaryRow(doc, "Subtotal", amountPaid, summaryX + 14, summaryX + 110, bottomY + 45);
  drawSummaryRow(
    doc,
    "Platform Charges",
    "INR 0.00",
    summaryX + 14,
    summaryX + 110,
    bottomY + 68
  );

  doc
    .strokeColor("#DCE6F2")
    .lineWidth(1)
    .moveTo(summaryX + 14, bottomY + 92)
    .lineTo(summaryX + summaryW - 14, bottomY + 92)
    .stroke();

  drawSummaryRow(
    doc,
    "Total Paid",
    amountPaid,
    summaryX + 14,
    summaryX + 110,
    bottomY + 100,
    true
  );

  // Important note
  const noteY = bottomY + 138;

  doc
    .roundedRect(left, noteY, contentWidth, 72, 15)
    .fillAndStroke(colors.amberBg, colors.amberBorder);

  doc
    .font("Helvetica-Bold")
    .fontSize(10.2)
    .fillColor(colors.amberText)
    .text("Important Note", left + 14, noteY + 12);

  doc
    .font("Helvetica")
    .fontSize(9)
    .fillColor(colors.amberText)
    .text(
      "This is a system-generated payment receipt issued after successful payment verification. Please keep this receipt for support, enrollment verification, and future reference.",
      left + 14,
      noteY + 29,
      {
        width: contentWidth - 28,
        align: "justify",
        lineGap: 2,
      }
    );

  // Footer
  const footerY = pageHeight - 44;

  doc
    .strokeColor(colors.border)
    .lineWidth(1)
    .moveTo(left, footerY - 10)
    .lineTo(right, footerY - 10)
    .stroke();

  doc
    .font("Helvetica")
    .fontSize(8.4)
    .fillColor(colors.soft)
    .text(
      "Internova • Finance Desk • Computer-generated receipt • No physical signature required",
      left,
      footerY,
      {
        width: contentWidth,
        align: "center",
      }
    );

  doc.end();
};

module.exports = generatePaymentSlipPdf;