const mongoose = require("mongoose");

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_POLICY_MESSAGE =
  "Password must be at least 8 characters long and include both letters and numbers";

const normalizeText = (value = "", { lowerCase = false, maxLength = 500 } = {}) => {
  if (typeof value !== "string") return "";

  const trimmed = value.trim().slice(0, Math.max(0, maxLength));
  return lowerCase ? trimmed.toLowerCase() : trimmed;
};

const normalizeEmail = (email = "") =>
  normalizeText(email, { lowerCase: true, maxLength: 254 });

const normalizeName = (name = "") =>
  normalizeText(name, { maxLength: 80 }).replace(/\s+/g, " ");

const normalizePhone = (phone = "") => {
  if (typeof phone !== "string") return "";

  return phone.replace(/[^\d+]/g, "").slice(0, 20).trim();
};

const isValidEmail = (email = "") => EMAIL_REGEX.test(normalizeEmail(email));

const isStrongPassword = (password = "") => {
  if (typeof password !== "string") return false;

  return (
    password.length >= PASSWORD_MIN_LENGTH &&
    /[A-Za-z]/.test(password) &&
    /\d/.test(password)
  );
};

const escapeRegex = (value = "") =>
  String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

const escapeHtml = (value = "") =>
  String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const maskEmail = (email = "") => {
  const normalized = normalizeEmail(email);
  const [localPart = "", domain = ""] = normalized.split("@");

  if (!localPart || !domain) {
    return "";
  }

  if (localPart.length <= 2) {
    return `${localPart[0] || "*"}***@${domain}`;
  }

  return `${localPart.slice(0, 2)}***${localPart.slice(-1)}@${domain}`;
};

module.exports = {
  PASSWORD_MIN_LENGTH,
  PASSWORD_POLICY_MESSAGE,
  escapeHtml,
  escapeRegex,
  isStrongPassword,
  isValidEmail,
  isValidObjectId,
  maskEmail,
  normalizeEmail,
  normalizeName,
  normalizePhone,
  normalizeText,
};
