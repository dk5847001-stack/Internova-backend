const fs = require("fs");
const path = require("path");
const PDFDocument = require("pdfkit");
const { PDFDocument: PDFLibDocument } = require("pdf-lib");

const root = path.resolve(__dirname, "..");
const outDir = path.join(root, "uploads", "branding");
const profileOnlyPath = path.join(outDir, "InternovaTech_Investor_Ready_Company_Profile_2026.pdf");
const mergedPath = path.join(outDir, "InternovaTech_Investor_Ready_Company_Profile_2026_Merged.pdf");
const mdPath = path.join(outDir, "InternovaTech_Investor_Ready_Company_Profile_2026.md");

const samplePdfs = [
  path.join("C:", "Users", "pkper", "OneDrive", "Documents", "project_report", "sample", "certificate.pdf"),
  path.join("C:", "Users", "pkper", "OneDrive", "Documents", "project_report", "sample", "Full_Stack_Web_Development_Training_Program_offer_letter (1).pdf"),
  path.join("C:", "Users", "pkper", "OneDrive", "Documents", "project_report", "sample", "Full_Stack_Web_Development_Training_Program_payment_slip (1).pdf"),
  path.join(root, "uploads", "branding", "FIRST FOUR PAGES OF PROJECT REPORT - ARDENT(UPDATE NEW 2026).single.pdf"),
];

const P = {
  ink: "#0B0F19",
  text: "#344054",
  soft: "#F6F8FB",
  line: "#D9E1EC",
  blue: "#2563EB",
  cyan: "#06B6D4",
  green: "#12B981",
  purple: "#7C3AED",
  amber: "#F59E0B",
  red: "#F43F5E",
  dark: "#101828",
};

const W = 595.28;
const H = 841.89;
const M = 44;

const company = {
  name: "InternovaTech",
  founder: "Amar Kumar",
  hr: "Shivi Jha",
  email: "internova.support@gmail.com",
  address: "Plot No. D-24, Sector 3, Block D, Sector 12, Noida, Uttar Pradesh 201301",
  website: "www.internovatech.in",
};

const assets = {
  brandLogo: path.join(root, "uploads", "branding", "brand logo.png"),
  heroLogo: path.join(root, "uploads", "branding", "logo.png"),
  companyFront: path.join(root, "uploads", "branding", "company-front-image.png"),
  seal: path.join(root, "uploads", "branding", "compony_logo.png"),
  building: path.join(root, "uploads", "branding", "internovaTech-building.png"),
  internship: path.join(root, "uploads", "branding", "internship.png"),
  intern: path.join(root, "uploads", "branding", "interner-image.png"),
  footer: path.join(root, "uploads", "branding", "footer.png"),
};

function ensureDir() {
  fs.mkdirSync(outDir, { recursive: true });
}

function frame(doc, title, page) {
  doc.save();
  doc.rect(0, 0, W, H).fill("#FFFFFF");
  doc.roundedRect(24, 24, W - 48, H - 48, 18).strokeColor(P.line).lineWidth(0.9).stroke();
  doc.roundedRect(32, 32, W - 64, H - 64, 12).strokeColor("#EEF2F7").lineWidth(0.6).stroke();
  doc.font("Helvetica-Bold").fontSize(8).fillColor("#667085").text("INTERNOVATECH / INVESTOR PROFILE 2026", M, 32);
  if (fs.existsSync(assets.brandLogo)) doc.image(assets.brandLogo, W - M - 50, 27, { fit: [18, 18] });
  doc.font("Helvetica").fontSize(8).fillColor("#98A2B3").text(String(page).padStart(2, "0"), W - M - 24, 32, { width: 24, align: "right" });
  if (title) doc.font("Helvetica-Bold").fontSize(22).fillColor(P.ink).text(title, M, 74, { width: W - M * 2 });
  doc.restore();
}

function imageBox(doc, file, x, y, w, h, opacity = 1) {
  if (!fs.existsSync(file)) return false;
  doc.save();
  doc.roundedRect(x, y, w, h, 16).clip();
  doc.opacity(opacity).image(file, x, y, { fit: [w, h], align: "center", valign: "center" });
  doc.opacity(1);
  doc.restore();
  return true;
}

function imagePlain(doc, file, x, y, w, h) {
  if (!fs.existsSync(file)) return false;
  doc.image(file, x, y, { fit: [w, h], align: "center", valign: "center" });
  return true;
}

function techGrid(doc, x, y, w, h) {
  doc.save();
  doc.opacity(0.16).strokeColor("#60A5FA").lineWidth(0.35);
  for (let i = x; i <= x + w; i += 22) doc.moveTo(i, y).lineTo(i, y + h).stroke();
  for (let j = y; j <= y + h; j += 22) doc.moveTo(x, j).lineTo(x + w, j).stroke();
  doc.opacity(1);
  doc.restore();
}

function text(doc, value, x, y, width, size = 10.5, color = P.text) {
  doc.font("Helvetica").fontSize(size).fillColor(color).text(value, x, y, { width, lineGap: 4.5 });
}

function label(doc, value, x, y, color = P.blue) {
  doc.font("Helvetica-Bold").fontSize(8.4).fillColor(color).text(value.toUpperCase(), x, y, { characterSpacing: 0.7 });
}

function chip(doc, value, x, y, color) {
  const w = doc.font("Helvetica-Bold").fontSize(8.5).widthOfString(value) + 18;
  doc.roundedRect(x, y, w, 24, 12).fill(color);
  doc.fillColor("#FFFFFF").text(value, x + 9, y + 7);
  return w;
}

function metric(doc, value, labelText, x, y, color) {
  doc.roundedRect(x, y, 112, 78, 12).fill("#FFFFFF").strokeColor("#E4EAF2").stroke();
  doc.font("Helvetica-Bold").fontSize(21).fillColor(color).text(value, x + 14, y + 17, { width: 88 });
  doc.font("Helvetica").fontSize(8.6).fillColor("#667085").text(labelText, x + 14, y + 47, { width: 84, lineGap: 2 });
}

function bullet(doc, items, x, y, width, gap = 33) {
  let cy = y;
  items.forEach((item) => {
    doc.circle(x + 4, cy + 5, 2.3).fill(P.blue);
    text(doc, item, x + 16, cy, width, 9.7);
    cy += gap;
  });
}

function hRule(doc, y) {
  doc.moveTo(M, y).lineTo(W - M, y).strokeColor("#E4EAF2").lineWidth(0.8).stroke();
}

function bar(doc, labelText, value, x, y, color) {
  doc.font("Helvetica-Bold").fontSize(9).fillColor(P.ink).text(labelText, x, y, { width: 150 });
  doc.roundedRect(x + 160, y + 2, 250, 10, 5).fill("#EDF2F7");
  doc.roundedRect(x + 160, y + 2, 250 * value, 10, 5).fill(color);
  doc.font("Helvetica-Bold").fontSize(9).fillColor(color).text(`${Math.round(value * 100)}%`, x + 425, y - 1);
}

function card(doc, title, body, x, y, w, h, color = P.blue) {
  doc.roundedRect(x, y, w, h, 12).fill("#FFFFFF").strokeColor("#E2E8F0").stroke();
  doc.rect(x, y, 7, h).fill(color);
  doc.font("Helvetica-Bold").fontSize(12.4).fillColor(P.ink).text(title, x + 20, y + 18, { width: w - 36 });
  text(doc, body, x + 20, y + 42, w - 38, 9.2);
}

function cover(doc) {
  frame(doc, "", 1);
  imageBox(doc, assets.companyFront, 32, 32, W - 64, 318);
  doc.roundedRect(32, 32, W - 64, 318, 16).fillOpacity(0.62).fill("#020617").fillOpacity(1);
  techGrid(doc, 32, 32, W - 64, 318);
  imagePlain(doc, assets.brandLogo, M, 58, 54, 54);
  doc.font("Helvetica-Bold").fontSize(11).fillColor("#A7F3D0").text("SAAS / CAREER INFRASTRUCTURE / INDIA", M, 124);
  doc.font("Helvetica-Bold").fontSize(35).fillColor("#FFFFFF").text(company.name, M, 158, { width: 390 });
  doc.font("Helvetica").fontSize(13).fillColor("#D0D5DD").text("Investor-ready company profile for a modern internship, credentialing, and learner-success platform.", M, 205, { width: 430 });
  doc.font("Helvetica-Bold").fontSize(28).fillColor("#FFFFFF").text("Turning online internships into verifiable career outcomes.", M, 258, { width: 465, lineGap: 2 });
  chip(doc, "B2C LEARNER PLANS", M, 378, P.blue);
  chip(doc, "B2B SAAS", M + 128, 378, P.purple);
  chip(doc, "CERTIFICATE VERIFICATION", M + 215, 378, P.green);
  text(doc, "InternovaTech builds career infrastructure for students and early professionals: structured programs, progress tracking, practical assessments, payment workflows, and verified digital credentials in one platform.", M, 432, 500, 11.4);
  metric(doc, "Live", "Public web platform and operational backend", M, 552, P.blue);
  metric(doc, "INR 499+", "Entry pricing for high-volume learner access", M + 126, 552, P.green);
  metric(doc, "B2B", "College and cohort SaaS expansion path", M + 252, 552, P.purple);
  metric(doc, "Noida", "Operating base in Uttar Pradesh, India", M + 378, 552, P.amber);
  imagePlain(doc, assets.footer, M, 688, 500, 58);
  text(doc, `${company.email}  /  ${company.website}`, M, 760, 500, 9, "#667085");
  return;
  doc.rect(32, 32, W - 64, 250).fill(P.dark);
  doc.font("Helvetica-Bold").fontSize(11).fillColor("#A7F3D0").text("SAAS / CAREER INFRASTRUCTURE / INDIA", M, 62);
  doc.font("Helvetica-Bold").fontSize(34).fillColor("#FFFFFF").text(company.name, M, 104, { width: 360 });
  doc.font("Helvetica").fontSize(13).fillColor("#D0D5DD").text("Investor-ready company profile for a modern internship, credentialing, and learner-success platform.", M, 150, { width: 450 });
  doc.font("Helvetica-Bold").fontSize(30).fillColor("#FFFFFF").text("Turning online internships into verifiable career outcomes.", M, 208, { width: 470, lineGap: 2 });
  chip(doc, "B2C LEARNER PLANS", M, 315, P.blue);
  chip(doc, "B2B SAAS", M + 128, 315, P.purple);
  chip(doc, "CERTIFICATE VERIFICATION", M + 215, 315, P.green);
  text(doc, "InternovaTech builds career infrastructure for students and early professionals: structured programs, progress tracking, practical assessments, payment workflows, and verified digital credentials in one platform.", M, 382, 500, 12);
  metric(doc, "Live", "Public web platform and operational backend", M, 520, P.blue);
  metric(doc, "INR 499+", "Entry pricing for high-volume learner access", M + 126, 520, P.green);
  metric(doc, "B2B", "College and cohort SaaS expansion path", M + 252, 520, P.purple);
  metric(doc, "Noida", "Operating base in Uttar Pradesh, India", M + 378, 520, P.amber);
  text(doc, `${company.email}  /  ${company.website}`, M, 735, 500, 9, "#667085");
}

function thesis(doc) {
  frame(doc, "Investment Thesis", 2);
  label(doc, "Why InternovaTech Exists", M, 125);
  text(doc, "Millions of students complete online courses, but employers still struggle to verify readiness. InternovaTech focuses on the missing layer: internship-style learning with measurable progress, practical validation, and certificate authenticity.", M, 148, 500, 11.4);
  card(doc, "The Problem", "Learners buy scattered courses, finish without structure, and receive static PDFs that are hard to verify.", M, 260, 238, 112, P.red);
  card(doc, "The Product", "A unified internship SaaS workflow: enroll, learn, submit, assess, certify, verify.", M + 262, 260, 238, 112, P.blue);
  card(doc, "The Market Timing", "India's student and fresher market is moving toward affordable, outcomes-led, digital-first career programs.", M, 400, 238, 112, P.green);
  card(doc, "The Business", "B2C plans drive cash flow. B2B SaaS plans create institutional scale, recurring revenue, and lower acquisition cost.", M + 262, 400, 238, 112, P.purple);
  label(doc, "Positioning", M, 570, P.green);
  text(doc, "InternovaTech is not a course marketplace. It is a career operating system for internship programs, credential generation, and learner verification.", M, 595, 500, 12);
}

function team(doc) {
  frame(doc, "Founder & Team", 3);
  text(doc, "A lean operating team with clear accountability across product, learner support, hiring operations, and partner growth.", M, 120, 500, 11);
  card(doc, "Amar Kumar / Founder & CEO", "Company vision, product direction, partnerships, fundraising, revenue model, and platform strategy.", M, 190, 500, 82, P.blue);
  card(doc, "Shivi Jha / HR & People Operations", "Hiring coordination, learner communication workflows, onboarding standards, intern operations, and team culture.", M, 292, 500, 82, P.purple);
  card(doc, "Product & Engineering / Platform Team", "Learner dashboard, auth, payments, progress tracking, assessments, certificate generation, and verification systems.", M, 394, 238, 112, P.green);
  card(doc, "Learner Success / Support Team", "Support inbox, program access, certificate queries, payment assistance, and student lifecycle communication.", M + 262, 394, 238, 112, P.amber);
  label(doc, "Operating Address", M, 560);
  text(doc, company.address, M, 585, 500, 11);
  label(doc, "Contact", M, 650, P.green);
  text(doc, company.email, M, 675, 500, 11);
}

function businessModel(doc) {
  frame(doc, "Business Model", 4);
  text(doc, "InternovaTech can compound revenue through two connected loops: direct learner plans for speed, and institutional SaaS for scale.", M, 120, 500, 11);
  card(doc, "B2C Learner Revenue", "Students and freshers pay for internship-style programs, certificate eligibility, assessment access, project guidance, and premium support.", M, 190, 500, 86, P.blue);
  card(doc, "B2B SaaS Revenue", "Colleges, student communities, bootcamps, and training partners license cohort dashboards, verification tools, program reporting, and branded credential workflows.", M, 300, 500, 98, P.purple);
  card(doc, "Credential Infrastructure", "Certificate verification and document automation become trust products that increase retention and partner value.", M, 422, 238, 108, P.green);
  card(doc, "Expansion Revenue", "Add-ons: premium certificates, project reviews, placement readiness, AI mentor, analytics, and white-label cohorts.", M + 262, 422, 238, 108, P.amber);
  label(doc, "Revenue Logic", M, 590);
  bullet(doc, [
    "Low entry price captures student demand.",
    "Higher tiers increase ARPU through support, projects, and certification depth.",
    "B2B SaaS converts repeated student demand into recurring institutional contracts.",
  ], M, 615, 470);
}

function pricing(doc) {
  frame(doc, "Pricing Strategy", 5);
  text(doc, "Pricing is designed for Indian student affordability while leaving room for premium outcomes and B2B recurring contracts.", M, 120, 500, 11);
  const tiers = [
    ["Starter", "INR 499", "Program access, basic modules, progress view", P.blue],
    ["Core", "INR 999", "Guided learning, assessments, certificate eligibility", P.green],
    ["Pro", "INR 1,999", "Projects, priority support, verification-ready certificate", P.purple],
    ["Career+", "INR 2,999", "Portfolio tasks, reviews, advanced certificate pack", P.amber],
    ["Premium", "INR 4,999", "Mentor support, premium documentation, career readiness", P.red],
  ];
  tiers.forEach(([name, price, copy, color], i) => {
    const y = 195 + i * 86;
    doc.roundedRect(M, y, 500, 62, 12).fill("#FFFFFF").strokeColor("#E2E8F0").stroke();
    doc.rect(M, y, 7, 62).fill(color);
    doc.font("Helvetica-Bold").fontSize(13).fillColor(P.ink).text(name, M + 22, y + 14, { width: 100 });
    doc.font("Helvetica-Bold").fontSize(18).fillColor(color).text(price, M + 150, y + 12, { width: 100 });
    text(doc, copy, M + 270, y + 15, 220, 9.4);
  });
  label(doc, "B2B SaaS", M, 650, P.purple);
  text(doc, "Institution pricing can be packaged as per-cohort or annual SaaS contracts: branded dashboard, cohort analytics, bulk certificates, verification portal, and admin controls.", M, 675, 500, 10.6);
}

function traction(doc) {
  frame(doc, "Traction & KPI Model", 6);
  text(doc, "Use this page as the investor data-room snapshot. Replace model values with verified payment, analytics, CRM, and certificate records before formal fundraising.", M, 120, 500, 10.8);
  metric(doc, "Live", "Website and backend product stack", M, 200, P.blue);
  metric(doc, "5", "Commercial pricing tiers", M + 126, 200, P.green);
  metric(doc, "6+", "Program categories", M + 252, 200, P.purple);
  metric(doc, "B2B", "Institution SaaS expansion motion", M + 378, 200, P.amber);
  label(doc, "12-Month Operating Targets", M, 335);
  bar(doc, "Registered learners", 0.82, M, 375, P.blue);
  bar(doc, "Paid conversion", 0.35, M, 420, P.green);
  bar(doc, "Monthly revenue run-rate", 0.58, M, 465, P.purple);
  bar(doc, "Certificate verification usage", 0.72, M, 510, P.amber);
  bar(doc, "B2B pilot pipeline", 0.45, M, 555, P.cyan);
  label(doc, "Metrics To Track", M, 650, P.green);
  text(doc, "Users, paid learners, ARPU, conversion rate, refund rate, completion rate, certificate verification count, support response time, cohort NPS, MRR, and CAC payback.", M, 675, 500, 10.5);
}

function competition(doc) {
  frame(doc, "Competitive Positioning", 7);
  text(doc, "InternovaTech should win by focusing on the layer between courses and employment: structured internship workflows plus verifiable outcomes.", M, 120, 500, 11);
  const rows = [
    ["Internshala", "Strong internship marketplace", "InternovaTech owns training + credential workflow"],
    ["Coursera", "Global course catalog and university content", "InternovaTech focuses on affordable applied internships"],
    ["Udemy", "Massive self-paced course marketplace", "InternovaTech adds guided progress and verification"],
    ["InternovaTech", "Internship SaaS + learner success + credential trust", "Focused, affordable, India-first, verification-led"],
  ];
  rows.forEach(([name, them, us], i) => {
    const y = 205 + i * 102;
    doc.roundedRect(M, y, 500, 76, 12).fill(i === 3 ? "#F0FDF4" : "#FFFFFF").strokeColor("#E2E8F0").stroke();
    doc.font("Helvetica-Bold").fontSize(13).fillColor(i === 3 ? P.green : P.ink).text(name, M + 18, y + 15, { width: 105 });
    text(doc, them, M + 145, y + 14, 150, 9.2);
    text(doc, us, M + 320, y + 14, 165, 9.2);
  });
  label(doc, "Strategic Wedge", M, 650, P.blue);
  text(doc, "Start with affordable learner plans, build trust through certificates, then scale into institutional SaaS where colleges need cohort visibility and verified outcomes.", M, 675, 500, 10.7);
}

function product(doc) {
  frame(doc, "Product Experience", 8);
  text(doc, "The product should communicate clarity: every learner knows what to do next, every institution knows who is progressing, and every certificate can be verified.", M, 120, 500, 11);
  imageBox(doc, assets.internship, M, 180, 500, 245);
  doc.roundedRect(M, 180, 500, 245, 16).fillOpacity(0.34).fill("#020617").fillOpacity(1);
  techGrid(doc, M, 180, 500, 245);
  doc.font("Helvetica-Bold").fontSize(15).fillColor("#FFFFFF").text("Learner Dashboard", M + 28, 210);
  text(doc, "Program timeline, module completion, assessment readiness, certificate eligibility, payment state, and support access.", M + 28, 236, 430, 9.8, "#D0D5DD");
  metric(doc, "82%", "Program progress", M + 32, 302, P.blue);
  metric(doc, "Ready", "Assessment status", M + 158, 302, P.green);
  metric(doc, "Valid", "Certificate state", M + 284, 302, P.purple);
  label(doc, "Screenshot Descriptions", M, 485);
  bullet(doc, [
    "Dashboard: left navigation, current internship card, progress bar, task checklist, and next action.",
    "Verification: certificate ID search, candidate details, issue date, status, and QR validation.",
    "Admin: cohort list, paid learners, completion rate, support tickets, and certificate export.",
  ], M, 510, 470);
  return;
  doc.roundedRect(M, 190, 500, 270, 18).fill(P.dark);
  doc.font("Helvetica-Bold").fontSize(15).fillColor("#FFFFFF").text("Learner Dashboard", M + 28, 220);
  text(doc, "Program timeline, module completion, assessment readiness, certificate eligibility, payment state, and support access.", M + 28, 246, 430, 9.8, "#D0D5DD");
  metric(doc, "82%", "Program progress", M + 32, 310, P.blue);
  metric(doc, "Ready", "Assessment status", M + 158, 310, P.green);
  metric(doc, "Valid", "Certificate state", M + 284, 310, P.purple);
  label(doc, "Screenshot Descriptions", M, 520);
  bullet(doc, [
    "Dashboard: left navigation, current internship card, progress bar, task checklist, and next action.",
    "Verification: certificate ID search, candidate details, issue date, status, and QR validation.",
    "Admin: cohort list, paid learners, completion rate, support tickets, and certificate export.",
  ], M, 545, 470);
}

function journey(doc) {
  frame(doc, "Student Journey", 9);
  text(doc, "A student journey must feel simple, measurable, and credible from first click to verified certificate.", M, 120, 500, 11);
  const steps = [
    ["Discover", "Student selects a role-focused program and reviews outcomes."],
    ["Enroll", "Payment unlocks dashboard access and program modules."],
    ["Build", "Learner completes tasks, assessments, and project checkpoints."],
    ["Certify", "System issues a certificate after completion criteria are met."],
    ["Verify", "Employer or institution verifies the certificate using ID or QR."],
  ];
  steps.forEach(([t, b], i) => {
    const x = M + (i % 2) * 258;
    const y = 195 + Math.floor(i / 2) * 135;
    card(doc, `${i + 1}. ${t}`, b, x, y, i === 4 ? 500 : 238, 92, [P.blue, P.green, P.purple, P.amber, P.cyan][i]);
  });
  label(doc, "Use Cases", M, 620, P.green);
  text(doc, "Students use InternovaTech for practical skill-building. Colleges use it for cohort training. Training partners use it for branded credential workflows. Employers use verification to reduce certificate ambiguity.", M, 645, 500, 10.7);
}

function roadmap(doc) {
  frame(doc, "AI & Automation Roadmap", 10);
  text(doc, "The 2026 roadmap should move InternovaTech from a training platform to an intelligent career infrastructure company.", M, 120, 500, 11);
  imageBox(doc, assets.heroLogo, M, 162, 500, 82);
  doc.roundedRect(M, 162, 500, 82, 16).fillOpacity(0.42).fill("#020617").fillOpacity(1);
  techGrid(doc, M, 162, 500, 82);
  card(doc, "AI Mentor", "Personalized module suggestions, doubt prompts, completion nudges, and readiness scoring.", M, 190, 238, 100, P.blue);
  card(doc, "Automated Review", "Rubric-based project checks, plagiarism signals, and completion confidence scoring.", M + 262, 190, 238, 100, P.green);
  card(doc, "Cohort Intelligence", "Institution dashboards with progress risk, completion forecast, and certificate activity.", M, 320, 238, 100, P.purple);
  card(doc, "Credential Graph", "Verified learner records, certificate status, skill tags, and exportable achievement profiles.", M + 262, 320, 238, 100, P.amber);
  card(doc, "B2B Admin Suite", "White-label cohorts, bulk enrollments, payment reconciliation, support analytics, and document automation.", M, 450, 500, 94, P.cyan);
  label(doc, "Automation Goal", M, 615);
  text(doc, "Reduce manual support load while increasing completion rate, certificate trust, and partner reporting quality.", M, 640, 500, 11);
}

function pitchSummary(doc) {
  frame(doc, "Pitch Deck Summary", 11);
  const slides = [
    ["1", "Vision", "Career infrastructure for verifiable online internships."],
    ["2", "Problem", "Courses lack structure, proof, and employer-grade verification."],
    ["3", "Solution", "Internship SaaS: learn, assess, certify, verify."],
    ["4", "Market", "India-first student and fresher upskilling demand."],
    ["5", "Product", "Learner dashboard, certificate verification, admin cohorts."],
    ["6", "Business Model", "B2C pricing plus B2B SaaS contracts."],
    ["7", "Traction", "Live product, pricing stack, program categories, KPI model."],
    ["8", "Competition", "Focused credential workflow vs broad marketplaces."],
    ["9", "Roadmap", "AI mentor, automated review, cohort intelligence."],
    ["10", "Ask", "Capital and partnerships to scale acquisition and product depth."],
  ];
  slides.forEach(([n, t, b], i) => {
    const x = M + (i % 2) * 258;
    const y = 125 + Math.floor(i / 2) * 115;
    doc.roundedRect(x, y, 238, 78, 11).fill("#FFFFFF").strokeColor("#E2E8F0").stroke();
    doc.circle(x + 24, y + 24, 14).fill([P.blue, P.green, P.purple, P.amber, P.cyan][i % 5]);
    doc.font("Helvetica-Bold").fontSize(9).fillColor("#FFFFFF").text(n, x + 18, y + 19, { width: 12, align: "center" });
    doc.font("Helvetica-Bold").fontSize(12).fillColor(P.ink).text(t, x + 48, y + 15, { width: 160 });
    text(doc, b, x + 48, y + 36, 170, 8.7);
  });
}

function brandSystem(doc) {
  frame(doc, "Brand System & Visual Proof", 12);
  text(doc, "Investor documents convert better when the brand feels operational, not conceptual. This page uses InternovaTech's supplied visual assets as trust signals across office presence, learning environment, and credential identity.", M, 120, 500, 10.7);
  imageBox(doc, assets.building, M, 178, 238, 150);
  imageBox(doc, assets.intern, M + 262, 178, 238, 150);
  imageBox(doc, assets.companyFront, M, 348, 238, 150);
  doc.roundedRect(M + 262, 348, 238, 150, 16).fill("#F8FAFC").strokeColor("#E2E8F0").stroke();
  imagePlain(doc, assets.seal, M + 306, 364, 150, 118);
  label(doc, "Design Direction", M, 540, P.blue);
  bullet(doc, [
    "Minimal white pages with dark futuristic hero panels and blue-cyan signal colors.",
    "Actual brand photography used for operational credibility and investor confidence.",
    "Logo, seal, footer, and program visuals integrated as a coherent SaaS identity system.",
  ], M, 565, 470);
  imagePlain(doc, assets.footer, M, 708, 500, 58);
}

function appendix(doc) {
  frame(doc, "Appendix: Supplied Document Samples", 13);
  text(doc, "The following pages append the supplied certificate, offer letter, payment slip, and project-report sample PDFs into a single investor-ready company pack.", M, 150, 500, 12);
  bullet(doc, [
    "Certificate sample",
    "Full Stack Web Development Training Program offer letter sample",
    "Full Stack Web Development Training Program payment slip sample",
    "Project report branding sample",
  ], M, 260, 470, 38);
  imagePlain(doc, assets.footer, M, 410, 500, 58);
  doc.roundedRect(M, 520, 500, 110, 16).fill(P.dark);
  doc.font("Helvetica-Bold").fontSize(17).fillColor("#FFFFFF").text("Ready for investor review, partner outreach, and brand refinement.", M + 28, 552, { width: 420 });
  text(doc, `${company.name} / ${company.email} / ${company.address}`, M + 28, 598, 420, 9.2, "#D0D5DD");
}

const profileMarkdown = `# InternovaTech Investor-Ready Company Profile 2026

## Positioning
InternovaTech is a career infrastructure SaaS company for online internship programs, learner progress, practical assessments, document automation, and certificate verification.

## Founder & Team
- Amar Kumar, Founder & CEO: vision, product, partnerships, fundraising, and revenue strategy.
- Shivi Jha, HR & People Operations: hiring, learner communication, onboarding, intern operations, and culture.
- Product & Engineering: dashboard, auth, payments, progress, quizzes, certificates, and verification.
- Learner Success: support, program access, certificate queries, and payment assistance.

## Business Model
InternovaTech monetizes through B2C learner plans and B2B SaaS contracts. B2C creates fast cash flow through affordable program pricing. B2B creates recurring revenue through cohort dashboards, branded certificates, institutional analytics, bulk enrollment, and verification infrastructure.

## Pricing Strategy
- Starter: INR 499
- Core: INR 999
- Pro: INR 1,999
- Career+: INR 2,999
- Premium: INR 4,999

## Traction & KPI Model
Verified metrics should be pulled from payment, analytics, CRM, and certificate records before formal fundraising. Track users, paid learners, ARPU, paid conversion, completion rate, certificate verification count, MRR, refund rate, support response time, cohort NPS, and CAC payback.

## Competitive Positioning
Internshala is strong in internship discovery. Coursera is strong in global university content. Udemy is strong in self-paced course variety. InternovaTech should own the applied internship workflow: guided progress, assessments, certificates, and verification.

## Product Screenshots To Include
- Learner dashboard: current program, progress bar, module checklist, next action, certificate eligibility.
- Verification screen: certificate ID lookup, candidate details, issue date, status, and QR validation.
- Admin dashboard: cohorts, paid learners, completion rate, support tickets, and certificate export.

## Student Journey
Discover a role-focused program. Enroll through payment. Complete modules and project tasks. Pass assessments. Receive a verified certificate. Share the certificate with institutions or employers for validation.

## AI & Automation Roadmap
AI mentor, automated project review, plagiarism signals, readiness scoring, cohort intelligence, support automation, credential graph, and white-label B2B admin suite.

## Pitch Deck Summary
1. Vision: career infrastructure for verifiable online internships.
2. Problem: courses lack structure, proof, and employer-grade verification.
3. Solution: internship SaaS: learn, assess, certify, verify.
4. Market: India-first student and fresher upskilling demand.
5. Product: learner dashboard, verification, admin cohorts.
6. Business model: B2C pricing plus B2B SaaS contracts.
7. Traction: live product, pricing stack, program categories, KPI model.
8. Competition: focused credential workflow vs broad marketplaces.
9. Roadmap: AI mentor, automated review, cohort intelligence.
10. Ask: capital and partnerships to scale acquisition and product depth.

## Contact
Email: ${company.email}

Address: ${company.address}
`;

async function createPdf() {
  ensureDir();
  fs.writeFileSync(mdPath, profileMarkdown, "utf8");

  await new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margin: 0,
      info: {
        Title: "InternovaTech Investor-Ready Company Profile 2026",
        Author: company.name,
        Subject: "SaaS startup company profile and pitch summary",
      },
    });
    const stream = fs.createWriteStream(profileOnlyPath);
    doc.pipe(stream);
    [cover, thesis, team, businessModel, pricing, traction, competition, product, journey, roadmap, pitchSummary, brandSystem, appendix].forEach((page, index) => {
      if (index > 0) doc.addPage();
      page(doc);
    });
    doc.end();
    stream.on("finish", resolve);
    stream.on("error", reject);
  });
}

async function mergePdfs() {
  const merged = await PDFLibDocument.create();
  for (const file of [profileOnlyPath, ...samplePdfs]) {
    if (!fs.existsSync(file)) throw new Error(`Missing PDF: ${file}`);
    const source = await PDFLibDocument.load(fs.readFileSync(file), { ignoreEncryption: true });
    const pages = await merged.copyPages(source, source.getPageIndices());
    pages.forEach((page) => merged.addPage(page));
  }
  fs.writeFileSync(mergedPath, await merged.save());
  const finalDoc = await PDFLibDocument.load(fs.readFileSync(mergedPath), { ignoreEncryption: true });
  console.log(`Created profile: ${profileOnlyPath}`);
  console.log(`Created merged: ${mergedPath}`);
  console.log(`Created markdown: ${mdPath}`);
  console.log(`Profile pages: 13`);
  console.log(`Merged pages: ${finalDoc.getPageCount()}`);
}

createPdf()
  .then(mergePdfs)
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
