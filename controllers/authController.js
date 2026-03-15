const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const normalizeEmail = (email = "") => {
  return typeof email === "string" ? email.trim().toLowerCase() : "";
};

const generateToken = (user) => {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is missing");
  }

  return jwt.sign(
    {
      id: user._id,
      role: user.role,
      email: user.email,
    },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
};

const buildSafeUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  isActive:
    typeof user.isActive === "boolean" ? user.isActive : true,
  lastLoginAt: user.lastLoginAt || null,
  createdAt: user.createdAt || null,
});

// ================= REGISTER =================
exports.registerUser = async (req, res) => {
  try {
    const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
    const email = normalizeEmail(req.body?.email);
    const password =
      typeof req.body?.password === "string" ? req.body.password : "";

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters long",
      });
    }

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User already exists with this email",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      isActive: true,
    });

    return res.status(201).json({
      success: true,
      message: "User registered successfully",
      user: buildSafeUser(user),
      token: generateToken(user),
    });
  } catch (error) {
    console.error("REGISTER ERROR:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Server error during registration",
    });
  }
};

// ================= LOGIN =================
exports.loginUser = async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const password =
      typeof req.body?.password === "string" ? req.body.password : "";

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    if (typeof user.isActive === "boolean" && !user.isActive) {
      return res.status(403).json({
        success: false,
        message: "Your account is inactive. Please contact admin.",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    user.lastLoginAt = new Date();
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Login successful",
      user: buildSafeUser(user),
      token: generateToken(user),
    });
  } catch (error) {
    console.error("LOGIN ERROR:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Server error during login",
    });
  }
};

// ================= PROFILE =================
exports.getMyProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      user: buildSafeUser(user),
    });
  } catch (error) {
    console.error("PROFILE ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch profile",
    });
  }
};