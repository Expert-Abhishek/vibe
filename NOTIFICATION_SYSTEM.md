# 🔔 Vibzz Push & In-App Notification System Documentation

This document outlines the architecture, delivery mechanisms, trigger registry, and de-duplication strategy for push notifications and in-app activity notifications across the Vibzz application ecosystem.

---

## 🏗️ Architecture Overview

The notification subsystem employs a 3-tier hybrid notification pipeline:

```
[ Backend Server / Triggers ]
       │
       ├─► 1. Firebase Cloud Messaging (FCM v1 API via firebase-admin) ──► Native Android & iOS Devices
       ├─► 2. Expo Push API Fallback (exp.host) ─────────────────────────► Expo Go & Standalone Clients
       ├─► 3. Real-Time Socket.io Gateway (emitNotification) ───────────► In-App Headers & Modals
       └─► 4. PostgreSQL Database (activity_notifications) ─────────────► In-App Bell Drawer History
```

---

## 🚀 Key Technologies & Features

1. **Firebase Admin SDK (FCM v1)**:
   - Uses `firebase-admin-sdk.json` service account (`vibzz-bccf3`) for authenticated push dispatching.
   - High-priority background alerts delivered when app is closed, killed, or in background.
2. **De-Duplication & Notification Collapsing**:
   - Every push notification includes a specific `collapseKey` (e.g. `trip_request_TRIP_ID`, `trip_STATUS`).
   - FCM automatically replaces pending/previous notifications of the same trip on the user's phone screen instead of creating multiple duplicate popups.
3. **Android Channel Configuration**:
   - `trips`: `MAX` importance channel (head-up alert, custom vibration, sound) for trip requests & captain arrival.
   - `default`: High importance channel for wallet updates and account announcements.
4. **Token Management**:
   - Device tokens automatically registered to PostgreSQL `users.push_token` column upon user login and dashboard opening (`app/(auth)/sign-in.tsx`, `app/driver-dashboard.tsx`, `app/guide-dashboard.tsx`).

---

## 📋 Notification Trigger Registry

### 1. 🚖 Trip & Ride Booking Flow

| Event Name | Recipient | Delivery Channels | Push Title & Body Example | Collapse Key |
| :--- | :--- | :--- | :--- | :--- |
| **New Ride Request** | All Active Drivers / Captains | FCM Push + Socket.io + In-App Bell | **Title:** 🚖 New Cab Ride Request!<br>**Body:** Pickup: Sakleshpur Town \| Fare: ₹450 | `trip_request_{tripId}` |
| **New Tour Request** | All Active Guides | FCM Push + Socket.io + In-App Bell | **Title:** 🚩 New Tour Guide Booking!<br>**Body:** Pickup: KSRTC Stand \| Fare: ₹1200 | `trip_request_{tripId}` |
| **Driver Accepts Ride** | Customer / Tourist | FCM Push + Socket.io + In-App Bell | **Title:** 🎉 Partner Confirmed Your Booking!<br>**Body:** Rajesh accepted your ride! Start OTP: 8240 | `trip_{tripId}` |
| **Driver Arrived at Pickup** | Customer / Tourist | FCM Push + Socket.io + In-App Bell | **Title:** 📍 Captain Arrived at Pickup!<br>**Body:** Rajesh has arrived at your location! | `trip_{tripId}` |
| **Trip Completed** | Customer / Tourist | FCM Push + Socket.io + In-App Bell | **Title:** 🏁 Trip Finished!<br>**Body:** Your trip has ended. Total fare ₹450 settled. | `trip_{tripId}` |
| **Trip Cancelled** | Driver / Tourist (Opp. Party) | FCM Push + Socket.io + In-App Bell | **Title:** 🚫 Trip Cancelled<br>**Body:** Trip #123 was cancelled by customer. | `trip_{tripId}` |

---

### 2. 💰 Wallet & Financial Flow

| Event Name | Recipient | Delivery Channels | Push Title & Body Example | Collapse Key |
| :--- | :--- | :--- | :--- | :--- |
| **Admin Approves Top-Up** | Driver / Partner | FCM Push + Socket.io + In-App Bell | **Title:** 🎉 Wallet Top-Up Approved!<br>**Body:** ₹500 credited to your wallet balance. | `wallet_alert` |
| **Admin Declines Top-Up** | Driver / Partner | FCM Push + Socket.io + In-App Bell | **Title:** ❌ Top-Up Request Declined<br>**Body:** Reason: Invalid transaction screenshot. | `wallet_alert` |
| **Withdrawal Approved** | Driver / Partner | FCM Push + Socket.io + In-App Bell | **Title:** 🎉 Withdrawal Approved<br>**Body:** ₹1000 sent to your UPI ID. | `wallet_alert` |
| **Withdrawal Rejected** | Driver / Partner | FCM Push + Socket.io + In-App Bell | **Title:** ❌ Withdrawal Rejected<br>**Body:** Reversal of ₹1000 refunded to wallet. | `wallet_alert` |

---

### 3. 🆔 Account & KYC Flow

| Event Name | Recipient | Delivery Channels | Push Title & Body Example | Collapse Key |
| :--- | :--- | :--- | :--- | :--- |
| **Admin Approves KYC** | Driver / Guide | FCM Push + Socket.io + In-App Bell | **Title:** 🎉 KYC Approved!<br>**Body:** Your registration has been verified. You can now go online. | `account_alert` |
| **Admin Declines KYC** | Driver / Guide | FCM Push + Socket.io + In-App Bell | **Title:** ❌ KYC Registration Declined<br>**Body:** Please re-upload clear DL/RC photos. | `account_alert` |

---

## 🧹 Optimized / Removed Redundant Notifications

To keep the application clutter-free and avoid spamming users:

1. **Self Top-Up Request Submission**:
   - Removed instant in-app activity bell log when user uploads screenshot (since UI modal shows instant confirmation toast).
2. **Platform Fee Deduction Per Ride**:
   - Fee deduction is logged in `wallet_transactions` table for ledger audit, but excluded from bell drawer notifications to prevent spamming drivers on every ride.
3. **Trip Started Extra Alert**:
   - Start OTP verification seamlessly updates the live map UI without firing an additional redundant push alert.

---

## 🔧 Database Schema (`activity_notifications`)

```sql
CREATE TABLE IF NOT EXISTS activity_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  role VARCHAR(20) DEFAULT 'tourist',
  title VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  trip_id UUID,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_activity_notifications_user_role 
ON activity_notifications(user_id, role);
```
