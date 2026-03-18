require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const path = require("path");
const connectDB = require("./config/db");

const authRoutes = require("./routes/authRoutes");
const internshipRoutes = require("./routes/internshipRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const purchaseRoutes = require("./routes/purchaseRoutes");
const progressRoutes = require("./routes/progressRoutes");
const quizRoutes = require("./routes/quizRoutes");
const certificateRoutes = require("./routes/certificateRoutes");
const adminRoutes = require("./routes/adminRoutes");

const contactRoutes = require("./routes/contactRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const subscriberRoutes = require("./routes/subscriberRoutes");

const app = express();

/* =========================
   Database
========================= */
connectDB();

/* =========================
   Trust Proxy
========================= */
app.set("trust proxy", 1);

/* =========================
   Allowed Frontend Origins
========================= */
const allowedOrigins = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "https://internova-frontend.onrender.com",
  "https://www.internovatech.in",
  "https://internovatech.in",
];

if (process.env.CLIENT_URL && !allowedOrigins.includes(process.env.CLIENT_URL)) {
  allowedOrigins.push(process.env.CLIENT_URL);
}

if (
  process.env.FRONTEND_URL &&
  !allowedOrigins.includes(process.env.FRONTEND_URL)
) {
  allowedOrigins.push(process.env.FRONTEND_URL);
}

/* =========================
   Security Middlewares
========================= */
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

/* =========================
   CORS
========================= */
app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
  })
);

/* =========================
   Body Parsers
========================= */
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

/* =========================
   Logger
========================= */
app.use(morgan("dev"));

/* =========================
   Static Files
========================= */
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

/* =========================
   Root / Health
========================= */
app.get("/", (req, res) => {
  res.status(200).send("API is running...");
});

app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Backend is working fine",
    allowedOrigins,
    environment: process.env.NODE_ENV || "development",
  });
});

/* =========================
   API Routes
========================= */
app.use("/api/auth", authRoutes);
app.use("/api/internships", internshipRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/purchases", purchaseRoutes);
app.use("/api/progress", progressRoutes);
app.use("/api/quiz", quizRoutes);
app.use("/api/certificates", certificateRoutes);
app.use("/api/admin", adminRoutes);

/* =========================
   Contact / Notification / Subscribers
========================= */

/*
  Contact form frontend currently calls:
  POST /api/contact-messages
*/
app.use("/api/contact-messages", contactRoutes);

/*
  Optional legacy alias support
*/
app.use("/api/contact", contactRoutes);

/*
  Navbar frontend currently calls:
  GET /api/auth/notifications
  PATCH /api/auth/notifications/read-all
*/
app.use("/api/auth", notificationRoutes);

/*
  Optional direct notification alias support
*/
app.use("/api/notifications", notificationRoutes);

/*
  Footer frontend currently calls:
  POST /api/subscribers/subscribe
*/
app.use("/api/subscribers", subscriberRoutes);

/* =========================
   404 Handler
========================= */
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
    path: req.originalUrl,
  });
});

/* =========================
   Global Error Handler
========================= */
app.use((err, req, res, next) => {
  console.error("❌ Server Error:", err);

  if (err.message && err.message.startsWith("CORS blocked")) {
    return res.status(403).json({
      success: false,
      message: err.message,
    });
  }

  return res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal server error",
  });
});

/* =========================
   Server Start
========================= */
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log("✅ Allowed origins:", allowedOrigins);
});