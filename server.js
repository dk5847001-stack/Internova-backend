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
const subscriberRoutes = require("./routes/subscriberRoutes");

const app = express();
app.disable("x-powered-by");

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

const addAllowedOrigins = (value = "") => {
  String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .forEach((origin) => {
      if (!allowedOrigins.includes(origin)) {
        allowedOrigins.push(origin);
      }
    });
};

addAllowedOrigins(process.env.CLIENT_URL);
addAllowedOrigins(process.env.FRONTEND_URL);

/* =========================
   Security Middlewares
========================= */
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    referrerPolicy: { policy: "no-referrer" },
    hsts:
      process.env.NODE_ENV === "production"
        ? {
            maxAge: 31536000,
            includeSubDomains: true,
            preload: true,
          }
        : false,
  })
);

app.use((req, res, next) => {
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  next();
});

/* =========================
   CORS
========================= */
app.use(
  cors({
    origin: (origin, callback) => {
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
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true, limit: "5mb" }));
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
    timestamp: new Date().toISOString(),
  });
});

/* =========================
   Core API Routes
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
   Contact Routes
========================= */
app.use("/api/contact", contactRoutes);
app.use("/api/contact-messages", contactRoutes);

/* =========================
   Subscriber Routes
========================= */
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
  console.error("SERVER ERROR:", err);

  if (err.message && err.message.startsWith("CORS blocked")) {
    return res.status(403).json({
      success: false,
      message: err.message,
    });
  }

  const statusCode = err.status || 500;
  const safeMessage =
    statusCode >= 500 ? "Internal server error" : err.message || "Request failed";

  return res.status(statusCode).json({
    success: false,
    message: safeMessage,
  });
});

/* =========================
   Server Start
========================= */
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log("Allowed origins:", allowedOrigins);
});
