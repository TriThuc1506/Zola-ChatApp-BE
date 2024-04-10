const nodemailer = require("nodemailer");
require("dotenv").config();
const transporter = require("../configs/Mailer.config");

const sendMail = async (to, subject, html) => {
  try {
    const rs = await transporter.sendMail({
      from: process.env.NODE_MAILER_USER,
      to,
      subject,
      html,
    });
    console.log("Message sent: %s", rs.messageId);
  } catch (error) {
    console.log(error);
  }
};

module.exports = sendMail;
