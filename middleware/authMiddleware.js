const jwt = require("jsonwebtoken");

exports.protect = async (req, res, next) => {
  try {
    let token = null;

    const authHeader = req.headers.authorization || "";

    if (authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1]?.trim();
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Not authorized, no token found",
      });
    }

    if (!process.env.JWT_SECRET) {
      console.error("AUTH MIDDLEWARE ERROR: JWT_SECRET is missing");
      return res.status(500).json({
        success: false,
        message: "Server auth configuration error",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = {
      ...decoded,
      id: decoded.id || decoded._id || null,
      _id: decoded._id || decoded.id || null,
      role: decoded.role || "user",
    };

    if (!req.user.id) {
      return res.status(401).json({
        success: false,
        message: "Invalid token payload",
      });
    }

    next();
  } catch (error) {
    console.error("AUTH MIDDLEWARE ERROR:", error);

    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Token expired, please login again",
      });
    }

    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "Invalid token",
      });
    }

    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
};

exports.adminOnly = (req, res, next) => {
  try {
    if (!req.user || req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admin only.",
      });
    }

    next();
  } catch (error) {
    console.error("ADMIN MIDDLEWARE ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Authorization check failed",
    });
  }
};