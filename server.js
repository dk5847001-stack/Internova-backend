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

const app = express();

connectDB();

/* =========================
   Allowed Frontend Origins
========================= */
const allowedOrigins = [
  "http://localhost:3000",
  "https://internova-frontend.onrender.com",
];

if (process.env.CLIENT_URL && !allowedOrigins.includes(process.env.CLIENT_URL)) {
  allowedOrigins.push(process.env.CLIENT_URL);
}

/* =========================
   Middlewares
========================= */
app.use(helmet());

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

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan("dev"));

/* =========================
   Static Files
========================= */
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

/* =========================
   Health / Root
========================= */
app.get("/", (req, res) => {
  res.send("API is running...");
});

app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Backend is working fine",
    allowedOrigins,
  });
});

/* =========================
   Routes
========================= */
app.use("/api/auth", authRoutes);
app.use("/api/internships", internshipRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/purchases", purchaseRoutes);
app.use("/api/progress", progressRoutes);
app.use("/api/quiz", quizRoutes);
app.use("/api/certificates", certificateRoutes);

/* =========================
   404 Handler
========================= */
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

/* =========================
   Global Error Handler
========================= */
app.use((err, req, res, next) => {
  console.error("❌ Server Error:", err.message);

  if (err.message && err.message.startsWith("CORS blocked")) {
    return res.status(403).json({
      success: false,
      message: err.message,
    });
  }

  res.status(500).json({
    success: false,
    message: "Internal server error",
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