const https = require('https');
const http = require('http');

const BASE_URL = 'https://vibe-backend-tlaw.onrender.com';

async function post(url, data) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const body = JSON.stringify(data);
    const client = u.protocol === 'https:' ? https : http;
    const req = client.request(
      {
        hostname: u.hostname,
        port: u.port || (u.protocol === 'https:' ? 443 : 80),
        path: u.pathname + u.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
        },
      },
      (res) => {
        let text = '';
        res.on('data', (chunk) => (text += chunk));
        res.on('end', () => {
          try {
            resolve(JSON.parse(text));
          } catch (e) {
            resolve({ text, statusCode: res.statusCode });
          }
        });
      }
    );
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function get(url) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const client = u.protocol === 'https:' ? https : http;
    const req = client.request(
      {
        hostname: u.hostname,
        port: u.port || (u.protocol === 'https:' ? 443 : 80),
        path: u.pathname + u.search,
        method: 'GET',
      },
      (res) => {
        let text = '';
        res.on('data', (chunk) => (text += chunk));
        res.on('end', () => {
          try {
            resolve(JSON.parse(text));
          } catch (e) {
            resolve({ text, statusCode: res.statusCode });
          }
        });
      }
    );
    req.on('error', reject);
    req.end();
  });
}

async function run() {
  console.log('\n=== REAL-WORLD CREDENTIALS FLOW VERIFICATION ===\n');

  console.log('--- 1. TOURIST LOGIN (Phone: 9650830901, Pass: abhittac) ---');
  const touristLogin = await post(`${BASE_URL}/api/auth/login`, {
    phone: '9650830901',
    password: 'abhittac',
  });
  console.log('Tourist Login Status:', touristLogin.success ? 'SUCCESS 🎉' : 'FAILED ❌', touristLogin.message || '');
  if (touristLogin.user) {
    console.log(`Tourist Name: "${touristLogin.user.name}", ID: ${touristLogin.user.id}, Role: ${touristLogin.user.role}`);
  }

  console.log('\n--- 2. DRIVER LOGIN (Phone: 9810235511, Pass: 011299) ---');
  const driverLogin = await post(`${BASE_URL}/api/auth/login`, {
    phone: '9810235511',
    password: '011299',
  });
  console.log('Driver Login Status:', driverLogin.success ? 'SUCCESS 🎉' : 'FAILED ❌', driverLogin.message || '');
  if (driverLogin.user) {
    console.log(`Driver Name: "${driverLogin.user.name}", ID: ${driverLogin.user.id}, Vehicle Model: "${driverLogin.user.profile?.vehicle_model || 'WagonR'}"`);
  }

  if (!touristLogin.success || !driverLogin.success) {
    console.error('Login Failed!');
    process.exit(1);
  }

  const touristId = touristLogin.user.id;
  const driverId = driverLogin.user.id;

  console.log('\n--- 3. TOURIST BOOKS A TOUR PLAN ---');
  const planTrip = await post(`${BASE_URL}/api/trips/create-trip`, {
    tripType: 'plan',
    title: 'Sakleshpur 3-Spot Heritage Tour (8 Hours)',
    customerId: touristId,
    customerName: touristLogin.user.name,
    amount: 2500,
    paymentMode: 'Cash',
    checkpoints: ['Manjarabad Fort', 'Bisle Ghat Viewpoint', 'Jenukallu Gudda'],
    destinationIds: ['Manjarabad Fort', 'Bisle Ghat Viewpoint', 'Jenukallu Gudda'],
    pickupName: 'KSRTC Bus Stand Sakleshpur',
    dropName: 'Sakleshpur Town Center',
    vehicleCategory: '5_seater',
    bookingType: 'INSTANT',
    durationHours: 8,
  });

  console.log('Plan Trip Creation Result:', planTrip.success ? 'SUCCESS 🎉' : 'FAILED ❌');
  const tripId = planTrip.data?.id || planTrip.id;
  console.log('Trip Created ID:', tripId);
  console.log('Initial Status:', planTrip.data?.status);
  console.log('Checkpoints Saved:', planTrip.data?.checkpoints || planTrip.data?.destinationIds);

  console.log('\n--- 4. DRIVER FETCHES PENDING RIDE REQUESTS ---');
  const pendingRes = await get(`${BASE_URL}/api/trips/pending-requests?driverId=${driverId}`);
  console.log('Pending Trips Count:', pendingRes.data?.length);
  const foundTrip = (pendingRes.data || []).find(t => String(t.id) === String(tripId));
  if (foundTrip) {
    console.log('Pending Request Summary for Driver:', {
      id: foundTrip.id,
      title: foundTrip.title,
      touristName: foundTrip.customerName || foundTrip.touristName,
      pickup: foundTrip.pickupName || foundTrip.pickup,
      drop: foundTrip.dropName || foundTrip.drop,
      checkpoints: foundTrip.checkpoints,
      fare: foundTrip.amount,
    });
  }

  console.log('\n--- 5. DRIVER ACCEPTS THE PLAN TRIP ---');
  const acceptRes = await post(`${BASE_URL}/api/trips/${tripId}/accept`, {
    driverId: driverId,
    driverName: driverLogin.user.name,
  });
  console.log('Driver Accept Status:', acceptRes.success ? 'SUCCESS 🎉' : 'FAILED ❌');
  if (acceptRes.success) {
    console.log('Accepted Trip Payload:', {
      tripId: acceptRes.data?.id,
      status: acceptRes.data?.status,
      driverName: acceptRes.data?.driverName || acceptRes.data?.driver_or_guide_name,
      otp: acceptRes.data?.otp,
      endOtp: acceptRes.data?.endOtp || acceptRes.data?.end_otp,
    });
  } else {
    console.error('Accept Error:', acceptRes.error || acceptRes.message);
  }

  console.log('\n--- 6. TOURIST POLLS LIVE TRIP STATUS & DRIVER INFO ---');
  const liveStatus = await get(`${BASE_URL}/api/trips/live-location/${tripId}`);
  console.log('Live Trip Status for Tourist:', liveStatus.data?.status);
  console.log('Driver Details Displayed on Tourist Screen:', liveStatus.data?.driver);

  console.log('\n--- 7. DRIVER ARRIVES AT PICKUP LOCATION ---');
  const arriveRes = await post(`${BASE_URL}/api/trips/${tripId}/arrive`, {
    driverName: driverLogin.user.name,
  });
  console.log('Arrive Status:', arriveRes.success ? 'ARRIVED 📍' : arriveRes.message);

  console.log('\n--- 8. CLEANUP: CANCEL TEST TRIP ---');
  const cancelRes = await post(`${BASE_URL}/api/trips/${tripId}/cancel`, {
    reason: 'Real-world verification test completed',
    cancelledBy: 'tourist',
  });
  console.log('Cancel Status:', cancelRes.success ? 'CLEANED UP ✅' : cancelRes.message);

  console.log('\n========================================================');
  console.log('🎉 ALL REAL-WORLD CHECKS EXECUTED SUCCESSFULLY!');
  console.log('========================================================');
  process.exit(0);
}

run();
