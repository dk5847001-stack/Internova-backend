const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");

const generateCertificatePdf = ({
  studentName,
  internshipTitle,
  duration,
  certificateId,
  issueDate,
}) => {
  return new Promise((resolve, reject) => {
    try {
      const certificatesDir = path.join(__dirname, "../uploads/certificates");

      if (!fs.existsSync(certificatesDir)) {
        fs.mkdirSync(certificatesDir, { recursive: true });
      }

      const fileName = `${certificateId}.pdf`;
      const filePath = path.join(certificatesDir, fileName);

      const doc = new PDFDocument({
        layout: "landscape",
        size: "A4",
        margins: {
          top: 40,
          bottom: 40,
          left: 50,
          right: 50,
        },
      });

      const stream = fs.createWriteStream(filePath);

      doc.pipe(stream);
      doc.on("error", (err) => reject(err));
      stream.on("error", (err) => reject(err));

      const safeStudentName = studentName || "Student Name";
      const safeInternshipTitle = internshipTitle || "Internship Program";
      const safeDuration = duration || "Not specified";
      const safeIssueDate = issueDate
        ? new Date(issueDate).toLocaleDateString("en-IN")
        : new Date().toLocaleDateString("en-IN");

      // Border
      doc
        .lineWidth(4)
        .rect(20, 20, doc.page.width - 40, doc.page.height - 40)
        .stroke("#1e3a8a");

      doc
        .lineWidth(1.5)
        .rect(32, 32, doc.page.width - 64, doc.page.height - 64)
        .stroke("#60a5fa");

      // Title
      doc
        .fillColor("#0f172a")
        .fontSize(30)
        .font("Helvetica-Bold")
        .text("CERTIFICATE OF INTERNSHIP", 0, 70, {
          align: "center",
        });

      doc
        .moveDown(1)
        .fontSize(16)
        .font("Helvetica")
        .fillColor("#334155")
        .text("This certificate is proudly presented to", {
          align: "center",
        });

      doc
        .moveDown(1)
        .fontSize(28)
        .font("Helvetica-Bold")
        .fillColor("#111827")
        .text(safeStudentName, 100, doc.y, {
          align: "center",
          width: doc.page.width - 200,
          underline: true,
        });

      doc
        .moveDown(1.2)
        .fontSize(16)
        .font("Helvetica")
        .fillColor("#334155")
        .text(
          `for successfully completing the ${safeInternshipTitle}`,
          100,
          doc.y,
          {
            align: "center",
            width: doc.page.width - 200,
          }
        );

      doc
        .moveDown(0.6)
        .fontSize(16)
        .text(`Duration: ${safeDuration}`, {
          align: "center",
        });

      doc
        .moveDown(1.2)
        .fontSize(14)
        .fillColor("#475569")
        .text(`Issued on: ${safeIssueDate}`, {
          align: "center",
        });

      doc
        .moveDown(0.5)
        .fontSize(14)
        .text(`Certificate ID: ${certificateId}`, {
          align: "center",
        });

      // Signature lines
      doc
        .moveTo(120, 470)
        .lineTo(250, 470)
        .stroke("#111827");

      doc
        .moveTo(540, 470)
        .lineTo(670, 470)
        .stroke("#111827");

      doc
        .fontSize(12)
        .fillColor("#111827")
        .text("Authorized Signature", 115, 475);

      doc
        .fontSize(12)
        .text("Program Director", 565, 475);

      doc.end();

      stream.on("finish", () => {
        resolve({
          fileName,
          filePath,
        });
      });
    } catch (error) {
      reject(error);
    }
  });
};

module.exports = generateCertificatePdf;