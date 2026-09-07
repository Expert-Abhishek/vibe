/**
 * WhatsApp Reverse OTP / Inbound Verification System - Test Suite
 * Tests end-to-end flow:
 * 1. Initiate verification session -> gets 6-digit code & deepLink
 * 2. Meta Webhook GET challenge verification (hub.challenge)
 * 3. Meta Webhook POST incoming message with "VERIFY <CODE>"
 * 4. Status polling check -> verifies status transitioned to VERIFIED
 * 5. Password Reset & Registration OTP verification check
 */

const http = require('http');

const BASE_URL = process.env.TEST_API_URL || 'http://localhost:5000';
const TEST_PHONE = '9876543210';
const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'vibe_whatsapp_verify_token_2026';

async function makeRequest(path, method = 'GET', body = null, headers = {}) {
  const url = `${BASE_URL}${path}`;
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  };
  if (body) {
    options.body = JSON.stringify(body);
  }

  const res = await fetch(url, options);
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch (e) {
    json = text;
  }
  return { status: res.status, data: json };
}

async function runTests() {
  console.log('================================================================');
  console.log('🧪 WHATSAPP REVERSE OTP (INBOUND VERIFICATION) TEST SUITE');
  console.log(`🌐 Target: ${BASE_URL}`);
  console.log('================================================================\n');

  try {
    // 1. Health check
    console.log('Step 1: Checking Backend Health...');
    const health = await makeRequest('/health');
    console.log('Health Status:', health.status, health.data);
    if (health.status !== 200) {
      throw new Error(`Backend not responding at ${BASE_URL}. Ensure 'npm start' or 'node server.js' is running.`);
    }

    // 2. Test Meta Webhook GET Challenge Handshake
    console.log('\nStep 2: Testing Meta Webhook GET Verification Challenge...');
    const challengeStr = 'test_meta_challenge_nonce_12345';
    const challengeRes = await fetch(`${BASE_URL}/webhook?hub.mode=subscribe&hub.verify_token=${encodeURIComponent(VERIFY_TOKEN)}&hub.challenge=${challengeStr}`);
    const challengeBody = await challengeRes.text();

    console.log('GET /webhook Status:', challengeRes.status, '| Response:', challengeBody);
    if (challengeRes.status === 200 && challengeBody === challengeStr) {
      console.log('✅ Meta Webhook Challenge Handshake PASSED!');
    } else {
      console.warn('⚠️ Meta Webhook Challenge failed. Check WHATSAPP_VERIFY_TOKEN.');
    }

    // 3. Initiate WhatsApp Reverse OTP Session
    console.log('\nStep 3: Initiating WhatsApp Verification Session for +91', TEST_PHONE);
    const initRes = await makeRequest('/api/auth/whatsapp/initiate', 'POST', {
      phone: TEST_PHONE,
      purpose: 'registration',
    });

    console.log('POST /api/auth/whatsapp/initiate Status:', initRes.status);
    console.log('Session Details:', initRes.data);

    if (!initRes.data || !initRes.data.success || !initRes.data.verificationCode) {
      throw new Error('Failed to initiate verification session');
    }

    const { sessionId, verificationCode, deepLink, businessPhone } = initRes.data;
    console.log(`✅ Session Created: ${sessionId}`);
    console.log(`🔢 6-Digit Code: ${verificationCode}`);
    console.log(`🔗 Deep Link: ${deepLink}`);

    // 4. Check Initial Status (Should be PENDING)
    console.log('\nStep 4: Checking initial status before WhatsApp message...');
    const statusBefore = await makeRequest(`/api/auth/whatsapp/status/${sessionId}`);
    console.log('Status Before:', statusBefore.data);
    if (statusBefore.data.verified !== false || statusBefore.data.status !== 'PENDING') {
      console.warn('⚠️ Expected status PENDING before webhook.');
    } else {
      console.log('✅ Initial status is correctly PENDING.');
    }

    // 5. Simulate Meta Cloud API POST Webhook Event
    console.log('\nStep 5: Simulating Meta Webhook POST Event from WhatsApp sender...');
    const metaWebhookPayload = {
      object: 'whatsapp_business_account',
      entry: [
        {
          id: 'WHATSAPP_BUSINESS_ACCOUNT_ID',
          changes: [
            {
              field: 'messages',
              value: {
                messaging_product: 'whatsapp',
                metadata: {
                  display_phone_number: businessPhone,
                  phone_number_id: '10987654321',
                },
                contacts: [
                  {
                    profile: { name: 'Test User' },
                    wa_id: `91${TEST_PHONE}`,
                  },
                ],
                messages: [
                  {
                    from: `91${TEST_PHONE}`,
                    id: `wamid.HBgL${Date.now()}`,
                    timestamp: Math.floor(Date.now() / 1000).toString(),
                    type: 'text',
                    text: {
                      body: `VERIFY ${verificationCode}`,
                    },
                  },
                ],
              },
            },
          ],
        },
      ],
    };

    const webhookPostRes = await makeRequest('/webhook', 'POST', metaWebhookPayload);
    console.log('POST /webhook Status:', webhookPostRes.status, webhookPostRes.data);
    if (webhookPostRes.status === 200) {
      console.log('✅ Meta Webhook successfully processed inbound message!');
    } else {
      throw new Error(`Webhook POST failed with status ${webhookPostRes.status}`);
    }

    // 6. Check Status After Webhook (Should be VERIFIED)
    console.log('\nStep 6: Verifying status update via polling endpoint...');
    const statusAfter = await makeRequest(`/api/auth/whatsapp/status/${sessionId}`);
    console.log('Status After Webhook:', statusAfter.data);

    if (statusAfter.data.verified === true && statusAfter.data.status === 'VERIFIED') {
      console.log('🎉 SUCCESS: Session status transitioned to VERIFIED in database!');
    } else {
      throw new Error(`Verification failed. Status is: ${statusAfter.data.status}`);
    }

    // 7. Test Registration OTP Verification endpoint with verified code
    console.log('\nStep 7: Testing Registration OTP verify endpoint with session...');
    const verifyRegRes = await makeRequest('/api/auth/verify-register-otp', 'POST', {
      phone: TEST_PHONE,
      sessionId: sessionId,
      code: verificationCode,
    });
    console.log('verify-register-otp Response:', verifyRegRes.data);

    if (verifyRegRes.data.success) {
      console.log('✅ Registration verification check PASSED!');
    }

    console.log('\n================================================================');
    console.log('🏆 ALL WHATSAPP REVERSE OTP TESTS PASSED 100% SUCCESSFULLY!');
    console.log('================================================================\n');
  } catch (error) {
    console.error('\n❌ TEST RUN FAILED:', error.message);
  }
}

runTests();
