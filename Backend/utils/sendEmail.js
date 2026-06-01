import nodemailer from "nodemailer";

// Gmail SMTP transport. Requires two values in config.env:
//   EMAIL_USER = the Gmail address to send from
//   EMAIL_PASS = a Google "App Password" (Google account → Security →
//                2-Step Verification → App passwords). A normal account
//                password will NOT work.
// The transporter is created lazily so a missing config only errors when
// we actually try to send (not on server boot).
let transporter;
const getTransporter = () => {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  }
  return transporter;
};

export const isEmailConfigured = () =>
  Boolean(process.env.EMAIL_USER && process.env.EMAIL_PASS);

export const sendEmail = async ({ to, subject, html, text }) => {
  if (!isEmailConfigured()) {
    throw new Error(
      "Email is not configured — set EMAIL_USER and EMAIL_PASS in config.env."
    );
  }
  return getTransporter().sendMail({
    from: `splitit <${process.env.EMAIL_USER}>`,
    to,
    subject,
    text,
    html,
  });
};
