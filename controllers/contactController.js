const Contact = require('../models/contactModel');
const catchAsync = require('../utils/catchAsync');
const sendEmail = require('../utils/email');

exports.submitContactForm = catchAsync(async (req, res, next) => {
    const { name, email, message } = req.body;
    await Contact.create({ name, email, message });

    const htmlTemplate = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          .email-container {
            max-width: 600px;
            margin: 0 auto;
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333333;
          }
          .header {
            background-color: #4a90e2;
            color: white;
            padding: 20px;
            text-align: center;
            border-radius: 5px 5px 0 0;
          }
          .content {
            padding: 20px;
            background-color: #ffffff;
            border: 1px solid #dddddd;
            border-radius: 0 0 5px 5px;
          }
          .field {
            margin-bottom: 15px;
          }
          .field-label {
            font-weight: bold;
            color: #666666;
          }
          .message-box {
            background-color: #f5f5f5;
            padding: 15px;
            border-radius: 5px;
            margin-top: 10px;
          }
          .footer {
            text-align: center;
            margin-top: 20px;
            font-size: 0.8em;
            color: #999999;
          }
        </style>
      </head>
      <body>
        <div class="email-container">
          <div class="header">
            <h2>New Contact Form Submission</h2>
          </div>
          <div class="content">
            <div class="field">
              <span class="field-label">From:</span>
              <div>${name}</div>
            </div>
            <div class="field">
              <span class="field-label">Email:</span>
              <div>${email}</div>
            </div>
            <div class="field">
              <span class="field-label">Message:</span>
              <div class="message-box">${message}</div>
            </div>
            <div class="footer">
              This message was sent from your website's contact form.
            </div>
          </div>
        </div>
      </body>
    </html>`;

    await sendEmail({
        from: `"${name}" <${email}>`,
        to: process.env.ADMIN_EMAIL,
        subject: `New Contact Form Submission from ${name}`,
        message: htmlTemplate,
        text: `Name: ${name}\nEmail: ${email}\nMessage: ${message}`, // text alternative
    });

    res.status(201).json({
        status: 'success',
        message: 'Message sent successfully!',
    });
});
