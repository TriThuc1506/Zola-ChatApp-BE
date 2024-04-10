const nodemailer = require('nodemailer');
require('dotenv').config();

// config mailer
const transporter = nodemailer.createTransport({
    service: process.env.NODE_MAILER_SERVICE,
    host: process.env.NODE_MAILER_HOST,
    port: process.env.NODE_MAILER_PORT,
    secure: process.env.NODE_MAILER_SECURE,
    auth: {
        user: process.env.NODE_MAILER_USER,
        pass: process.env.NODE_MAILER_PASSWORD,
    },
});

module.exports = transporter;
