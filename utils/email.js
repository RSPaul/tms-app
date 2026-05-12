import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

let transporter;

async function initTransporter() {
  if (transporter) return transporter;

  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    // Use real SMTP if configured
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_PORT === '465',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  } else {
    // Fallback to Ethereal (fake SMTP for testing)
    console.log('No SMTP credentials found. Creating Ethereal test account...');
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
  }
  return transporter;
}

export async function sendEmail({ to, subject, html }) {
  try {
    const tp = await initTransporter();
    const info = await tp.sendMail({
      from: process.env.EMAIL_FROM || '"TMS System" <noreply@tms.local>',
      to,
      subject,
      html,
    });
    
    console.log(`Email sent to ${to}: ${info.messageId}`);
    
    // If using Ethereal, log the preview URL
    if (tp.options.host === 'smtp.ethereal.email') {
      console.log(`Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
    }
    return info;
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
}
