const BASE_URL = 'http://localhost:5000';

async function runEmailOtpFlowTests() {
  console.log('🚀 Starting Email OTP Integration Tests...\n');
  const testEmail = `testuser_${Date.now()}@example.com`;
  const testPhone = `98${Math.floor(10000000 + Math.random() * 90000000)}`;

  try {
    // 1. Send Email OTP for Registration
    console.log(`1️⃣ Sending Email OTP to: ${testEmail}...`);
    const sendRes = await fetch(`${BASE_URL}/api/auth/send-email-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        purpose: 'registration',
        name: 'Test Rider',
      }),
    });
    const sendData = await sendRes.json();
    console.log('Response:', sendData);

    if (!sendData.success) {
      throw new Error(`send-email-otp failed: ${sendData.message}`);
    }

    const otpCode = sendData.otpDebug;
    console.log(`✅ OTP received (dev debug): ${otpCode}\n`);

    // 2. Verify Email OTP
    console.log(`2️⃣ Verifying Email OTP for ${testEmail}...`);
    const verifyRes = await fetch(`${BASE_URL}/api/auth/verify-email-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        otp: otpCode,
        purpose: 'registration',
      }),
    });
    const verifyData = await verifyRes.json();
    console.log('Response:', verifyData);

    if (!verifyData.success) {
      throw new Error(`verify-email-otp failed: ${verifyData.message}`);
    }
    console.log('✅ Email OTP successfully verified!\n');

    // 3. Register user with verified email
    console.log(`3️⃣ Registering user with verified email (${testEmail})...`);
    const regRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test Rider',
        email: testEmail,
        phone: testPhone,
        password: 'password123',
        role: 'tourist',
        otp: otpCode,
      }),
    });
    const regData = await regRes.json();
    console.log('Response:', regData);

    if (!regData.success) {
      throw new Error(`register failed: ${regData.message}`);
    }
    console.log(`✅ User registered successfully! User ID: ${regData.user?.id}\n`);

    // 4. Send Password Reset OTP to Email
    console.log(`4️⃣ Sending Password Reset OTP to email: ${testEmail}...`);
    const resetSendRes = await fetch(`${BASE_URL}/api/auth/send-reset-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
      }),
    });
    const resetSendData = await resetSendRes.json();
    console.log('Response:', resetSendData);

    if (!resetSendData.success) {
      throw new Error(`send-reset-otp failed: ${resetSendData.message}`);
    }
    const resetOtp = resetSendData.otpDebug;
    console.log(`✅ Reset OTP received: ${resetOtp}\n`);

    // 5. Verify Reset OTP and update password
    console.log(`5️⃣ Verifying Reset OTP & updating password...`);
    const resetVerifyRes = await fetch(`${BASE_URL}/api/auth/verify-reset-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        otp: resetOtp,
        newPassword: 'newpassword456',
      }),
    });
    const resetVerifyData = await resetVerifyRes.json();
    console.log('Response:', resetVerifyData);

    if (!resetVerifyData.success) {
      throw new Error(`verify-reset-otp failed: ${resetVerifyData.message}`);
    }
    console.log('✅ Password reset verified & updated successfully!\n');

    // 6. Login with new password
    console.log(`6️⃣ Testing login with new password...`);
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: testPhone,
        password: 'newpassword456',
      }),
    });
    const loginData = await loginRes.json();
    console.log('Response:', loginData);

    if (!loginData.success) {
      throw new Error(`login failed: ${loginData.message}`);
    }
    console.log('✅ Login with new password succeeded! 🎉\n');

    console.log('🎉 ALL EMAIL OTP FLOW INTEGRATION TESTS PASSED 100%! 🎉');
  } catch (err) {
    console.error('❌ Test failed:', err);
    process.exit(1);
  }
}

runEmailOtpFlowTests();
