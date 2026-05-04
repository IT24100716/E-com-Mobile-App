const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD?.replace(/\s+/g, ''), // Remove spaces for better compatibility
  },
  tls: {
    rejectUnauthorized: false,
  }
});

// Verify connection on startup
transporter.verify((err, success) => {
  if (err) {
    console.error("❌ Mail transport verification failed:", err.message);
  } else {
    const passLen = process.env.EMAIL_PASSWORD ? process.env.EMAIL_PASSWORD.replace(/\s+/g, '').length : 0;
    console.log(`✅ Mail transport is ready (User: ${process.env.EMAIL_USER}, Pass Length: ${passLen})`);
  }
});

const sendEmail = async (to, subject, text, html) => {
  try {
    console.log(`[Mailer] Attempting to send email to: ${to}`);
    console.log(`[Mailer] From: ${process.env.EMAIL_USER}`);

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to,
      subject,
      text,
      html
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent:", info.response);
    return info;
  } catch (error) {
    console.error("Error sending email:", error);
    throw error;
  }
};

module.exports = { sendEmail };
