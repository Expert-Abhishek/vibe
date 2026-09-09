const dns = require('dns');
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}

const nodemailer = require('../backend/node_modules/nodemailer');
require('dotenv').config({ path: './backend/.env' });

const user = process.env.SMTP_USER || 'vibzzpvtltd@gmail.com';
const pass = (process.env.SMTP_PASS || 'avhe yuxd lowr zhbw').replace(/\s+/g, '');

console.log('Testing port 587 STARTTLS for:', user);

const transporter587 = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  requireTLS: true,
  auth: { user, pass },
  family: 4,
  connectionTimeout: 10000,
  tls: {
    rejectUnauthorized: false,
    minVersion: 'TLSv1.2',
  },
});

transporter587.verify((err, success) => {
  if (err) {
    console.error('587 VERIFY ERROR:', err);
  } else {
    console.log('✅ 587 VERIFY SUCCESS! Ready to send mail.');
    transporter587.sendMail({
      from: `"Vibzz Support" <${user}>`,
      to: 'abhishekchauhan3003@gmail.com',
      subject: '[Vibzz] Port 587 OTP Test',
      text: 'Testing Gmail OTP on port 587 with IPv4 first.',
    }).then(info => console.log('✅ 587 SEND SUCCESS: Message ID ->', info.messageId))
      .catch(e => console.error('587 SEND ERROR:', e));
  }
});
