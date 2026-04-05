const SibApiV3Sdk = require("sib-api-v3-sdk");
const { normalizeEmail } = require("./validation");

const client = SibApiV3Sdk.ApiClient.instance;
const apiKey = client.authentications["api-key"];

const sendEmail = async ({ to, subject, html, text }) => {
  if (!process.env.BREVO_API_KEY) {
    throw new Error("BREVO_API_KEY is missing");
  }

  if (!process.env.EMAIL_FROM) {
    throw new Error("EMAIL_FROM is missing");
  }

  const recipientEmail = normalizeEmail(to);

  if (!recipientEmail) {
    throw new Error("A valid recipient email is required");
  }

  apiKey.apiKey = process.env.BREVO_API_KEY;

  const transactionalApi = new SibApiV3Sdk.TransactionalEmailsApi();

  await transactionalApi.sendTransacEmail({
    sender: {
      email: process.env.EMAIL_FROM,
      name: process.env.EMAIL_FROM_NAME || "Internova",
    },
    to: [{ email: recipientEmail }],
    subject: String(subject || "").trim(),
    htmlContent: html,
    textContent: text,
  });
};

module.exports = sendEmail;
