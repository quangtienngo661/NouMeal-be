const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = this.createTransporter();
  }

  createTransporter() {
    // For development/testing, you can use Gmail or other email providers
    // For production, consider using services like SendGrid, Mailgun, etc.
    return nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: process.env.EMAIL_PORT || 465,
      secure: true, // true for 465, false for other ports
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD, // Use app password for Gmail
      },
      tls: {
        rejectUnauthorized: false,
      }
    });
  }

  async sendEmail({ to, subject, text, html }) {
    try {
      const mailOptions = {
        from: `"${process.env.APP_NAME || 'NouMeal'}" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
        to,
        subject,
        text,
        html,
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log('Email sent: %s', info.messageId);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('Email sending failed:', error);
      throw new Error(`Email sending failed: ${error.message}`);
    }
  }

  async sendEmailVerificationOTP(email, name, otp) {
    const subject = 'Email Verification - NouMeal';
    const text = `Hi ${name},\n\nYour email verification code is: ${otp}\n\nThis code will expire in 5 minutes.\n\nIf you didn't request this, please ignore this email.\n\nBest regards,\nNouMeal Team`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          .email-container { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; }
          .header { background-color: #2E7D32; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; }
          .otp-code { 
            background-color: #f5f5f5; 
            border: 2px dashed #2E7D32; 
            padding: 15px; 
            text-align: center; 
            font-size: 24px; 
            font-weight: bold; 
            letter-spacing: 5px; 
            margin: 20px 0; 
            color: #2E7D32;
          }
          .footer { background-color: #f8f8f8; padding: 15px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="email-container">
          <div class="header">
            <h1>Email Verification</h1>
          </div>
          <div class="content">
            <p>Hi <strong>${name}</strong>,</p>
            <p>Thank you for registering with NouMeal! To complete your registration, please verify your email address using the code below:</p>
            <div class="otp-code">${otp}</div>
            <p><strong>This code will expire in 5 minutes.</strong></p>
            <p>If you didn't create an account with NouMeal, please ignore this email.</p>
            <p>Best regards,<br>The NouMeal Team</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} NouMeal. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({ to: email, subject, text, html });
  }

  async sendPasswordResetOTP(email, name, otp) {
    const subject = 'Password Reset Request - NouMeal';
    const text = `Hi ${name},\n\nYour password reset code is: ${otp}\n\nThis code will expire in 5 minutes.\n\nIf you didn't request this, please ignore this email and your password will remain unchanged.\n\nBest regards,\nNouMeal Team`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          .email-container { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; }
          .header { background-color: #d32f2f; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; }
          .otp-code { 
            background-color: #f5f5f5; 
            border: 2px dashed #d32f2f; 
            padding: 15px; 
            text-align: center; 
            font-size: 24px; 
            font-weight: bold; 
            letter-spacing: 5px; 
            margin: 20px 0; 
            color: #d32f2f;
          }
          .warning { 
            background-color: #fff3cd; 
            border: 1px solid #ffeaa7; 
            padding: 10px; 
            border-radius: 5px; 
            margin: 15px 0; 
          }
          .footer { background-color: #f8f8f8; padding: 15px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="email-container">
          <div class="header">
            <h1>Password Reset Request</h1>
          </div>
          <div class="content">
            <p>Hi <strong>${name}</strong>,</p>
            <p>We received a request to reset your password. Use the code below to reset your password:</p>
            <div class="otp-code">${otp}</div>
            <p><strong>This code will expire in 5 minutes.</strong></p>
            <div class="warning">
              <strong>Security Notice:</strong> If you didn't request this password reset, please ignore this email. Your password will remain unchanged.
            </div>
            <p>Best regards,<br>The NouMeal Team</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} NouMeal. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({ to: email, subject, text, html });
  }
}

module.exports = new EmailService();