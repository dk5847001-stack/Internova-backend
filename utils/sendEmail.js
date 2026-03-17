const nodemailer = require("nodemailer");
const dns = require("dns");

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || "smtp.gmail.com",
  port: Number(process.env.EMAIL_PORT) || 587,
  secure: false,
  requireTLS: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  connectionTimeout: 30000,
  greetingTimeout: 30000,
  socketTimeout: 30000,
  tls: {
    rejectUnauthorized: true,
  },
  dnsLookup: (hostname, options, callback) => {
    return dns.lookup(hostname, { family: 4 }, callback);
  },
});

const sendEmail = async ({ to, subject, html, text }) => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    throw new Error("Email configuration is missing");
  }

  await transporter.sendMail({
    from: `"Internova" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html,
    text,
  });
};

module.exports = sendEmail;