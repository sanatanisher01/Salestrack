const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT || 587,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

async function sendEmail({ to, subject, text }) {
  if (!process.env.SMTP_HOST) return;
  await transporter.sendMail({ from: process.env.SMTP_USER, to, subject, text });
}

module.exports = { sendEmail };
