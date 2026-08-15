const fs = require("fs");
const path = require("path");
const PDFDocument = require("pdfkit");
const { PDFDocument: PDFLibDocument } = require("pdf-lib");

const root = path.resolve(__dirname, "..");
const outputDir = path.join(root, "uploads", "branding");
const profilePath = path.join(outputDir, "InternovaTech_Company_Profile_2026_profile_only.pdf");
const finalPath = path.join(outputDir, "InternovaTech_Company_Profile_2026_Premium_Merged.pdf");

const samplePdfs = [
  path.join(
    "C:",
    "Users",
    "pkper",
    "OneDrive",
    "Documents",
    "project_report",
    "sample",
    "certificate.pdf"
  ),
  path.join(
    "C:",
    "Users",
    "pkper",
    "OneDrive",
    "Documents",
    "project_report",
    "sample",
    "Full_Stack_Web_Development_Training_Program_offer_letter (1).pdf"
  ),
  path.join(
    "C:",
    "Users",
    "pkper",
    "OneDrive",
    "Documents",
    "project_report",
    "sample",
    "Full_Stack_Web_Development_Training_Program_payment_slip (1).pdf"
  ),
  path.join(
    root,
    "uploads",
    "branding",
    "FIRST FOUR PAGES OF PROJECT REPORT - ARDENT(UPDATE NEW 2026).single.pdf"
  ),
];

const palette = {
  ink: "#111827",
  muted: "#5B6474",
  faint: "#EEF2F7",
  line: "#D7DEE9",
  blue: "#2563EB",
  cyan: "#06B6D4",
  emerald: "#10B981",
  amber: "#F59E0B",
  rose: "#F43F5E",
  violet: "#7C3AED",
  navy: "#0B1220",
};

const W = 595.28;
const H = 841.89;
const M = 44;

function ensureOutputDir() {
  fs.mkdirSync(outputDir, { recursive: true });
}

function gradient(doc, x, y, w, h, a, b) {
  const g = doc.linearGradient(x, y, x + w, y + h);
  g.stop(0, a).stop(1, b);
  return g;
}

function premiumFrame(doc, title, pageNo) {
  doc.save();
  doc.rect(0, 0, W, H).fill("#FBFCFF");
  doc
    .lineWidth(1.2)
    .strokeColor("#BBC7D8")
    .roundedRect(22, 22, W - 44, H - 44, 14)
    .stroke();
  doc
    .lineWidth(0.5)
    .strokeColor("#E8EDF5")
    .roundedRect(31, 31, W - 62, H - 62, 10)
    .stroke();
  doc
    .fillColor(palette.blue)
    .circle(44, 44, 4)
    .fill()
    .fillColor(palette.cyan)
    .circle(W - 44, 44, 4)
    .fill()
    .fillColor(palette.emerald)
    .circle(44, H - 44, 4)
    .fill()
    .fillColor(palette.amber)
    .circle(W - 44, H - 44, 4)
    .fill();
  doc
    .font("Helvetica-Bold")
    .fontSize(8)
    .fillColor(palette.muted)
    .text("INTERNOVATECH COMPANY PROFILE 2026", M, 30, { width: 280 });
  doc
    .font("Helvetica")
    .fontSize(8)
    .fillColor(palette.muted)
    .text(String(pageNo).padStart(2, "0"), W - M - 30, 30, { width: 30, align: "right" });
  if (title) {
    doc
      .font("Helvetica-Bold")
      .fontSize(20)
      .fillColor(palette.ink)
      .text(title, M, 70, { width: W - M * 2 });
  }
  doc.restore();
}

function tag(doc, text, x, y, color) {
  doc.save();
  doc.roundedRect(x, y, doc.widthOfString(text) + 18, 23, 11).fill(color);
  doc.font("Helvetica-Bold").fontSize(8.5).fillColor("#FFFFFF").text(text, x + 9, y + 7);
  doc.restore();
}

function stat(doc, label, value, x, y, color) {
  doc.save();
  doc.roundedRect(x, y, 112, 75, 9).fill("#FFFFFF").strokeColor("#E1E8F2").stroke();
  doc.font("Helvetica-Bold").fontSize(22).fillColor(color).text(value, x + 14, y + 15);
  doc.font("Helvetica").fontSize(8.8).fillColor(palette.muted).text(label, x + 14, y + 45, { width: 84 });
  doc.restore();
}

function body(doc, text, x, y, width, size = 10.5) {
  doc.font("Helvetica").fontSize(size).fillColor(palette.muted).text(text, x, y, {
    width,
    lineGap: 5,
  });
}

function sectionLabel(doc, text, x, y, color = palette.blue) {
  doc
    .font("Helvetica-Bold")
    .fontSize(9)
    .fillColor(color)
    .text(text.toUpperCase(), x, y, { characterSpacing: 0.8 });
}

function bulletList(doc, items, x, y, width) {
  let cursor = y;
  items.forEach((item) => {
    doc.circle(x + 4, cursor + 5, 2.4).fill(palette.blue);
    doc.font("Helvetica").fontSize(10).fillColor(palette.muted).text(item, x + 16, cursor, {
      width,
      lineGap: 3,
    });
    cursor += 36;
  });
}

function processNode(doc, x, y, number, title, text, color) {
  doc.save();
  doc.roundedRect(x, y, 112, 114, 12).fill("#FFFFFF").strokeColor("#DFE7F2").stroke();
  doc.circle(x + 23, y + 24, 15).fill(color);
  doc.font("Helvetica-Bold").fontSize(10).fillColor("#FFFFFF").text(number, x + 15, y + 19, { width: 16, align: "center" });
  doc.font("Helvetica-Bold").fontSize(12).fillColor(palette.ink).text(title, x + 16, y + 49, { width: 80 });
  doc.font("Helvetica").fontSize(8.5).fillColor(palette.muted).text(text, x + 16, y + 70, { width: 82, lineGap: 2 });
  doc.restore();
}

function drawFlow(doc, y) {
  const nodes = [
    ["01", "Explore", "Choose a role-focused internship path.", palette.blue],
    ["02", "Enroll", "Unlock guided learning with a clean dashboard.", palette.cyan],
    ["03", "Progress", "Complete modules, tasks, and assessments.", palette.emerald],
    ["04", "Validate", "Generate and verify digital credentials.", palette.violet],
  ];
  nodes.forEach((node, i) => {
    const x = M + i * 126;
    processNode(doc, x, y, ...node);
    if (i < nodes.length - 1) {
      doc.moveTo(x + 112, y + 56).lineTo(x + 126, y + 56).strokeColor("#AAB8CC").lineWidth(1.2).stroke();
      doc.moveTo(x + 122, y + 51).lineTo(x + 128, y + 56).lineTo(x + 122, y + 61).stroke();
    }
  });
}

function drawBars(doc, x, y, labels, values, colors) {
  labels.forEach((label, i) => {
    const yy = y + i * 42;
    doc.font("Helvetica-Bold").fontSize(9.5).fillColor(palette.ink).text(label, x, yy, { width: 150 });
    doc.roundedRect(x + 160, yy + 2, 250, 10, 5).fill("#E8EEF7");
    doc.roundedRect(x + 160, yy + 2, 250 * values[i], 10, 5).fill(colors[i]);
    doc.font("Helvetica-Bold").fontSize(9).fillColor(colors[i]).text(`${Math.round(values[i] * 100)}%`, x + 422, yy - 1);
  });
}

function drawRadar(doc, cx, cy) {
  const axes = [
    ["Guidance", 0.92],
    ["Progress", 0.86],
    ["Trust", 0.9],
    ["UI", 0.88],
    ["Support", 0.8],
    ["Domains", 0.84],
  ];
  const radius = 86;
  const polygonPath = (points) => {
    doc.moveTo(points[0][0], points[0][1]);
    points.slice(1).forEach(([x, y]) => doc.lineTo(x, y));
    doc.closePath();
  };
  doc.save();
  for (let ring = 1; ring <= 4; ring += 1) {
    const r = (radius * ring) / 4;
    const points = axes.map((_, i) => {
        const a = -Math.PI / 2 + (i * Math.PI * 2) / axes.length;
        return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
      });
    polygonPath(points);
    doc.strokeColor("#E0E8F2").lineWidth(0.8).stroke();
  }
  axes.forEach(([label], i) => {
    const a = -Math.PI / 2 + (i * Math.PI * 2) / axes.length;
    doc.moveTo(cx, cy).lineTo(cx + Math.cos(a) * radius, cy + Math.sin(a) * radius).strokeColor("#D4DEEC").stroke();
    doc.font("Helvetica-Bold").fontSize(8).fillColor(palette.muted).text(label, cx + Math.cos(a) * (radius + 12) - 30, cy + Math.sin(a) * (radius + 12) - 4, { width: 60, align: "center" });
  });
  const points = axes.map(([, value], i) => {
    const a = -Math.PI / 2 + (i * Math.PI * 2) / axes.length;
    return [cx + Math.cos(a) * radius * value, cy + Math.sin(a) * radius * value];
  });
  polygonPath(points);
  doc.fillOpacity(0.16).fill(palette.blue).fillOpacity(1);
  polygonPath(points);
  doc.strokeColor(palette.blue).lineWidth(1.5).stroke();
  doc.restore();
}

function addCover(doc) {
  premiumFrame(doc, "", 1);
  doc.rect(31, 31, W - 62, 250).fill(gradient(doc, 31, 31, W - 62, 250, "#07111F", "#1E40AF"));
  doc.fillColor("#FFFFFF").font("Helvetica-Bold").fontSize(13).text("I", M, 58);
  doc.font("Helvetica-Bold").fontSize(30).text("InternovaTech", M, 92, { width: 280 });
  doc.font("Helvetica").fontSize(13).fillColor("#DCEBFF").text("Company Introduction and Premium Profile", M, 130);
  doc.font("Helvetica-Bold").fontSize(42).fillColor("#FFFFFF").text("Online Internship Programs, Verified Certificates and Tech Training", M, 170, { width: 470, lineGap: 2 });
  tag(doc, "2026 PROFILE", M, 300, palette.blue);
  tag(doc, "PREMIUM SAAS LEARNING", M + 105, 300, palette.emerald);
  tag(doc, "VERIFIED ACHIEVEMENT", M + 260, 300, palette.violet);
  body(doc, "InternovaTech is positioned as a modern learning ecosystem for students, freshers, and career-focused learners who want structured internship programs, practical modules, progress tracking, assessments, and certificate verification in one polished platform.", M, 360, 500, 12);
  stat(doc, "Core program domains", "6+", M, 500, palette.blue);
  stat(doc, "Learner journey stages", "4", M + 126, 500, palette.emerald);
  stat(doc, "Digital verification ready", "24/7", M + 252, 500, palette.violet);
  stat(doc, "Support window", "6D", M + 378, 500, palette.amber);
  doc.font("Helvetica").fontSize(8).fillColor("#7B8494").text("Prepared as a premium company profile with realistic dummy operating data and merged document samples.", M, 745, { width: 480, align: "center" });
}

function addOverview(doc) {
  premiumFrame(doc, "Company Overview", 2);
  sectionLabel(doc, "Profile Summary", M, 122);
  body(doc, "InternovaTech helps learners access structured online internship-style training across in-demand domains. The platform combines guided modules, practical learning, progress visibility, mini assessments, and public certificate verification support. Its positioning is premium, digital-first, and outcome-oriented for students and freshers preparing for career growth.", M, 145, 500, 11.3);
  sectionLabel(doc, "Brand Personality", M, 268, palette.emerald);
  bulletList(doc, [
    "Futuristic SaaS-style learner workspace with a clean, trusted interface.",
    "Practical skill development supported by measurable progress and checkpoints.",
    "Digital certificates designed for transparent public validation.",
    "Multi-domain program architecture for technology, analytics, finance, and marketing learners.",
  ], M, 292, 470);
  doc.roundedRect(M, 485, 500, 170, 14).fill("#FFFFFF").strokeColor("#E0E7F1").stroke();
  doc.font("Helvetica-Bold").fontSize(18).fillColor(palette.ink).text("Strategic Promise", M + 24, 512);
  body(doc, "Make online internship programs more accessible, professional, and credible by connecting structured learning, learner support, assessment readiness, and verified achievement into one unified experience.", M + 24, 545, 445, 12);
  tag(doc, "ACCESS", M + 24, 618, palette.blue);
  tag(doc, "SKILL", M + 103, 618, palette.emerald);
  tag(doc, "TRUST", M + 168, 618, palette.violet);
  tag(doc, "CAREER", M + 232, 618, palette.amber);
}

function addEcosystem(doc) {
  premiumFrame(doc, "Learning Ecosystem", 3);
  body(doc, "The InternovaTech ecosystem is designed around a simple learning loop: discover, enroll, progress, validate. Each layer reduces learner confusion and makes outcomes easier to track.", M, 120, 500, 11);
  drawFlow(doc, 215);
  sectionLabel(doc, "Ecosystem Components", M, 390, palette.cyan);
  const cards = [
    ["Program Explorer", "Role-focused discovery across Web Development, AI and ML, Data Science, Finance, Business Analytics, and Digital Marketing."],
    ["Learner Dashboard", "Progress meters, module states, assessment readiness, certificate eligibility, and account-level continuity."],
    ["Verification Portal", "Certificate ID and QR-linked validation flow for public authenticity checks."],
    ["Support Layer", "Learner help for internship access, certificates, account issues, payments, and program queries."],
  ];
  cards.forEach(([title, text], i) => {
    const x = M + (i % 2) * 258;
    const y = 425 + Math.floor(i / 2) * 112;
    doc.roundedRect(x, y, 238, 88, 10).fill("#FFFFFF").strokeColor("#E0E7F1").stroke();
    doc.font("Helvetica-Bold").fontSize(12).fillColor(palette.ink).text(title, x + 16, y + 16);
    doc.font("Helvetica").fontSize(8.9).fillColor(palette.muted).text(text, x + 16, y + 38, { width: 202, lineGap: 2.5 });
  });
}

function addPrograms(doc) {
  premiumFrame(doc, "Program Portfolio", 4);
  body(doc, "InternovaTech can present a multi-domain catalog for learners with different career directions. The dummy mix below is structured to look realistic for a premium training platform profile.", M, 120, 500, 11);
  drawBars(
    doc,
    M,
    205,
    ["Web Development", "AI and Machine Learning", "Data Science", "Business Analytics", "Digital Marketing", "Finance"],
    [0.92, 0.84, 0.81, 0.76, 0.72, 0.68],
    [palette.blue, palette.violet, palette.cyan, palette.emerald, palette.amber, palette.rose]
  );
  sectionLabel(doc, "Illustrative Delivery Model", M, 505, palette.violet);
  bulletList(doc, [
    "4 to 8 week guided learning paths with project tasks and module checkpoints.",
    "Mini assessments used to improve readiness and identify gaps before completion.",
    "Completion criteria connected to certificate eligibility and final validation.",
    "Portfolio-oriented outcomes for students, freshers, and early-career learners.",
  ], M, 530, 470);
}

function addPlatform(doc) {
  premiumFrame(doc, "Platform Experience", 5);
  body(doc, "The product experience should feel like a professional internship workspace instead of a static course library. The platform concept below combines operational clarity with learner confidence.", M, 120, 500, 11);
  doc.roundedRect(M, 190, 500, 315, 18).fill("#0B1220");
  doc.roundedRect(M + 20, 215, 460, 52, 10).fill("#111C31");
  doc.font("Helvetica-Bold").fontSize(16).fillColor("#FFFFFF").text("InternovaTech Workspace", M + 38, 233);
  doc.font("Helvetica").fontSize(9).fillColor("#BFD1F5").text("Program completion, assessments, certificates, and support in one dashboard.", M + 38, 253);
  stat(doc, "Program completion", "82%", M + 30, 300, palette.blue);
  stat(doc, "Assessment readiness", "74%", M + 157, 300, palette.emerald);
  stat(doc, "Certificate eligibility", "90%", M + 284, 300, palette.violet);
  drawBars(doc, M + 52, 410, ["Modules", "Tasks", "Tests"], [0.82, 0.78, 0.74], [palette.blue, palette.cyan, palette.emerald]);
  sectionLabel(doc, "Experience Principles", M, 555, palette.emerald);
  bulletList(doc, [
    "Learners should always know what is unlocked, in progress, completed, and pending.",
    "Every major action should produce a clear status: enrolled, progressing, eligible, verified.",
    "The system should make support, certificates, and program navigation easy to find.",
  ], M, 582, 470);
}

function addVerification(doc) {
  premiumFrame(doc, "Certificate Verification", 6);
  body(doc, "Verified digital achievement is a major trust signal for InternovaTech. The company profile should highlight the authenticity portal and QR-linked verification logic as a core credibility feature.", M, 120, 500, 11);
  doc.roundedRect(M, 200, 238, 260, 14).fill("#FFFFFF").strokeColor("#DDE6F2").stroke();
  doc.font("Helvetica-Bold").fontSize(15).fillColor(palette.ink).text("Validation Stack", M + 22, 228);
  bulletList(doc, [
    "Certificate ID lookup",
    "Candidate and program details",
    "Issue date and status review",
    "QR-linked verification page",
  ], M + 22, 268, 190);
  doc.roundedRect(M + 272, 200, 228, 260, 14).fill(gradient(doc, M + 272, 200, 228, 260, "#EFF6FF", "#ECFDF5")).strokeColor("#DDE6F2").stroke();
  doc.font("Helvetica-Bold").fontSize(13).fillColor(palette.ink).text("Sample Verification Flow", M + 294, 230);
  ["Input Certificate ID", "Match secure record", "Show learner details", "Confirm valid status"].forEach((t, i) => {
    const y = 275 + i * 38;
    doc.circle(M + 304, y + 5, 8).fill([palette.blue, palette.cyan, palette.emerald, palette.violet][i]);
    doc.font("Helvetica-Bold").fontSize(9).fillColor("#FFFFFF").text(String(i + 1), M + 300, y, { width: 8, align: "center" });
    doc.font("Helvetica").fontSize(10).fillColor(palette.muted).text(t, M + 325, y - 1);
  });
  sectionLabel(doc, "Trust Outcome", M, 520, palette.blue);
  body(doc, "Public validation helps learners present stronger outcomes and gives reviewers a practical way to confirm authenticity. This turns certificates from static files into verifiable digital records.", M, 545, 500, 11.3);
}

function addOperatingModel(doc) {
  premiumFrame(doc, "Operating Model", 7);
  body(doc, "The operating model below shows a realistic premium training-platform workflow from program creation to learner success.", M, 120, 500, 11);
  const rows = [
    ["Content Ops", "Program structure, module assets, practical tasks, assessment pools."],
    ["Platform Ops", "Dashboard access, progress logic, payment flow, certificate generation."],
    ["Learner Success", "Support, reminders, issue resolution, completion guidance."],
    ["Trust Ops", "Verification portal, document checks, certificate records, audit notes."],
  ];
  rows.forEach(([a, b], i) => {
    const y = 205 + i * 94;
    doc.roundedRect(M, y, 500, 64, 12).fill("#FFFFFF").strokeColor("#DEE7F2").stroke();
    doc.rect(M, y, 10, 64).fill([palette.blue, palette.cyan, palette.emerald, palette.violet][i]);
    doc.font("Helvetica-Bold").fontSize(13).fillColor(palette.ink).text(a, M + 28, y + 16);
    doc.font("Helvetica").fontSize(10).fillColor(palette.muted).text(b, M + 170, y + 16, { width: 315, lineGap: 3 });
  });
  tag(doc, "LEAN OPERATIONS", M, 640, palette.blue);
  tag(doc, "DIGITAL TRUST", M + 120, 640, palette.violet);
  tag(doc, "LEARNER FIRST", M + 230, 640, palette.emerald);
}

function addMarket(doc) {
  premiumFrame(doc, "Market Positioning", 8);
  body(doc, "InternovaTech sits in the growing space between online learning, internship-style skill development, and digital credential validation. The profile below uses realistic illustrative indicators for business storytelling.", M, 120, 500, 11);
  drawRadar(doc, W / 2, 335);
  sectionLabel(doc, "Positioning Statement", M, 525, palette.rose);
  body(doc, "A premium online internship and certificate platform for learners who want guided, practical, trackable, and verifiable career-oriented learning without the friction of scattered tools.", M, 550, 500, 12);
  stat(doc, "Target learner segment", "18-28", M, 640, palette.blue);
  stat(doc, "Primary domains", "6", M + 126, 640, palette.emerald);
  stat(doc, "Journey stages", "4", M + 252, 640, palette.violet);
  stat(doc, "Support days", "Mon-Sat", M + 378, 640, palette.amber);
}

function addTechnology(doc) {
  premiumFrame(doc, "Technology and Trust Architecture", 9);
  body(doc, "A premium company profile should make the platform look organized, scalable, and credible. The architecture below is a high-level business diagram, not a source-code claim.", M, 120, 500, 11);
  const layers = [
    ["Learner Interface", "Programs, dashboard, progress, certificates, support"],
    ["Application Services", "Auth, payments, purchases, progress, quiz, notifications"],
    ["Document Layer", "Certificates, payment slips, offer letters, generated PDFs"],
    ["Trust Layer", "Certificate ID lookup, QR verification, audit-friendly records"],
    ["Data Layer", "Users, enrollments, purchases, test results, support messages"],
  ];
  layers.forEach(([title, text], i) => {
    const y = 200 + i * 78;
    doc.roundedRect(M + i * 8, y, 500 - i * 16, 52, 10).fill(["#EFF6FF", "#ECFEFF", "#ECFDF5", "#F5F3FF", "#FFF7ED"][i]).strokeColor("#DCE6F2").stroke();
    doc.font("Helvetica-Bold").fontSize(12).fillColor(palette.ink).text(title, M + 28 + i * 8, y + 13);
    doc.font("Helvetica").fontSize(9.2).fillColor(palette.muted).text(text, M + 190, y + 13, { width: 300 });
  });
  tag(doc, "SECURE", M + 65, 642, palette.blue);
  tag(doc, "SCALABLE", M + 142, 642, palette.emerald);
  tag(doc, "VERIFIABLE", M + 230, 642, palette.violet);
  tag(doc, "SUPPORT READY", M + 333, 642, palette.amber);
}

function addCommercial(doc) {
  premiumFrame(doc, "Commercial Snapshot", 10);
  body(doc, "The following numbers are realistic dummy data for a polished company profile. They are suitable for presentation storytelling and can be replaced with actual metrics later.", M, 120, 500, 11);
  stat(doc, "Illustrative active learners", "12K+", M, 200, palette.blue);
  stat(doc, "Avg. completion signal", "78%", M + 126, 200, palette.emerald);
  stat(doc, "Certificate checks", "31K", M + 252, 200, palette.violet);
  stat(doc, "Support SLA target", "24h", M + 378, 200, palette.amber);
  drawBars(doc, M, 335, ["Learning Access", "Certificate Demand", "Support Quality", "Payment Smoothness", "Referral Intent"], [0.86, 0.9, 0.8, 0.76, 0.72], [palette.blue, palette.violet, palette.emerald, palette.cyan, palette.amber]);
  sectionLabel(doc, "Growth Levers", M, 590, palette.emerald);
  bulletList(doc, [
    "Add deeper project tracks with portfolio-ready submissions.",
    "Package domain bundles for colleges, communities, and fresher cohorts.",
    "Promote certificate verification as a trust differentiator.",
  ], M, 615, 470);
}

function addRoadmap(doc) {
  premiumFrame(doc, "2026 Strategic Roadmap", 11);
  body(doc, "A practical premium roadmap connects platform polish with learner trust, content depth, and measurable outcomes.", M, 120, 500, 11);
  const quarters = [
    ["Q1", "Profile polish", "Improve brand assets, PDF templates, learner-facing trust pages."],
    ["Q2", "Program depth", "Expand projects, assessment banks, and completion rubrics."],
    ["Q3", "Partner readiness", "College/community cohorts, reporting packs, mentor workflows."],
    ["Q4", "Credential intelligence", "Verification analytics, document audit trails, advanced dashboards."],
  ];
  quarters.forEach(([q, title, text], i) => {
    const x = M + (i % 2) * 258;
    const y = 215 + Math.floor(i / 2) * 170;
    doc.roundedRect(x, y, 238, 128, 14).fill("#FFFFFF").strokeColor("#DEE7F2").stroke();
    doc.circle(x + 30, y + 31, 19).fill([palette.blue, palette.cyan, palette.emerald, palette.violet][i]);
    doc.font("Helvetica-Bold").fontSize(11).fillColor("#FFFFFF").text(q, x + 20, y + 25, { width: 20, align: "center" });
    doc.font("Helvetica-Bold").fontSize(15).fillColor(palette.ink).text(title, x + 60, y + 22);
    doc.font("Helvetica").fontSize(9.5).fillColor(palette.muted).text(text, x + 24, y + 65, { width: 190, lineGap: 3 });
  });
  tag(doc, "BUILD", M, 625, palette.blue);
  tag(doc, "MEASURE", M + 76, 625, palette.emerald);
  tag(doc, "VERIFY", M + 165, 625, palette.violet);
  tag(doc, "SCALE", M + 245, 625, palette.amber);
}

function addAppendixIntro(doc) {
  premiumFrame(doc, "Merged Document Samples", 12);
  doc.font("Helvetica-Bold").fontSize(28).fillColor(palette.ink).text("Appendix", M, 140);
  body(doc, "The following pages merge the supplied sample PDFs into this company profile package. They are included as document-style evidence and visual reference for InternovaTech certificate, offer letter, payment slip, and project-report branding materials.", M, 185, 500, 12);
  sectionLabel(doc, "Included Samples", M, 310, palette.blue);
  bulletList(doc, [
    "Certificate PDF sample",
    "Full Stack Web Development Training Program offer letter sample",
    "Full Stack Web Development Training Program payment slip sample",
    "First four pages of project report branding sample",
  ], M, 340, 470);
  doc.roundedRect(M, 565, 500, 98, 14).fill("#0B1220");
  doc.font("Helvetica-Bold").fontSize(16).fillColor("#FFFFFF").text("Single merged company profile pack", M + 28, 592);
  doc.font("Helvetica").fontSize(10.5).fillColor("#CBD5E1").text("Generated profile pages + supplied sample PDFs, ready for review, sharing, and further brand refinement.", M + 28, 620, { width: 430 });
}

async function createProfilePdf() {
  ensureOutputDir();

  await new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 0, info: {
      Title: "InternovaTech Company Profile 2026",
      Author: "InternovaTech",
      Subject: "Premium company introduction and profile",
    } });
    const stream = fs.createWriteStream(profilePath);
    doc.pipe(stream);

    [
      addCover,
      addOverview,
      addEcosystem,
      addPrograms,
      addPlatform,
      addVerification,
      addOperatingModel,
      addMarket,
      addTechnology,
      addCommercial,
      addRoadmap,
      addAppendixIntro,
    ].forEach((render, index) => {
      if (index > 0) doc.addPage();
      render(doc);
    });

    doc.end();
    stream.on("finish", resolve);
    stream.on("error", reject);
  });
}

async function mergePdfs() {
  const merged = await PDFLibDocument.create();
  for (const file of [profilePath, ...samplePdfs]) {
    if (!fs.existsSync(file)) {
      throw new Error(`Missing PDF: ${file}`);
    }
    const source = await PDFLibDocument.load(fs.readFileSync(file), { ignoreEncryption: true });
    const pages = await merged.copyPages(source, source.getPageIndices());
    pages.forEach((page) => merged.addPage(page));
  }
  const bytes = await merged.save();
  fs.writeFileSync(finalPath, bytes);
}

async function main() {
  await createProfilePdf();
  await mergePdfs();
  const finalPdf = await PDFLibDocument.load(fs.readFileSync(finalPath), { ignoreEncryption: true });
  console.log(`Created: ${finalPath}`);
  console.log(`Profile-only pages: 12`);
  console.log(`Merged total pages: ${finalPdf.getPageCount()}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
