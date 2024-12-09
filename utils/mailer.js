const nodemailer = require("nodemailer");

// Export sendMail function
const sendMail = async (to, subject, text) => {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: "alakmishra170101@gmail.com",
        pass: "wpwhpzxkplsgyomm",
      },
    });

    const mailOptions = {
      from: "alakmishra170101@gmail.com",
      to,
      subject,
      text,
    };

    const result = await transporter.sendMail(mailOptions);
    console.log("Email sent:", result.messageId);
    return result;
  } catch (error) {
    console.error("Error sending email:", error);
    throw error;
  }
};

// (async () => {
//   try {
//     console.log("sentMailer", "started");
//     const sent = await sendMail(
//       "palakmishra170101+pollapp@gmail.com",
//       "test",
//       "test mail sent at " + new Date().toLocaleString()
//     );
//     console.log("sendMail", sent);
//   } catch (err) {
//     console.error("sendMail", err);
//   }
// })();

module.exports = { sendMail };