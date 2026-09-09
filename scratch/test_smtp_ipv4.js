const nodemailer = require('../backend/node_modules/nodemailer');
require('dotenv').config({ path: './backend/.env' });

const user = process.env.SMTP_USER;
const pass = (process.env.SMTP_PASS || '').replace(/\s+/g, '');

console.log('Testing SMTP connection for:', user);

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user, pass },
  family: 4,
  connectionTimeout: 10000,
});

transporter.verify((err, success) => {
  if (err) {
    console.error('VERIFY ERROR:', err);
  } else {
    console.log('VERIFY SUCCESS! Ready to send mail.');
    transporter.sendMail({
      from: `"Vibzz Support" <${user}>`,
      to: 'abhishekchauhan3003@gmail.com',
      subject: '[Vibzz] Test OTP Email IPv4',
      text: 'Your test OTP code is 123456',
    }).then(info => console.log('SEND SUCCESS: Message ID ->', info.messageId))
      .catch(e => console.error('SEND ERROR:', e));
  }
});
