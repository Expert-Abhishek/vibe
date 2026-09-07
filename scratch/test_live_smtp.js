require('dotenv').config({ path: './backend/.env' });
const nodemailer = require('nodemailer');

async function testSmtp() {
  console.log('Testing SMTP connection with credentials from backend/.env...');
  console.log('SMTP_HOST:', process.env.SMTP_HOST);
  console.log('SMTP_PORT:', process.env.SMTP_PORT);
  console.log('SMTP_SECURE:', process.env.SMTP_SECURE);
  console.log('SMTP_USER:', process.env.SMTP_USER);
  console.log('SMTP_PASS:', process.env.SMTP_PASS ? '***' + process.env.SMTP_PASS.slice(-4) : 'NOT SET');
  console.log('EMAIL_FROM:', process.env.EMAIL_FROM);

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '465', 10),
    secure: process.env.SMTP_SECURE === 'true' || process.env.SMTP_PORT === '465',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS ? process.env.SMTP_PASS.replace(/\s+/g, '') : '',
    },
    tls: {
      rejectUnauthorized: false,
    },
  });

  try {
    console.log('Verifying SMTP transporter connection...');
    await transporter.verify();
    console.log('✅ SMTP Connection & Authentication Successful! Google accepted the credentials.');
  } catch (err) {
    console.error('❌ SMTP Connection verification failed:', err);
  }
}

testSmtp();
