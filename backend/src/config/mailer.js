const axios = require('axios');

console.log("✅ Mail transport (Brevo) is initialized");

const sendEmail = async (to, subject, text, html) => {
  try {
    console.log(`[Mailer] Attempting to send email to: ${to} via Brevo`);

    const response = await axios.post(
      'https://api.brevo.com/v3/smtp/email',
      {
        sender: { name: 'E-com App', email: process.env.EMAIL_USER || 'richapparelorder@gmail.com' },
        to: [{ email: to }],
        subject: subject,
        htmlContent: html,
        textContent: text
      },
      {
        headers: {
          'accept': 'application/json',
          'api-key': process.env.BREVO_API_KEY,
          'content-type': 'application/json'
        }
      }
    );

    console.log("✅ Email sent successfully via Brevo. MessageId:", response.data.messageId);
    return response.data;
  } catch (error) {
    console.error("❌ Error sending email via Brevo:", error.response ? error.response.data : error.message);
    throw error;
  }
};

module.exports = { sendEmail };
