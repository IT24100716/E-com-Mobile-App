const nodemailer = require("nodemailer");
require("dotenv").config();

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
  tls: {
    rejectUnauthorized: false,
  },
});

async function testEmail() {
  console.log("Starting email test...");
  console.log("Using User:", process.env.EMAIL_USER);
  
  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_USER, // Send to self for testing
      subject: "Test Email from Rich Apparel",
      text: "If you are reading this, the email service is working perfectly!",
    });
    console.log("✅ Email sent successfully:", info.response);
  } catch (error) {
    console.error("❌ Email test failed:", error.message);
  }
}

testEmail();
