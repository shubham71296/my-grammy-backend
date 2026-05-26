const nodemailer = require("nodemailer");

const sendEmail = async ({ to, subject, html }) => {
  try {
    const emailUser = process.env.EMAIL_USER?.trim();
    const emailPassword = process.env.PASSWORD_USER?.replace(/\s+/g, "");

    if (!emailUser || !emailPassword) {
      console.error("Email sending error: EMAIL_USER or PASSWORD_USER is missing");
      return {
        success: false,
        code: "EMAIL_CONFIG_MISSING",
        message: "Email service is not configured",
      };
    }

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: emailUser,
        pass: emailPassword,
      },
    });

    const mailOptions = {
      from: `"Grammy Music" <${emailUser}>`,
      to,
      subject,
      html,
    };

    await transporter.sendMail(mailOptions);
    return { success: true };
    
  } catch (error) {
    console.error("Email sending error:", error);
    return {
      success: false,
      code: error?.code,
      responseCode: error?.responseCode,
      message:
        error?.responseCode === 535
          ? "Gmail rejected EMAIL_USER/PASSWORD_USER. Use a Gmail App Password, not your normal Gmail password."
          : error?.message || "Failed to send email",
      error,
    };
  }
};

module.exports = sendEmail;
