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

      const pageWidth = doc.page.width;
      const pageHeight = doc.page.height;

      // Background outer border
      doc
        .lineWidth(6)
        .strokeColor("#0f172a")
        .rect(20, 20, pageWidth - 40, pageHeight - 40)
        .stroke();

      // Inner premium border
      doc
        .lineWidth(2)
        .strokeColor("#d4af37")
        .rect(35, 35, pageWidth - 70, pageHeight - 70)
        .stroke();

      // Decorative top line
      doc
        .moveTo(120, 85)
        .lineTo(pageWidth - 120, 85)
        .lineWidth(1.5)
        .strokeColor("#d4af37")
        .stroke();

      // Brand
      doc
        .font("Helvetica-Bold")
        .fontSize(18)
        .fillColor("#0f172a")
        .text("INTERNOVA", 0, 55, { align: "center" });

      // Main title
      doc
        .font("Helvetica-Bold")
        .fontSize(30)
        .fillColor("#b8860b")
        .text("CERTIFICATE OF INTERNSHIP", 0, 105, { align: "center" });

      // Subtitle
      doc
        .font("Helvetica")
        .fontSize(15)
        .fillColor("#475569")
        .text("This certificate is proudly presented to", 0, 160, {
          align: "center",
        });

      // Student Name
      doc
        .font("Helvetica-Bold")
        .fontSize(28)
        .fillColor("#111827")
        .text(safeStudentName, 100, 205, {
          align: "center",
          width: pageWidth - 200,
          underline: true,
        });

      // Description
      doc
        .font("Helvetica")
        .fontSize(16)
        .fillColor("#334155")
        .text(
          `for successfully completing the internship program "${safeInternshipTitle}"`,
          110,
          265,
          {
            align: "center",
            width: pageWidth - 220,
          }
        );

      doc
        .moveDown(0.7)
        .fontSize(15)
        .text(`Duration: ${safeDuration}`, {
          align: "center",
        });

      doc
        .moveDown(0.3)
        .fontSize(14)
        .fillColor("#475569")
        .text(`Issued on: ${safeIssueDate}`, {
          align: "center",
        });

      // Certificate ID box
      doc
        .roundedRect(pageWidth / 2 - 140, 375, 280, 34, 8)
        .lineWidth(1.2)
        .strokeColor("#d4af37")
        .stroke();

      doc
        .font("Helvetica-Bold")
        .fontSize(12)
        .fillColor("#0f172a")
        .text(`Certificate ID: ${certificateId}`, pageWidth / 2 - 140, 386, {
          width: 280,
          align: "center",
        });

      // Signature lines
      doc
        .moveTo(120, 470)
        .lineTo(250, 470)
        .lineWidth(1)
        .strokeColor("#111827")
        .stroke();

      doc
        .moveTo(pageWidth - 250, 470)
        .lineTo(pageWidth - 120, 470)
        .lineWidth(1)
        .strokeColor("#111827")
        .stroke();

      doc
        .font("Helvetica")
        .fontSize(12)
        .fillColor("#111827")
        .text("Authorized Signature", 105, 478);

      doc
        .text("Program Director", pageWidth - 245, 478);

      // Footer
      doc
        .fontSize(10)
        .fillColor("#64748b")
        .text("This certificate is digitally generated and valid upon verification.", 0, 535, {
          align: "center",
        });

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