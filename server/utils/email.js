// server/utils/email.js
// Password-reset mail delivery.
//
// The project is developed offline, so the default behaviour is to log a
// non-sensitive status message and return a result that does not contain the
// reset token. If nodemailer + SMTP credentials (EMAIL_USER/EMAIL_PASS) are
// configured the real email is sent as well.
//
// Security notes:
// - Reset tokens and reset URLs containing tokens are never logged, even in
//   development.
// - Reset tokens are never returned in API responses.
// - FRONTEND_URL must be an absolute http(s) URL. Only its origin is used, so
//   the reset path cannot be redirected to an unsafe destination.

const isProduction = () => process.env.NODE_ENV === "production";

function getFrontendBaseUrl() {
  const configured = process.env.FRONTEND_URL || process.env.CLIENT_ORIGIN;
  if (!configured || typeof configured !== "string") {
    throw new Error("FRONTEND_URL must be configured for password reset.");
  }

  let url;
  try {
    url = new URL(configured.trim());
  } catch {
    throw new Error("FRONTEND_URL must be a valid absolute URL.");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("FRONTEND_URL must use http or https.");
  }
  if (url.username || url.password) {
    throw new Error("FRONTEND_URL must not contain embedded credentials.");
  }

  // Use only the origin so callers cannot inject an arbitrary redirect path
  // or query string through FRONTEND_URL.
  return url.origin;
}

function buildResetUrl(email, token) {
  if (typeof email !== "string" || typeof token !== "string" || !token) {
    throw new Error("A valid email and reset token are required.");
  }
  const base = getFrontendBaseUrl();
  return `${base}/reset-password?email=${encodeURIComponent(email)}&token=${encodeURIComponent(token)}`;
}

async function sendResetEmail(email, token) {
  const resetUrl = buildResetUrl(email, token);

  if (!isProduction()) {
    console.log(`[email] Password reset requested for ${email}.`);
  }

  let sent = false;
  try {
    // Optional path - nodemailer is only required when actually mailing.
    const nodemailer = require("nodemailer");
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
      });
      await transporter.sendMail({
        from: process.env.EMAIL_FROM || `"PantryPal" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: "Reset your PantryPal password",
        text: `Reset your password: ${resetUrl}\nThis link expires in 1 hour.`,
      });
      sent = true;
    }
  } catch (err) {
    console.warn("[email] SMTP not available, reset email was not sent:", err.message);
  }

  // Never expose the reset token or reset URL to callers.
  return { sent };
}

module.exports = { sendResetEmail, getFrontendBaseUrl, buildResetUrl };
