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

const drawInfoBlock = (doc, label, value, x, y, width) => {
  doc
    .font("Helvetica-Bold")
    .fontSize(8.8)
    .fillColor("#64748B")
    .text(label, x, y, { width });

  doc
    .font("Helvetica")
    .fontSize(10)
    .fillColor("#0F172A")
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
    bg: "#F8FAFC",
    white: "#FFFFFF",
    text: "#0F172A",
    soft: "#64748B",
    border: "#E2E8F0",
    dark: "#0B1220",
    primary: "#1D4ED8",
    green: "#047857",
    greenBg: "#D1FAE5",
    greenBorder: "#86EFAC",
    blueBg: "#EFF6FF",
    amberBg: "#FFF7ED",
    amberBorder: "#FED7AA",
    amberText: "#9A3412",
  };

  const logoPath = path.join(__dirname, "../uploads/branding/logo.png");
  const altLogoPath = path.join(__dirname, "../uploads/branding/brand_logo.png");
  const finalLogoPath = fs.existsSync(logoPath)
    ? logoPath
    : fs.existsSync(altLogoPath)
    ? altLogoPath
    : null;

  const hasLogo = !!finalLogoPath;

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
  const amountPaid = Number(purchase?.amount || 0).toFixed(2);

  const purchaseTypeLabel =
    purchase?.purchaseType === "unlock_all"
      ? "Unlock All Add-on Access"
      : "Internship Enrollment";

  const durationLabel = purchase?.durationLabel || "N/A";

  const safeName = safeFileName(userName || "candidate");
  const fileName = `${safeName}_payment_receipt_${receiptNumber}.pdf`;

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);

  doc.pipe(res);

  doc.rect(0, 0, pageWidth, pageHeight).fill(colors.bg);

  doc
    .roundedRect(18, 18, pageWidth - 36, pageHeight - 36, 20)
    .fillAndStroke(colors.white, "#E5EAF1");

  const headerY = 34;
  const headerH = 84;

  doc
    .roundedRect(left, headerY, contentWidth, headerH, 18)
    .fillAndStroke(colors.dark, colors.dark);

  if (hasLogo) {
    try {
      doc.image(finalLogoPath, left + 16, headerY + 14, {
        fit: [90, 52],
      });
    } catch (error) {
      console.error("PAYMENT RECEIPT LOGO ERROR:", error.message);
    }
  }

  doc
    .font("Helvetica-Bold")
    .fontSize(23)
    .fillColor(colors.white)
    .text("PAYMENT RECEIPT", left + 120, headerY + 18);

  doc
    .font("Helvetica")
    .fontSize(10.5)
    .fillColor("#CBD5E1")
    .text("Secure transaction acknowledgement", left + 120, headerY + 48);

  doc
    .roundedRect(right - 104, headerY + 18, 88, 30, 15)
    .fillAndStroke(colors.greenBg, colors.greenBorder);

  doc
    .font("Helvetica-Bold")
    .fontSize(10)
    .fillColor(colors.green)
    .text("PAID", right - 104, headerY + 28, {
      width: 88,
      align: "center",
    });

  const metaY = headerY + headerH + 14;
  const metaH = 62;

  doc
    .roundedRect(left, metaY, contentWidth, metaH, 14)
    .fillAndStroke("#FCFDFE", colors.border);

  drawInfoBlock(doc, "Receipt Number", receiptNumber, left + 16, metaY + 12, 150);
  drawInfoBlock(doc, "Issue Date", issueDate, left + 190, metaY + 12, 120);
  drawInfoBlock(doc, "Transaction Time", issueDateTime, left + 330, metaY + 12, 190);

  const sectionY = metaY + metaH + 16;
  const gap = 14;
  const boxW = (contentWidth - gap) / 2;
  const boxH = 132;

  doc
    .roundedRect(left, sectionY, boxW, boxH, 16)
    .fillAndStroke(colors.white, colors.border);

  doc
    .roundedRect(left, sectionY, boxW, 30, 16)
    .fillAndStroke(colors.blueBg, colors.blueBg);

  doc
    .font("Helvetica-Bold")
    .fontSize(11)
    .fillColor(colors.primary)
    .text("Bill To", left + 14, sectionY + 10);

  drawInfoBlock(doc, "Name", userName, left + 14, sectionY + 42, boxW - 28);
  drawInfoBlock(doc, "Email", userEmail, left + 14, sectionY + 73, boxW - 28);
  drawInfoBlock(doc, "Phone", userPhone, left + 14, sectionY + 104, boxW - 28);

  const paymentBoxX = left + boxW + gap;

  doc
    .roundedRect(paymentBoxX, sectionY, boxW, boxH, 16)
    .fillAndStroke(colors.white, colors.border);

  doc
    .roundedRect(paymentBoxX, sectionY, boxW, 30, 16)
    .fillAndStroke("#EEFDF5", "#EEFDF5");

  doc
    .font("Helvetica-Bold")
    .fontSize(11)
    .fillColor(colors.green)
    .text("Payment Details", paymentBoxX + 14, sectionY + 10);

  drawInfoBlock(
    doc,
    "Payment ID",
    paymentId,
    paymentBoxX + 14,
    sectionY + 42,
    boxW - 28
  );
  drawInfoBlock(
    doc,
    "Order ID",
    orderId,
    paymentBoxX + 14,
    sectionY + 73,
    boxW - 28
  );
  drawInfoBlock(
    doc,
    "Payment Method",
    "Razorpay Online Payment",
    paymentBoxX + 14,
    sectionY + 104,
    boxW - 28
  );

  const tableY = sectionY + boxH + 18;

  doc
    .roundedRect(left, tableY, contentWidth, 36, 12)
    .fillAndStroke("#F8FAFC", colors.border);

  doc
    .font("Helvetica-Bold")
    .fontSize(9.5)
    .fillColor(colors.soft)
    .text("DESCRIPTION", left + 16, tableY + 13)
    .text("CATEGORY", left + 275, tableY + 13)
    .text("DURATION", left + 390, tableY + 13)
    .text("AMOUNT", right - 85, tableY + 13, { width: 70, align: "right" });

  const rowY = tableY + 36;
  const rowH = 62;

  doc
    .roundedRect(left, rowY, contentWidth, rowH, 12)
    .fillAndStroke(colors.white, colors.border);

  doc
    .font("Helvetica-Bold")
    .fontSize(10.4)
    .fillColor(colors.text)
    .text(internshipTitle, left + 16, rowY + 14, {
      width: 235,
    });

  doc
    .font("Helvetica")
    .fontSize(8.8)
    .fillColor(colors.soft)
    .text(purchaseTypeLabel, left + 16, rowY + 33, {
      width: 235,
    });

  doc
    .font("Helvetica")
    .fontSize(10)
    .fillColor(colors.text)
    .text(internshipCategory, left + 275, rowY + 22, { width: 95 })
    .text(durationLabel, left + 390, rowY + 22, { width: 90 });

  doc
    .font("Helvetica-Bold")
    .fontSize(11)
    .fillColor(colors.text)
    .text(`INR ${amountPaid}`, right - 100, rowY + 21, {
      width: 85,
      align: "right",
    });

  const summaryY = rowY + rowH + 20;
  const summaryW = 210;
  const summaryX = right - summaryW;

  doc
    .roundedRect(summaryX, summaryY, summaryW, 116, 16)
    .fillAndStroke("#FCFDFE", colors.border);

  doc
    .font("Helvetica-Bold")
    .fontSize(11)
    .fillColor(colors.text)
    .text("Payment Summary", summaryX + 14, summaryY + 12);

  doc
    .font("Helvetica")
    .fontSize(10)
    .fillColor(colors.soft)
    .text("Subtotal", summaryX + 14, summaryY + 42)
    .text("Platform Charges", summaryX + 14, summaryY + 66)
    .text("Total Paid", summaryX + 14, summaryY + 92);

  doc
    .font("Helvetica")
    .fontSize(10)
    .fillColor(colors.text)
    .text(`INR ${amountPaid}`, summaryX + 120, summaryY + 42, {
      width: 76,
      align: "right",
    })
    .text("INR 0.00", summaryX + 120, summaryY + 66, {
      width: 76,
      align: "right",
    });

  doc
    .font("Helvetica-Bold")
    .fontSize(11)
    .fillColor(colors.green)
    .text(`INR ${amountPaid}`, summaryX + 120, summaryY + 92, {
      width: 76,
      align: "right",
    });

  // Fixed program block
  const leftInfoY = summaryY;
  const leftInfoW = contentWidth - summaryW - 16;
  const leftInfoH = 116;

  doc
    .roundedRect(left, leftInfoY, leftInfoW, leftInfoH, 16)
    .fillAndStroke(colors.white, colors.border);

  doc
    .font("Helvetica-Bold")
    .fontSize(11)
    .fillColor(colors.text)
    .text("Program Information", left + 14, leftInfoY + 12);

  drawInfoBlock(
    doc,
    "Program Name",
    internshipTitle,
    left + 14,
    leftInfoY + 42,
    leftInfoW - 28
  );

  drawInfoBlock(
    doc,
    "Branch",
    internshipBranch,
    left + 14,
    leftInfoY + 82,
    140
  );

  drawInfoBlock(
    doc,
    "Category",
    internshipCategory,
    left + 190,
    leftInfoY + 82,
    leftInfoW - 204
  );

  const noteY = summaryY + 134;

  doc
    .roundedRect(left, noteY, contentWidth, 76, 16)
    .fillAndStroke(colors.amberBg, colors.amberBorder);

  doc
    .font("Helvetica-Bold")
    .fontSize(10.4)
    .fillColor(colors.amberText)
    .text("Important", left + 14, noteY + 12);

  doc
    .font("Helvetica")
    .fontSize(9.2)
    .fillColor(colors.amberText)
    .text(
      "This is a system-generated payment receipt issued after successful payment verification. Please keep this receipt for support, enrollment verification, and future reference.",
      left + 14,
      noteY + 30,
      {
        width: contentWidth - 28,
        align: "justify",
        lineGap: 2,
      }
    );

  const footerY = pageHeight - 52;

  doc
    .strokeColor(colors.border)
    .lineWidth(1)
    .moveTo(left, footerY - 10)
    .lineTo(right, footerY - 10)
    .stroke();

  doc
    .font("Helvetica")
    .fontSize(8.5)
    .fillColor(colors.soft)
    .text(
      "Internova • Finance Desk • This is a computer-generated receipt and does not require a physical signature.",
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