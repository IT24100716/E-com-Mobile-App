const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY || 're_bSTD1uEr_2k3sWgRRTvBa4YuFKtUHD7pQ');

console.log("✅ Mail transport (Resend) is initialized");

const sendEmail = async (to, subject, text, html) => {
  try {
    console.log(`[Mailer] Attempting to send email to: ${to} via Resend`);

    const { data, error } = await resend.emails.send({
      from: 'E-com App <onboarding@resend.dev>', 
      to,
      subject,
      text,
      html,
    });

    if (error) {
       console.error("❌ Error sending email via Resend:", error);
       throw new Error(error.message);
    }

    console.log("✅ Email sent successfully via Resend. ID: " + data.id);
    return data;
  } catch (error) {
    console.error("Error sending email:", error);
    throw error;
  }
};

module.exports = { sendEmail };
