require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const internshipRoutes = require("./routes/internshipRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const purchaseRoutes = require("./routes/purchaseRoutes");
const progressRoutes = require("./routes/progressRoutes");
const quizRoutes = require("./routes/quizRoutes");

const app = express();

connectDB();

app.use(helmet());
app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan("dev"));
app.use("/api/payments", paymentRoutes);
app.use("/api/purchases", purchaseRoutes);
app.use("/api/progress", progressRoutes);
app.use("/api/quiz", quizRoutes);

app.get("/", (req, res) => {
  res.send("API is running...");
});

app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Backend is working fine",
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/internships", internshipRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});