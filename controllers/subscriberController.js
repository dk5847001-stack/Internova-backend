const Subscriber = require("../models/Subscriber");
const { escapeRegex, isValidEmail, normalizeEmail } = require("../utils/validation");

const normalizeSource = (source = "") => {
  const cleaned = typeof source === "string" ? source.trim().toLowerCase() : "";
  return cleaned || "footer";
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
      });
    }

    await Subscriber.create({
      email,
      source,
      isActive: true,
    });

    return res.status(201).json({
      success: true,
      message: "Subscribed successfully",
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
    const search = String(req.query?.search || "").trim();
    const query = {};

    if (search) {
      query.email = {
        $regex: escapeRegex(search.slice(0, 80)),
        $options: "i",
      };
    }

    const items = await Subscriber.find(query)
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
