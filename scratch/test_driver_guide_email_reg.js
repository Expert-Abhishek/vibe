const BASE_URL = 'http://localhost:5000';

async function testDriverAndGuideEmailRegistration() {
  console.log('🚀 Testing Driver & Guide Email Registration Flow...\n');
  const driverEmail = `driver_${Date.now()}@example.com`;
  const driverPhone = `97${Math.floor(10000000 + Math.random() * 90000000)}`;

  // 1. Driver Send OTP
  const driverSend = await (await fetch(`${BASE_URL}/api/auth/send-email-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: driverEmail, purpose: 'registration', name: 'Ramesh Driver' }),
  })).json();
  console.log('Driver Send OTP Response:', driverSend);

  // 2. Driver Verify OTP
  const driverVerify = await (await fetch(`${BASE_URL}/api/auth/verify-email-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: driverEmail, otp: driverSend.otpDebug, purpose: 'registration' }),
  })).json();
  console.log('Driver Verify OTP Response:', driverVerify);

  // 3. Driver Register
  const driverReg = await (await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Ramesh Driver',
      email: driverEmail,
      phone: driverPhone,
      alternate_phone: '9888877777',
      password: 'driverpassword',
      role: 'driver',
      vehicle_type: '5seater',
      vehicle_model: 'Swift Dzire',
      vehicle_number: 'KA-01-AB-1234',
      license_number: 'KA1234567890123',
      otp: driverSend.otpDebug,
    }),
  })).json();
  console.log('Driver Register Response:', driverReg);
  if (!driverReg.success) throw new Error('Driver registration failed: ' + driverReg.message);
  console.log('✅ Driver registered successfully!\n');

  // Guide
  const guideEmail = `guide_${Date.now()}@example.com`;
  const guidePhone = `96${Math.floor(10000000 + Math.random() * 90000000)}`;

  const guideSend = await (await fetch(`${BASE_URL}/api/auth/send-email-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: guideEmail, purpose: 'registration', name: 'Suresh Guide' }),
  })).json();

  const guideReg = await (await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Suresh Guide',
      email: guideEmail,
      phone: guidePhone,
      alternate_phone: '9888866666',
      password: 'guidepassword',
      role: 'guide',
      expertise: 'Heritage & History Tours',
      bio: '5 years certified expert guide',
      otp: guideSend.otpDebug,
    }),
  })).json();
  console.log('Guide Register Response:', guideReg);
  if (!guideReg.success) throw new Error('Guide registration failed: ' + guideReg.message);
  console.log('✅ Guide registered successfully!\n');

  console.log('🎉 DRIVER & GUIDE EMAIL REGISTRATION FULLY VERIFIED! 🎉');
}

testDriverAndGuideEmailRegistration().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
