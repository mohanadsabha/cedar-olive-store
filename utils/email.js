const nodemailer = require('nodemailer');
const pug = require('pug');
const htmlToText = require('html-to-text');

module.exports = class Email {
    constructor(user, url) {
        this.from = `"Sedar Olive Store" <${process.env.EMAIL_FROM || 'noreply@sedarolive.com'}>`;
        this.to = user.email;
        this.name = user.name;
        this.url = url;
    }

    createTransporter() {
        if (process.env.NODE_ENV === 'production') {
            // Sendgrid
            return nodemailer.createTransport({
                service: 'SendGrid',
                auth: {
                    user: process.env.SENDGRID_USERNAME,
                    pass: process.env.SENDGRID_PASSWORD,
                },
            });
        }
        return nodemailer.createTransport({
            host: process.env.EMAIL_HOST,
            port: process.env.EMAIL_PORT,
            auth: {
                user: process.env.EMAIL_USERNAME,
                pass: process.env.EMAIL_PASSWORD,
            },
        });
    }

    async send(template, subject) {
        const html = pug.renderFile(
            `${__dirname}/../templates/${template}.pug`,
            {
                name: this.name,
                email: this.to, // For contact forms only
                url: this.url,
                subject,
            },
        );
        const mailOptions = {
            from: this.from,
            to: this.to,
            subject,
            html,
            text: htmlToText.fromString(html),
        };
        await this.createTransporter().sendMail(mailOptions);
    }

    async sendVerification() {
        await this.send(
            'verification',
            'Verify Your Email - Sedar Olive Store',
        );
    }

    async sendPasswordReset() {
        await this.send(
            'passwordReset',
            'Password Reset Request - Sedar Olive Store',
        );
    }

    async sendContact() {
        this.from = `"${this.name}" <${this.to}>`;
        this.to = process.env.ADMIN_EMAIL;
        await this.send(
            'contact',
            `New Contact Form Submission from ${this.name}`,
        );
    }
};
