const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false, // use TLS
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
  tls: {
    rejectUnauthorized: false,
  },
  debug: true,
  logger: true
});

// Verify connection on startup
transporter.verify((err, success) => {
  if (err) {
    console.error("❌ Mail transport verification failed:", err.message);
  } else {
    console.log("✅ Mail transport is ready to send emails");
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
