const express = require("express");
const { optionalProtect } = require("../middleware/authMiddleware");
const { createRateLimiter, getClientIp } = require("../middleware/rateLimit");
const { askNvidia } = require("../services/aiAgentService");

const router = express.Router();
const chatLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  max: 30,
  keyGenerator: (req) => `${getClientIp(req)}:ai-chat`,
  message: "You've sent a lot of messages. Please wait a few minutes and try again.",
});

const cleanText = (value, maxLength) =>
  typeof value === "string" ? value.trim().slice(0, maxLength) : "";

const SUPPORT_LINKS = {
  internships: { label: "Explore Internships", href: "/internships" },
  register: { label: "Register", href: "/register" },
  login: { label: "Log in", href: "/login" },
  purchases: { label: "My Purchases", href: "/my-purchases" },
  verify: { label: "Verify Certificate", href: "/verify" },
  contact: { label: "Contact Support", href: "/contact" },
  refund: { label: "Refund Policy", href: "/refund-policy" },
  privacy: { label: "Privacy Policy", href: "/privacy-policy" },
  terms: { label: "Terms & Conditions", href: "/terms-and-conditions" },
};

// Links come only from this allow-list, never from model or visitor input.
const getRelevantLinks = (message, isAuthenticated) => {
  const text = String(message || "").toLowerCase();
  if (/certificate/.test(text)) return [SUPPORT_LINKS.purchases, SUPPORT_LINKS.verify];
  if (/purchase|payment|order|offer letter|progress|course|module|video|quiz/.test(text)) {
    return isAuthenticated ? [SUPPORT_LINKS.purchases] : [SUPPORT_LINKS.login, SUPPORT_LINKS.purchases];
  }
  if (/register|registration|sign[ -]?up|otp|email verification/.test(text)) return [SUPPORT_LINKS.register];
  if (/refund/.test(text)) return [SUPPORT_LINKS.refund, SUPPORT_LINKS.contact];
  if (/privacy/.test(text)) return [SUPPORT_LINKS.privacy];
  if (/terms|conditions/.test(text)) return [SUPPORT_LINKS.terms];
  if (/contact|support/.test(text)) return [SUPPORT_LINKS.contact];
  if (/internship|program|duration|price|fee/.test(text)) return [SUPPORT_LINKS.internships];
  return [];
};

router.post("/chat", optionalProtect, chatLimiter, async (req, res) => {
  const message = cleanText(req.body?.message, 2000);
  const conversationId = cleanText(req.body?.conversationId, 100);
  const rawContext = req.body?.context && typeof req.body.context === "object" ? req.body.context : {};
  const context = {
    route: cleanText(rawContext.route, 160),
    page: cleanText(rawContext.page, 80),
    internshipId: cleanText(rawContext.internshipId, 24),
  };

  if (!message) {
    return res.status(400).json({ success: false, message: "Please enter a message." });
  }
  if (typeof req.body?.message !== "string" || req.body.message.length > 2000) {
    return res.status(400).json({ success: false, message: "Message must be 1 to 2,000 characters." });
  }
  if (conversationId && !/^[a-zA-Z0-9_-]{8,100}$/.test(conversationId)) {
    return res.status(400).json({ success: false, message: "Invalid conversation ID." });
  }

  try {
    const result = await askNvidia({
      message,
      history: req.body?.history,
      context,
      user: req.user || null,
    });
    return res.status(200).json({
      success: true,
      message: result.message,
      conversationId: conversationId || `guest_${Date.now().toString(36)}`,
      links: getRelevantLinks(message, Boolean(req.user)),
    });
  } catch (error) {
    console.error("AI CHAT ERROR:", { message: error.message, status: error.status || 500 });
    const status = error.code === "AI_NOT_CONFIGURED" ? 503 : error.name === "AbortError" ? 504 : 502;
    return res.status(status).json({
      success: false,
      message: "Sorry, I'm temporarily unable to respond. Please try again in a moment or contact InternovaTech Support.",
    });
  }
});

module.exports = router;
