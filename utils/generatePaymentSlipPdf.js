const PDFDocument = require("pdfkit");
const path = require("path");
const fs = require("fs");
const QRCode = require("qrcode");

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
    .text(label, x1, y, { width: 110 });

  doc
    .font(isTotal ? "Helvetica-Bold" : "Helvetica")
    .fontSize(isTotal ? 12 : 10)
    .fillColor(isTotal ? "#047857" : "#0F172A")
    .text(value, x2, y, { width: 90, align: "right" });
};

const drawBarcodeStyle = (doc, value, x, y, width, height) => {
  const normalized = String(value || "0000000000").replace(/[^a-zA-Z0-9]/g, "");
  let cursorX = x;

  for (let i = 0; i < normalized.length; i += 1) {
    const code = normalized.charCodeAt(i);
    const barWidth = code % 2 === 0 ? 1.2 : 2.4;
    const gap = code % 3 === 0 ? 1.4 : 2.2;

    if (cursorX + barWidth > x + width) break;

    doc.rect(cursorX, y, barWidth, height).fill("#0F172A");
    cursorX += barWidth + gap;
  }
};

const generatePaymentSlipPdf = async ({ res, purchase, user, internship }) => {
  const doc = new PDFDocument({
    size: "A4",
    margins: {
      top: 24,
      bottom: 24,
      left: 28,
      right: 28,
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
    qrBg: "#F8FAFC",
  };

  const logoPath = path.join(__dirname, "../uploads/branding/logo.png");
  const altLogoPath = path.join(__dirname, "../uploads/branding/brand_logo.png");
  const altLogoPath2 = path.join(__dirname, "../uploads/branding/brand logo.png");

  const finalLogoPath = fs.existsSync(logoPath)
    ? logoPath
    : fs.existsSync(altLogoPath)
    ? altLogoPath
    : fs.existsSync(altLogoPath2)
    ? altLogoPath2
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

  const qrValue = [
    `Receipt: ${receiptNumber}`,
    `Name: ${userName}`,
    `Program: ${internshipTitle}`,
    `Amount: ${amountPaid}`,
    `Payment ID: ${paymentId}`,
    `Order ID: ${orderId}`,
    `Issued: ${issueDateTime}`,
  ].join(" | ");

  const qrDataUrl = await QRCode.toDataURL(qrValue, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 220,
    color: {
      dark: "#0F172A",
      light: "#FFFFFF",
    },
  });

  const qrBase64 = qrDataUrl.replace(/^data:image\/png;base64,/, "");
  const qrBuffer = Buffer.from(qrBase64, "base64");

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);

  doc.pipe(res);

  doc.rect(0, 0, pageWidth, pageHeight).fill(colors.pageBg);

  doc
    .roundedRect(14, 14, pageWidth - 28, pageHeight - 28, 18)
    .fillAndStroke(colors.white, "#E7EDF5");

  doc.save();
  doc.opacity(0.05);
  doc.rotate(-30, { origin: [pageWidth / 2, pageHeight / 2] });
  doc
    .font("Helvetica-Bold")
    .fontSize(72)
    .fillColor("#059669")
    .text("PAID", 145, 360, {
      width: 320,
      align: "center",
    });
  doc.restore();

  const headerY = 28;
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
    .text("PAYMENT RECEIPT", left + 108, headerY + 14);

  doc
    .font("Helvetica")
    .fontSize(10)
    .fillColor("#CBD5E1")
    .text("Official payment acknowledgement", left + 108, headerY + 42);

  doc
    .roundedRect(right - 108, headerY + 16, 92, 28, 14)
    .fillAndStroke(colors.successBg, colors.successBorder);

  doc
    .font("Helvetica-Bold")
    .fontSize(10)
    .fillColor(colors.success)
    .text("PAID", right - 108, headerY + 25, {
      width: 92,
      align: "center",
    });

  const copyY = headerY + headerH + 10;

  doc
    .roundedRect(left, copyY, contentWidth, 26, 10)
    .fillAndStroke(colors.slateBg, colors.border);

  doc
    .font("Helvetica-Bold")
    .fontSize(9)
    .fillColor(colors.primary)
    .text("CUSTOMER COPY", left + 14, copyY + 9);

  doc
    .font("Helvetica")
    .fontSize(8.5)
    .fillColor(colors.soft)
    .text("Keep this receipt for future reference", right - 190, copyY + 9, {
      width: 176,
      align: "right",
    });

  const metaY = copyY + 36;
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

  const infoY = metaY + metaH + 14;
  const gap = 12;
  const halfW = (contentWidth - gap) / 2;
  const infoH = 132;

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

  const tableY = infoY + infoH + 16;

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

  const bottomY = itemY + itemH + 16;
  const summaryW = 220;
  const programW = contentWidth - summaryW - gap;

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

  const noteY = bottomY + 138;
  const qrBoxW = 112;
  const noteBoxW = contentWidth - qrBoxW - gap;

  // Professional QR box
  doc
    .roundedRect(left, noteY, qrBoxW, 96, 15)
    .fillAndStroke(colors.white, colors.border);

  doc
    .roundedRect(left + 10, noteY + 10, qrBoxW - 20, 18, 8)
    .fillAndStroke(colors.qrBg, "#E8EEF7");

  doc
    .font("Helvetica-Bold")
    .fontSize(9.3)
    .fillColor(colors.text)
    .text("Scan Details", left + 10, noteY + 15, {
      width: qrBoxW - 20,
      align: "center",
    });

  const qrWrapX = left + 18;
  const qrWrapY = noteY + 32;
  const qrWrapSize = 76;

  doc
    .roundedRect(qrWrapX, qrWrapY, qrWrapSize, qrWrapSize, 10)
    .fillAndStroke("#FFFFFF", "#E5EAF1");

  try {
    const qrSize = 64;
    const qrX = qrWrapX + (qrWrapSize - qrSize) / 2;
    const qrY = qrWrapY + (qrWrapSize - qrSize) / 2;

    doc.image(qrBuffer, qrX, qrY, {
      fit: [qrSize, qrSize],
      align: "center",
      valign: "center",
    });
  } catch (error) {
    console.error("QR IMAGE ERROR:", error.message);
  }

  const noteX = left + qrBoxW + gap;

  doc
    .roundedRect(noteX, noteY, noteBoxW, 96, 15)
    .fillAndStroke(colors.amberBg, colors.amberBorder);

  doc
    .font("Helvetica-Bold")
    .fontSize(10.2)
    .fillColor(colors.amberText)
    .text("Important Note", noteX + 14, noteY + 12);

  doc
    .font("Helvetica")
    .fontSize(9)
    .fillColor(colors.amberText)
    .text(
      "This is a system-generated payment receipt issued after successful payment verification. Please keep this receipt for support, enrollment verification, and future reference.",
      noteX + 14,
      noteY + 29,
      {
        width: noteBoxW - 28,
        align: "justify",
        lineGap: 2,
      }
    );

  const barcodeY = noteY + 108;

  doc
    .roundedRect(left, barcodeY, contentWidth, 46, 12)
    .fillAndStroke("#F8FAFC", colors.border);

  drawBarcodeStyle(
    doc,
    `${receiptNumber}${paymentId}${orderId}`,
    left + 18,
    barcodeY + 10,
    contentWidth - 36,
    18
  );

  doc
    .font("Helvetica")
    .fontSize(8.3)
    .fillColor(colors.soft)
    .text(`${receiptNumber} • ${paymentId}`, left, barcodeY + 31, {
      width: contentWidth,
      align: "center",
    });

  const footerY = pageHeight - 54;

  doc
    .strokeColor(colors.border)
    .lineWidth(1)
    .moveTo(left, footerY - 8)
    .lineTo(right, footerY - 8)
    .stroke();

  doc
    .font("Helvetica-Bold")
    .fontSize(9)
    .fillColor(colors.text)
    .text("Internova", left, footerY);

  doc
    .font("Helvetica")
    .fontSize(8.2)
    .fillColor(colors.soft)
    .text(
      "Finance Desk • Training Program Services • Support: internova.support@gmail.com",
      left + 58,
      footerY + 1,
      {
        width: contentWidth - 58,
        align: "left",
      }
    );

  doc
    .font("Helvetica")
    .fontSize(7.9)
    .fillColor(colors.soft)
    .text(
      "Computer-generated receipt • No physical signature required",
      left,
      footerY + 14,
      {
        width: contentWidth,
        align: "center",
      }
    );

  doc.end();
};

module.exports = generatePaymentSlipPdf;