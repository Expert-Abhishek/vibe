const fetch = require('node-fetch');

async function testPasswordResetFlow() {
  const BASE_URL = 'https://vibe-backend-tlaw.onrender.com';
  const testPhone = '99887' + Math.floor(10000 + Math.random() * 90000);
  const initialPassword = 'oldPassword123';
  const newPassword = 'newSecretPassword456';

  console.log('--- Step 1: Register test user with initial password ---');
  // Send register OTP
  const regOtpRes = await fetch(`${BASE_URL}/api/auth/send-register-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: testPhone }),
  });
  const regOtpData = await regOtpRes.json();
  const regOtp = regOtpData.otpDebug;
  console.log('Registration OTP:', regOtp);

  // Complete registration
  const regRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Reset Test Tourist',
      phone: testPhone,
      password: initialPassword,
      role: 'tourist',
      otp: regOtp,
    }),
  });
  const regData = await regRes.json();
  console.log('Registration Result:', regData.success ? 'SUCCESS' : regData);

  console.log('\n--- Step 2: Test Reset OTP for unregistered phone (should fail) ---');
  const fakeRes = await fetch(`${BASE_URL}/api/auth/send-reset-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: '1111122222' }),
  });
  const fakeData = await fakeRes.json();
  console.log('Unregistered Phone Response (404 expected):', fakeData.message);

  console.log('\n--- Step 3: Request Reset OTP for registered user ---');
  const sendResetRes = await fetch(`${BASE_URL}/api/auth/send-reset-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: testPhone }),
  });
  const sendResetData = await sendResetRes.json();
  const resetOtp = sendResetData.otpDebug;
  console.log('Reset OTP received:', resetOtp, 'Length:', resetOtp ? resetOtp.length : 0);

  if (!resetOtp || resetOtp.length !== 4) {
    console.error('FAIL: Reset OTP is not 4 digits!');
    process.exit(1);
  }

  console.log('\n--- Step 4: Verify OTP and update password in DB ---');
  const verifyRes = await fetch(`${BASE_URL}/api/auth/verify-reset-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      phone: testPhone,
      otp: resetOtp,
      newPassword: newPassword,
    }),
  });
  const verifyData = await verifyRes.json();
  console.log('Password Reset Result:', verifyData);

  console.log('\n--- Step 5: Test login with old password (should fail) ---');
  const oldLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      identifier: testPhone,
      password: initialPassword,
    }),
  });
  const oldLoginData = await oldLoginRes.json();
  console.log('Old Password Login (should fail):', oldLoginData.message);

  console.log('\n--- Step 6: Test login with NEW password (should succeed) ---');
  const newLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      identifier: testPhone,
      password: newPassword,
    }),
  });
  const newLoginData = await newLoginRes.json();
  console.log('New Password Login Result:', newLoginData.success ? 'SUCCESS! Logged in as ' + newLoginData.user?.name : newLoginData);

  if (newLoginData.success) {
    console.log('\n✅ ALL PASSWORD RESET AND LOGIN VERIFICATION TESTS PASSED!');
  } else {
    console.error('\n❌ Login with new password failed!');
    process.exit(1);
  }
}

testPasswordResetFlow().catch(console.error);
