const Subscriber = require("../models/Subscriber");

const normalizeEmail = (email = "") => {
  return typeof email === "string" ? email.trim().toLowerCase() : "";
};

const normalizeSource = (source = "") => {
  const cleaned = typeof source === "string" ? source.trim().toLowerCase() : "";
  return cleaned || "footer";
};

const isValidEmail = (email = "") => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

/* =========================
   PUBLIC SUBSCRIBE
========================= */
exports.subscribeUser = async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const source = normalizeSource(req.body?.source);

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email address",
      });
    }

    const existing = await Subscriber.findOne({ email });

    if (existing) {
      if (!existing.isActive) {
        existing.isActive = true;
        existing.source = source || existing.source;
        await existing.save();
      }

      return res.status(200).json({
        success: true,
        message: "Email already subscribed",
        item: existing,
      });
    }

    const item = await Subscriber.create({
      email,
      source,
      isActive: true,
    });

    return res.status(201).json({
      success: true,
      message: "Subscribed successfully",
      item,
    });
  } catch (error) {
    console.error("SUBSCRIBE USER ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to subscribe",
    });
  }
};

/* =========================
   ADMIN GET ALL SUBSCRIBERS
========================= */
exports.getAllSubscribers = async (req, res) => {
  try {
    const items = await Subscriber.find()
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      total: items.length,
      items,
    });
  } catch (error) {
    console.error("GET ALL SUBSCRIBERS ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch subscribers",
    });
  }
};