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
      const safeInternshipTitle = internshipTitle || "Training Program";
      const safeDuration = duration || "Not specified";
      const safeIssueDate = issueDate
        ? new Date(issueDate).toLocaleDateString("en-IN")
        : new Date().toLocaleDateString("en-IN");

      const pageWidth = doc.page.width;
      const pageHeight = doc.page.height;

      const logoPath = path.join(__dirname, "../assets/logo.png");
      const signaturePath = path.join(__dirname, "../assets/signature.png");
      const stampPath = path.join(__dirname, "../assets/stamp.png");

const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL || "http://localhost:5000/api";

const verifyUrl = `${process.env.CLIENT_URL}/verify/${certificate.certificateId}`;
      // Background
      doc.rect(0, 0, pageWidth, pageHeight).fill("#fcfcf9");

      // Outer border
      doc
        .lineWidth(7)
        .strokeColor("#0f172a")
        .rect(18, 18, pageWidth - 36, pageHeight - 36)
        .stroke();

      // Inner gold border
      doc
        .lineWidth(1.8)
        .strokeColor("#c8a44d")
        .rect(34, 34, pageWidth - 68, pageHeight - 68)
        .stroke();

      // Decorative inner line
      doc
        .lineWidth(0.8)
        .strokeColor("#e2c46c")
        .rect(42, 42, pageWidth - 84, pageHeight - 84)
        .stroke();

      // Logo
      if (fs.existsSync(logoPath)) {
        doc.image(logoPath, 70, 52, {
          fit: [70, 70],
          align: "center",
          valign: "center",
        });
      }

      // Brand name
      doc
        .font("Helvetica-Bold")
        .fontSize(20)
        .fillColor("#0f172a")
        .text("INTERNOVA", 0, 56, {
          align: "center",
        });

      doc
        .font("Helvetica")
        .fontSize(10)
        .fillColor("#64748b")
        .text("Professional Internship Certification", 0, 82, {
          align: "center",
        });

      // Top decorative line
      doc
        .moveTo(150, 108)
        .lineTo(pageWidth - 150, 108)
        .lineWidth(1.2)
        .strokeColor("#c8a44d")
        .stroke();

      // Main title
      doc
        .font("Helvetica-Bold")
        .fontSize(30)
        .fillColor("#b8860b")
        .text("CERTIFICATE OF INTERNSHIP", 0, 128, {
          align: "center",
        });

      // Subtitle
      doc
        .font("Helvetica")
        .fontSize(15)
        .fillColor("#475569")
        .text("This certificate is proudly presented to", 0, 180, {
          align: "center",
        });

      // Name
      doc
        .font("Helvetica-Bold")
        .fontSize(29)
        .fillColor("#111827")
        .text(safeStudentName, 100, 220, {
          width: pageWidth - 200,
          align: "center",
          underline: true,
        });

      // Description
      doc
        .font("Helvetica")
        .fontSize(16)
        .fillColor("#334155")
        .text(
          `for successfully completing the Training Program "${safeInternshipTitle}"`,
          110,
          280,
          {
            width: pageWidth - 220,
            align: "center",
          }
        );

      doc
        .fontSize(15)
        .fillColor("#334155")
        .text(`Duration: ${safeDuration}`, 0, 338, {
          align: "center",
        });

      doc
        .fontSize(14)
        .fillColor("#475569")
        .text(`Issued on: ${safeIssueDate}`, 0, 364, {
          align: "center",
        });

      // Certificate ID premium box
      doc
        .roundedRect(pageWidth / 2 - 165, 398, 330, 36, 10)
        .lineWidth(1.2)
        .strokeColor("#c8a44d")
        .stroke();

      doc
        .font("Helvetica-Bold")
        .fontSize(12)
        .fillColor("#0f172a")
        .text(`Certificate ID: ${certificateId}`, pageWidth / 2 - 165, 410, {
          width: 330,
          align: "center",
        });

      // Stamp / seal
      if (fs.existsSync(stampPath)) {
        doc.image(stampPath, pageWidth - 210, 330, {
          fit: [95, 95],
          opacity: 0.9,
        });
      } else {
        doc
          .circle(pageWidth - 150, 385, 42)
          .lineWidth(2)
          .strokeColor("#c8a44d")
          .stroke();

        doc
          .font("Helvetica-Bold")
          .fontSize(10)
          .fillColor("#b8860b")
          .text("VERIFIED", pageWidth - 178, 381, {
            width: 56,
            align: "center",
          });
      }

      // Left signature
      if (fs.existsSync(signaturePath)) {
        doc.image(signaturePath, 100, 455, {
          fit: [90, 40],
        });
      }

      doc
        .moveTo(90, 500)
        .lineTo(230, 500)
        .lineWidth(1)
        .strokeColor("#111827")
        .stroke();

      doc
        .font("Helvetica")
        .fontSize(12)
        .fillColor("#111827")
        .text("Authorized Signature", 88, 507);

      // Right signature line
      doc
        .moveTo(pageWidth - 230, 500)
        .lineTo(pageWidth - 90, 500)
        .lineWidth(1)
        .strokeColor("#111827")
        .stroke();

      doc
        .font("Helvetica")
        .fontSize(12)
        .fillColor("#111827")
        .text("Program Director", pageWidth - 215, 507);

      // Footer verification text
      doc
        .font("Helvetica")
        .fontSize(10)
        .fillColor("#64748b")
        .text("This certificate is digitally generated and valid upon verification.", 0, 545, {
          align: "center",
        });

      doc
        .fontSize(9)
        .fillColor("#94a3b8")
        .text(`Verify: ${verifyUrl}`, 0, 560, {
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