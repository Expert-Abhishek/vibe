# ⚡ Vibe Platform - Real-Time Architecture & Notifications Guide

This document explains how the Vibe application handles **real-time notifications, request popups, live driver tracking, and instant wallet balance updates** using **Socket.io WebSockets** with zero API polling latency.

---

## 🛠️ 1. Real-Time Architecture Overview

```
                      +---------------------------------------+
                      |   Node.js + Express Backend Server    |
                      |          (HTTP + Socket.io)           |
                      +-------------------+-------------------+
                                          |
                        WebSockets (WSS / WS Event Bus)
                                          |
          +-------------------------------+-------------------------------+
          |                               |                               |
          v                               v                               v
+-------------------+           +-------------------+           +-------------------+
|  Tourist Client   |           |   Driver Client   |           |   Guide Client    |
| (Expo / RN / Web) |           | (Expo / RN / Web) |           | (Expo / RN / Web) |
+-------------------+           +-------------------+           +-------------------+
```

Instead of HTTP interval polling (`setInterval`), the server maintains an active persistent **WebSocket connection** with connected devices. Whenever an action occurs on the server (e.g. Admin approves wallet top-up, new trip request comes in, trip status updates), the backend **pushes the event directly** to the target client.

---

## 🚪 2. Room Registration & Socket Handshake

When a client logs in or opens the app, `socketService.ts` initiates a handshake with `API_BASE_URL` and emits a `join_room` event with the user's ID and role:

```typescript
// Client registers rooms upon connection
socket.emit('join_room', { userId: 'd1', role: 'driver' });
```

The backend server ([backend/config/socket.js](file:///c:/Users/nija/Desktop/vibe/backend/config/socket.js)) registers the socket into two targeted rooms:
1. **User Room**: `user:${userId}` (e.g., `user:a267b68f-...`) -> Used for personal wallet updates, booking status changes, and private alerts.
2. **Role Room**: `role:${role}` (e.g., `role:driver`, `role:admin`) -> Used for role-wide broadcasts like incoming ride requests or admin queue alerts.

---

## 📊 3. Event Matrix & Workflows

| Feature | Trigger Source | Backend Function | Socket Event | Client Action |
| :--- | :--- | :--- | :--- | :--- |
| **Incoming Request Popup** | Tourist books a cab / trip | `broadcastNewTripRequest()` in [make-trip.tsx](file:///c:/Users/nija/Desktop/vibe/app/make-trip.tsx) / `routes/trips.js` | `trip_request` / `notification:new` | `driver-dashboard.tsx` receives request payload in real-time and renders the incoming ride request popup modal. |
| **Real-Time Wallet Sync** | Admin approves/rejects topup or deduction | `emitWalletUpdate()` in [backend/config/socket.js](file:///c:/Users/nija/Desktop/vibe/backend/config/socket.js) | `wallet:updated` | `socketService` receives event -> calls `notifyWalletChanged()` -> Driver/Guide/Tourist screens re-render updated balance **without re-logging in**. |
| **Activity Notifications** | Trip status update, payment, deposit | `logActivityNotification()` in [backend/routes/trips.js](file:///c:/Users/nija/Desktop/vibe/backend/routes/trips.js) | `notification:new` | `socketService` receives payload -> calls `notificationStore.addNotification()` -> Red badge and drawer update instantly. |
| **Live GPS Tracking** | Driver moves on active trip | `updateDriverLocationApi()` in [backend/routes/trips.js](file:///c:/Users/nija/Desktop/vibe/backend/routes/trips.js) | `location_update` | Tourist map tracking screen receives coordinates and smoothly updates vehicle marker position on map. |

---

## 📁 4. Core Code Base Reference

### Backend Implementation
- **[backend/config/socket.js](file:///c:/Users/nija/Desktop/vibe/backend/config/socket.js)**: Configures Socket.io server instance, room joins, `emitNotification()` and `emitWalletUpdate()` event helpers.
- **[backend/server.js](file:///c:/Users/nija/Desktop/vibe/backend/server.js)**: Wraps Express with `http.createServer(app)` and boots WebSockets server on port 5000.
- **[backend/routes/wallet.js](file:///c:/Users/nija/Desktop/vibe/backend/routes/wallet.js)**: Calls `emitWalletUpdate()` whenever top-up requests or deduction requests are reviewed by Admin.
- **[backend/routes/trips.js](file:///c:/Users/nija/Desktop/vibe/backend/routes/trips.js)**: Emits real-time notifications for ride requests, status updates, and GPS tracking.

### Frontend Implementation
- **[src/services/socketService.ts](file:///c:/Users/nija/Desktop/vibe/src/services/socketService.ts)**: Static `socket.io-client` manager. Establishes WebSocket connection, handles auto-reconnects, and listens for `notification:new` and `wallet:updated`.
- **[constants/api.ts](file:///c:/Users/nija/Desktop/vibe/constants/api.ts)**: Exports `subscribeWalletChange()` and `notifyWalletChanged()` pub/sub system for reactive UI re-renders.
- **[src/store/notificationStore.ts](file:///c:/Users/nija/Desktop/vibe/src/store/notificationStore.ts)**: Global notification store maintaining notification history, unread badge counter, and local storage persistence.
- **[components/NotificationModal.tsx](file:///c:/Users/nija/Desktop/vibe/components/NotificationModal.tsx)**: Displays activity notifications drawer. **Zero interval polling**.
- **[app/driver-dashboard.tsx](file:///c:/Users/nija/Desktop/vibe/app/driver-dashboard.tsx)**, **[app/driver-wallet.tsx](file:///c:/Users/nija/Desktop/vibe/app/driver-wallet.tsx)**, **[app/guide-wallet.tsx](file:///c:/Users/nija/Desktop/vibe/app/guide-wallet.tsx)**: Subscribed to `subscribeWalletChange()` to auto-refresh wallet balance on `wallet:updated` socket push.

---

## 🔍 5. Verification & Testing Instructions

1. **Verify Socket Connection**:
   - Open browser developer tools / Reactotron console.
   - Look for: `[SocketService] Connected to server: <socket_id>` and `[SocketService] Emitted join_room for user:<id> role:<role>`.

2. **Test Real-Time Wallet Update**:
   - Open Driver Wallet screen on phone/browser.
   - Open Admin Panel on laptop and approve a pending Top-Up request for that driver.
   - The driver's balance will instantly update on screen with **0ms latency** without refreshing or re-logging in.

3. **Test Request Popup**:
   - Open Driver Dashboard.
   - Book a cab from Tourist account.
   - The incoming ride request popup modal will appear on the Driver Dashboard in real-time.
