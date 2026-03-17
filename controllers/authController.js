const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const admin = require("../config/firebaseAdmin");
const sendEmail = require("../utils/sendEmail");
const { generateOtp, getOtpExpiryTime } = require("../utils/authOtp");


const normalizeEmail = (email = "") => {
  return typeof email === "string" ? email.trim().toLowerCase() : "";
};

const normalizeName = (name = "") => {
  return typeof name === "string" ? name.trim() : "";
};

const normalizePhone = (phone = "") => {
  if (typeof phone !== "string") return "";
  return phone.replace(/\s+/g, "").trim();
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
  phone: user.phone || "",
  role: user.role,
  authProvider: user.authProvider || "local",
  googleId: user.googleId || "",
  avatar: user.avatar || "",
  isEmailVerified: Boolean(user.isEmailVerified),
  isActive: typeof user.isActive === "boolean" ? user.isActive : true,
  lastLoginAt: user.lastLoginAt || null,
  createdAt: user.createdAt || null,
});

const createOtpHash = (otp) => {
  return crypto.createHash("sha256").update(String(otp)).digest("hex");
};

const sendVerificationOtpEmail = async ({ email, name, otp }) => {
  const subject = "Internova Email Verification OTP";
  const html = `
    <div style="font-family: Arial, sans-serif; background: #f8fafc; padding: 24px;">
      <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 18px; overflow: hidden; border: 1px solid #e2e8f0;">
        <div style="padding: 24px 28px; background: linear-gradient(135deg, #0b1736 0%, #142850 45%, #1d4ed8 100%); color: #ffffff;">
          <h2 style="margin: 0; font-size: 24px;">Internova</h2>
          <p style="margin: 8px 0 0; opacity: 0.9;">Email Verification</p>
        </div>

        <div style="padding: 28px;">
          <p style="font-size: 16px; color: #0f172a; margin-top: 0;">Hello ${name || "User"},</p>
          <p style="font-size: 15px; color: #475569; line-height: 1.7;">
            Use the OTP below to verify your email address for your Internova account.
          </p>

          <div style="margin: 24px 0; text-align: center;">
            <div style="display: inline-block; padding: 16px 28px; border-radius: 16px; background: #eff6ff; border: 1px solid #bfdbfe; font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #1d4ed8;">
              ${otp}
            </div>
          </div>

          <p style="font-size: 14px; color: #475569; line-height: 1.7;">
            This OTP is valid for <strong>10 minutes</strong>.
          </p>

          <p style="font-size: 14px; color: #64748b; line-height: 1.7; margin-bottom: 0;">
            If you did not request this, you can ignore this email.
          </p>
        </div>
      </div>
    </div>
  `;

  const text = `Your Internova email verification OTP is ${otp}. It is valid for 10 minutes.`;

  await sendEmail({
    to: email,
    subject,
    html,
    text,
  });
};

// ================= REGISTER =================
exports.registerUser = async (req, res) => {
  try {
    const name = normalizeName(req.body?.name);
    const email = normalizeEmail(req.body?.email);
    const password =
      typeof req.body?.password === "string" ? req.body.password : "";
    const phone = normalizePhone(req.body?.phone);

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email and password are required",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters long",
      });
    }

    const existingUser = await User.findOne({ email }).select(
      "+emailOtp +emailOtpExpires"
    );

    if (existingUser) {
      if (existingUser.authProvider === "google" && !existingUser.password) {
        return res.status(400).json({
          success: false,
          message:
            "This email is already registered with Google login. Please sign in with Google.",
        });
      }

      return res.status(400).json({
        success: false,
        message: "User already exists with this email",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const otp = generateOtp();

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      phone,
      isActive: true,
      authProvider: "local",
      isEmailVerified: false,
      emailOtp: createOtpHash(otp),
      emailOtpExpires: getOtpExpiryTime(10),
    });

    await sendVerificationOtpEmail({
      email: user.email,
      name: user.name,
      otp,
    });

    return res.status(201).json({
      success: true,
      message:
        "Registration successful. Please verify your email with OTP sent to your email address.",
      user: buildSafeUser(user),
      requiresEmailVerification: true,
    });
  } catch (error) {
    console.error("REGISTER ERROR:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Server error during registration",
    });
  }
};

// ================= VERIFY EMAIL OTP =================
exports.verifyEmailOtp = async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const otp =
      typeof req.body?.otp === "string" ? req.body.otp.trim() : "";

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: "Email and OTP are required",
      });
    }

    const user = await User.findOne({ email }).select("+emailOtp +emailOtpExpires");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.isEmailVerified) {
      return res.status(200).json({
        success: true,
        message: "Email is already verified",
        user: buildSafeUser(user),
        token: generateToken(user),
      });
    }

    if (!user.emailOtp || !user.emailOtpExpires) {
      return res.status(400).json({
        success: false,
        message: "No OTP found. Please request a new OTP.",
      });
    }

    if (new Date() > new Date(user.emailOtpExpires)) {
      return res.status(400).json({
        success: false,
        message: "OTP has expired. Please request a new OTP.",
      });
    }

    const hashedOtp = createOtpHash(otp);

    if (hashedOtp !== user.emailOtp) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP",
      });
    }

    user.isEmailVerified = true;
    user.emailOtp = "";
    user.emailOtpExpires = null;
    user.lastLoginAt = new Date();

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Email verified successfully",
      user: buildSafeUser(user),
      token: generateToken(user),
    });
  } catch (error) {
    console.error("VERIFY EMAIL OTP ERROR:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to verify email OTP",
    });
  }
};

// ================= RESEND EMAIL OTP =================
exports.resendEmailOtp = async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const user = await User.findOne({ email }).select("+emailOtp +emailOtpExpires");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({
        success: false,
        message: "Email is already verified",
      });
    }

    const otp = generateOtp();
    user.emailOtp = createOtpHash(otp);
    user.emailOtpExpires = getOtpExpiryTime(10);

    await user.save();

    await sendVerificationOtpEmail({
      email: user.email,
      name: user.name,
      otp,
    });

    return res.status(200).json({
      success: true,
      message: "A new OTP has been sent to your email",
    });
  } catch (error) {
    console.error("RESEND EMAIL OTP ERROR:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to resend OTP",
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

    const user = await User.findOne({ email }).select("+emailOtp +emailOtpExpires");

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

    if (!user.password) {
      return res.status(400).json({
        success: false,
        message: "This account uses Google login. Please continue with Google.",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    if (!user.isEmailVerified) {
      const otp = generateOtp();
      user.emailOtp = createOtpHash(otp);
      user.emailOtpExpires = getOtpExpiryTime(10);
      await user.save();

      await sendVerificationOtpEmail({
        email: user.email,
        name: user.name,
        otp,
      });

      return res.status(403).json({
        success: false,
        message:
          "Email not verified. A new OTP has been sent to your email.",
        requiresEmailVerification: true,
        email: user.email,
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

// ================= GOOGLE LOGIN =================
exports.googleLogin = async (req, res) => {
  try {
    const idToken =
      typeof req.body?.idToken === "string" ? req.body.idToken.trim() : "";

    if (!idToken) {
      return res.status(400).json({
        success: false,
        message: "Google ID token is required",
      });
    }

    const decodedToken = await admin.auth().verifyIdToken(idToken);

    const email = normalizeEmail(decodedToken.email || "");
    const googleId = decodedToken.uid || "";
    const name = normalizeName(decodedToken.name || "Google User");
    const avatar = decodedToken.picture || "";
    const emailVerified = Boolean(decodedToken.email_verified);

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Unable to fetch email from Google account",
      });
    }

    let user = await User.findOne({ email });

    if (user) {
      if (typeof user.isActive === "boolean" && !user.isActive) {
        return res.status(403).json({
          success: false,
          message: "Your account is inactive. Please contact admin.",
        });
      }

      if (!user.googleId) {
        user.googleId = googleId;
      }

      if (!user.avatar && avatar) {
        user.avatar = avatar;
      }

      user.authProvider = "google";
      user.name = user.name || name;
      user.isEmailVerified = emailVerified || user.isEmailVerified;
      user.lastLoginAt = new Date();

      await user.save();
    } else {
      user = await User.create({
        name,
        email,
        password: undefined,
        phone: "",
        role: "user",
        authProvider: "google",
        googleId,
        avatar,
        isEmailVerified: emailVerified,
        isActive: true,
        lastLoginAt: new Date(),
      });
    }

    return res.status(200).json({
      success: true,
      message: "Google login successful",
      user: buildSafeUser(user),
      token: generateToken(user),
    });
  } catch (error) {
    console.error("GOOGLE LOGIN ERROR:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Google login failed",
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