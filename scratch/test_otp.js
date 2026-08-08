const fetch = require('node-fetch');

async function testOtpFlow() {
  const BASE_URL = 'http://localhost:5000';
  const testPhone = '98765' + Math.floor(10000 + Math.random() * 90000);
  console.log('Testing phone:', testPhone);

  // 1. Send register OTP
  const sendRes = await fetch(`${BASE_URL}/api/auth/send-register-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: testPhone }),
  });
  const sendData = await sendRes.json();
  console.log('Send OTP response:', sendData);

  const otpCode = sendData.otpDebug;
  console.log('Generated OTP code:', otpCode, 'Length:', otpCode ? otpCode.length : 'none');

  if (!otpCode || otpCode.length !== 4) {
    console.error('FAIL: OTP is not 4 digits!');
    process.exit(1);
  }

  // 2. Try registering with wrong OTP
  const wrongRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Test Driver',
      phone: testPhone,
      password: 'password123',
      role: 'driver',
      otp: '0000', // incorrect OTP
      vehicle_type: '5seater',
      vehicle_model: 'Swift',
      vehicle_number: 'KA-01-AB-1234',
      license_number: 'DL-12345',
    }),
  });
  const wrongData = await wrongRes.json();
  console.log('Wrong OTP Registration response (should fail):', wrongData);
  if (wrongData.success) {
    console.error('FAIL: Registration succeeded with wrong OTP!');
    process.exit(1);
  }

  // 3. Try registering with correct OTP
  const correctRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Test Driver',
      phone: testPhone,
      password: 'password123',
      role: 'driver',
      otp: otpCode, // correct 4-digit OTP
      vehicle_type: '5seater',
      vehicle_model: 'Swift',
      vehicle_number: 'KA-01-AB-1234',
      license_number: 'DL-12345',
    }),
  });
  const correctData = await correctRes.json();
  console.log('Correct OTP Registration response (should succeed):', correctData);
  if (!correctData.success) {
    console.error('FAIL: Registration failed with correct OTP!');
    process.exit(1);
  }

  console.log('SUCCESS: All 4-digit OTP tests passed perfectly!');
}

testOtpFlow().catch(console.error);
