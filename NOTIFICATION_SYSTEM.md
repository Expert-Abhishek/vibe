# 🔔 Vibzz Push & In-App Notification System Documentation

This document outlines the architecture, single-path delivery mechanisms, trigger registry, and token lifecycle management for push notifications and in-app activity notifications across the Vibzz application ecosystem.

---

## 🏗️ Architecture Overview

The notification subsystem employs a unified, single-path notification pipeline:

```
[ Backend Server / Triggers ]
       │
       ├─► 1. Expo Push API (exp.host/--/api/v2/push/send) ─────────────► Mobile Dev & Production Builds
       ├─► 2. Real-Time Socket.io Gateway (emitNotification) ───────────► In-App Headers & Active Screens
       └─► 3. PostgreSQL Database (activity_notifications) ─────────────► In-App Bell Drawer History
```

---

## 🚀 Key Features & Single-Path Push Architecture

1. **Expo Push API (`https://exp.host/--/api/v2/push/send`)**:
   - Direct FCM / `firebase-admin` dependencies have been completely removed.
   - All notifications are sent via Expo's push service endpoint (`backend/services/expoPushService.js`).
2. **Token Format (`ExponentPushToken[...]`)**:
   - Device tokens are requested via `Notifications.getExpoPushTokenAsync({ projectId })`.
   - Saved automatically to PostgreSQL `users.push_token` column upon user login and dashboard mounting (`app/(auth)/sign-in.tsx`, `app/driver-dashboard.tsx`, `app/guide-dashboard.tsx`).
3. **Batch Chunking & Error Handling**:
   - Batch dispatches (e.g. broadcasting new ride requests to all active drivers) are chunked in maximums of 100 messages per HTTP request according to Expo specification.
   - Push tickets returned by Expo are inspected. Tokens returning `DeviceNotRegistered` are automatically cleared from the PostgreSQL database (`UPDATE users SET push_token = NULL WHERE push_token = $1`).
4. **Notification Collapsing & Android Channels**:
   - Payload `collapseId` maps to notification collapsing keys (`trip_request_TRIP_ID`, `trip_STATUS`) to replace duplicate alerts.
   - Client configures `trips` (`MAX` importance, custom vibration, sound) and `default` (`MAX` importance) channels via `Notifications.setNotificationChannelAsync`.

---

## 📱 Testing Push Notifications with Dev Builds

> [!WARNING]
> **Expo Go Notice**: Push notifications do **NOT** work in Expo Go (remote notification support removed in SDK 53+). 
> Testing MUST be performed on physical devices or Android emulators using an EAS Development Build.

### Development Build Workflow:
1. Build & install the development client:
   ```bash
   eas build --profile development --platform android
   # Or build locally:
   npx expo run:android
   ```
2. Start Metro bundler with dev-client mode:
   ```bash
   npx expo start --dev-client
   ```

---

## 📋 Notification Trigger Registry

### 1. 🚖 Trip & Ride Booking Flow

| Event Name | Recipient | Delivery Channels | Push Title & Body Example | Collapse Key |
| :--- | :--- | :--- | :--- | :--- |
| **New Ride Request** | All Active Drivers / Captains | Expo Push + Socket.io + In-App Bell | **Title:** 🚖 New Cab Ride Request!<br>**Body:** Pickup: Sakleshpur Town \| Fare: ₹450 | `trip_request_{tripId}` |
| **New Tour Request** | All Active Guides | Expo Push + Socket.io + In-App Bell | **Title:** 🚩 New Tour Guide Booking!<br>**Body:** Pickup: KSRTC Stand \| Fare: ₹1200 | `trip_request_{tripId}` |
| **Driver Accepts Ride** | Customer / Tourist | Expo Push + Socket.io + In-App Bell | **Title:** 🎉 Partner Confirmed Your Booking!<br>**Body:** Rajesh accepted your ride! Start OTP: 8240 | `trip_{tripId}` |
| **Driver Arrived at Pickup** | Customer / Tourist | Expo Push + Socket.io + In-App Bell | **Title:** 📍 Captain Arrived at Pickup!<br>**Body:** Rajesh has arrived at your location! | `trip_{tripId}` |
| **Trip Completed** | Customer / Tourist | Expo Push + Socket.io + In-App Bell | **Title:** 🏁 Trip Finished!<br>**Body:** Your trip has ended. Total fare ₹450 settled. | `trip_{tripId}` |
| **Trip Cancelled** | Driver / Tourist (Opp. Party) | Expo Push + Socket.io + In-App Bell | **Title:** 🚫 Trip Cancelled<br>**Body:** Trip #123 was cancelled by customer. | `trip_{tripId}` |

---

### 2. 💰 Wallet & Financial Flow

| Event Name | Recipient | Delivery Channels | Push Title & Body Example | Collapse Key |
| :--- | :--- | :--- | :--- | :--- |
| **Admin Approves Top-Up** | Driver / Partner | Expo Push + Socket.io + In-App Bell | **Title:** 🎉 Wallet Top-Up Approved!<br>**Body:** ₹500 credited to your wallet balance. | `wallet_alert` |
| **Admin Declines Top-Up** | Driver / Partner | Expo Push + Socket.io + In-App Bell | **Title:** ❌ Top-Up Request Declined<br>**Body:** Reason: Invalid transaction screenshot. | `wallet_alert` |
| **Withdrawal Approved** | Driver / Partner | Expo Push + Socket.io + In-App Bell | **Title:** 🎉 Withdrawal Approved<br>**Body:** ₹1000 sent to your UPI ID. | `wallet_alert` |
| **Withdrawal Rejected** | Driver / Partner | Expo Push + Socket.io + In-App Bell | **Title:** ❌ Withdrawal Rejected<br>**Body:** Reversal of ₹1000 refunded to wallet. | `wallet_alert` |

---

### 3. 🆔 Account & KYC Flow

| Event Name | Recipient | Delivery Channels | Push Title & Body Example | Collapse Key |
| :--- | :--- | :--- | :--- | :--- |
| **Admin Approves KYC** | Driver / Guide | Expo Push + Socket.io + In-App Bell | **Title:** 🎉 KYC Approved!<br>**Body:** Your registration has been verified. You can now go online. | `account_alert` |
| **Admin Declines KYC** | Driver / Guide | Expo Push + Socket.io + In-App Bell | **Title:** ❌ KYC Registration Declined<br>**Body:** Please re-upload clear DL/RC photos. | `account_alert` |

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
