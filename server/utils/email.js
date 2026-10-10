// server/utils/email.js
// Password-reset mail delivery.
//
// The project is developed offline, so the default behaviour is to log the
// reset link to the server console and return it in the API response. If
// nodemailer + SMTP credentials (EMAIL_USER/EMAIL_PASS) are configured the
// real email is sent as well.

async function sendResetEmail(email, token) {
  const resetUrl = `http://localhost:5173/reset-password?email=${encodeURIComponent(email)}&token=${token}`;
  console.log(`[email] Password reset for ${email}: ${resetUrl}`);

  try {
    // Optional path — nodemailer is only required when actually mailing.
    const nodemailer = require("nodemailer");
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
      });
      await transporter.sendMail({
        from: `"PantryPal" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: "Reset your PantryPal password",
        text: `Reset your password: ${resetUrl}\nThis link expires in 1 hour.`,
      });
      return { sent: true, resetUrl };
    }
  } catch (err) {
    console.warn("[email] SMTP not available, returning reset link only:", err.message);
  }

  return { sent: false, resetUrl };
}

module.exports = { sendResetEmail };
