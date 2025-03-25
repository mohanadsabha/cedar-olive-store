const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
    // Create Transporter
    const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT,
        auth: {
            user: process.env.EMAIL_USERNAME,
            pass: process.env.EMAIL_PASSWORD,
        },
    });

    // Define email options
    const mailOptions = {
        from:
            options.from ||
            `"Sedar Olive Store" <${process.env.EMAIL_FROM || 'noreply@sedarolive.com'}>`,
        to: options.to,
        subject: options.subject,
        html: options.message,
        text: options.text || options.message.replace(/<[^>]*>/g, ''), // Fallback for text-only email clients
    };

    // Send Email
    await transporter.sendMail(mailOptions);
};

module.exports = sendEmail;
