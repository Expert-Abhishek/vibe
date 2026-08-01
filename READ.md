# 🗺️ Vibe Platform - Trip Management Guide

This document explains how **Tourists (Users)**, **Cab Drivers (Captains)**, and **Tour Guides** manage their **Active Trips**, **Scheduled (Upcoming) Trips**, and **Completed Trips** in the Vibe application.

---

## 📋 Table of Contents
1. [Overview & Trip Lifecycle](#1-overview--trip-lifecycle)
2. [Trip Status Matrix](#2-trip-status-matrix)
3. [User (Tourist) Trip Management](#3-user-tourist-trip-management)
4. [Driver (Cab Captain) Trip Management](#4-driver-cab-captain-trip-management)
5. [Guide (Local Tour Guide) Trip Management](#5-guide-local-tour-guide-trip-management)
6. [Real-Time Socket Events & OTP Security](#6-real-time-socket-events--otp-security)
7. [Technical Architecture & Source Code Reference](#7-technical-architecture--source-code-reference)

---

## 1. Overview & Trip Lifecycle

The Vibe platform handles two primary booking models:
1. **Instant On-Demand Rides (`INSTANT`)**: Direct cab or guide request for immediate pickup.
2. **Pre-Booked Scheduled Tours (`PRE_BOOKED`)**: Advance bookings created for specific future dates and times with custom checkpoints.

Every trip progresses through a secure verification lifecycle backed by dual OTPs:
- **Start OTP** (e.g. `8240`): Given by tourist to driver/guide at pickup to start the ride.
- **End OTP** (e.g. `4321`): Given by tourist to driver/guide upon reaching destination to complete the ride and initiate payment.

---

## 2. Trip Status Matrix

| Status | Description | Tourist View | Driver / Guide View |
| :--- | :--- | :--- | :--- |
| **`Pending` / `Dispatched`** | Booking created by tourist; waiting for nearby driver/guide assignment. | "Searching for verified driver/guide..." with live loader. | Incoming request notification modal with 15s countdown timer. |
| **`Accepted` / `Confirmed`** | Driver/Guide accepted the trip or pre-booked tour confirmed. | Displays assigned driver name, vehicle model/number, phone number & Start OTP. | Navigation screen to tourist pickup location. |
| **`Active` (In Progress)** | Driver verified Start OTP; trip is live. | Live map tracking, route progress, driver live location, and End OTP. | Live turn-by-turn map navigation to tourist checkpoints. |
| **`Completed`** | Driver verified End OTP at final stop; fare settled. | Summary view: total fare, payment method (UPI/Cash/Wallet), rate & review option. | Earnings credited to daily totals & wallet balance; logged into history. |
| **`Cancelled`** | Cancelled by tourist, driver, guide, or admin. | Cancelled badge with timestamp and reason. | Alert notification; driver status reset to available online. |

---

## 3. User (Tourist) Trip Management

### 🟢 Active Trips (Live / In-Progress)
- **Where to View**:
  - **Home Screen**: Banner at top of [`app/(tabs)/index.tsx`](file:///c:/Users/nija/Desktop/vibe/app/%28tabs%29/index.tsx) with assigned driver details and shortcut to live tracker.
  - **Trips Tab**: Top section of [`app/(tabs)/trips.tsx`](file:///c:/Users/nija/Desktop/vibe/app/%28tabs%29/trips.tsx).
  - **Live Tracking Screen**: [`app/trip-status.tsx`](file:///c:/Users/nija/Desktop/vibe/app/trip-status.tsx) — Shows real-time driver GPS location on map, vehicle number, phone call button, emergency SOS, Start OTP, and End OTP.
- **Key Features**:
  - **Start OTP Verification**: Shows the 4-digit Start OTP to provide to the driver.
  - **End OTP Verification**: Shows the 4-digit End OTP to finalize the ride.
  - **Live Socket Tracking**: Receives instant updates on driver position (`driver_location_update`).

### 📅 Scheduled (Upcoming) Trips
- **Where to View**:
  - **Trips Tab (`Upcoming` Filter)**: [`app/(tabs)/trips.tsx`](file:///c:/Users/nija/Desktop/vibe/app/%28tabs%29/trips.tsx) under the `Upcoming` filter.
- **Key Details**:
  - Pre-booked pickup date & time.
  - Selected itinerary checkpoints / tour plan details.
  - Financial breakdown: Advance deposit paid vs. remaining cash balance due at pickup.
  - Option to cancel pre-booked tour before dispatch time.

### ✅ Completed Trips
- **Where to View**:
  - **Trips Tab (`Completed` Filter)**: [`app/(tabs)/trips.tsx`](file:///c:/Users/nija/Desktop/vibe/app/%28tabs%29/trips.tsx).
  - **History Tab**: [`app/(tabs)/history.tsx`](file:///c:/Users/nija/Desktop/vibe/app/%28tabs%29/history.tsx).
- **Key Details**:
  - Total fare paid, payment method (UPI, Wallet, Cash).
  - Checkpoints visited and total duration.
  - Driver/Guide rating and review submission.

---

## 4. Driver (Cab Captain) Trip Management

### 🟢 Active Trips (On-Duty Navigation)
- **Where to View**:
  - **Driver Dashboard (`Active Ride` Tab)**: [`app/driver-dashboard.tsx`](file:///c:/Users/nija/Desktop/vibe/app/driver-dashboard.tsx).
  - **Driver Ride Navigation Screen**: [`src/screens/DriverRideScreen.tsx`](file:///c:/Users/nija/Desktop/vibe/src/screens/DriverRideScreen.tsx).
- **Workflow Steps**:
  1. **Request Alert**: Incoming ride request banner pops up with tourist name, pickup, drop location, estimated fare, and 15-second accept timer.
  2. **Pickup Navigation**: Driver taps `Accept Ride` (`emitAcceptRideSocket` / `acceptTripApi`) and navigates to pickup spot.
  3. **Verify Start OTP**: On arrival, driver asks tourist for Start OTP and inputs it (`verifyTripOtpApi`). Status changes to `Active`.
  4. **Trip Route Navigation**: Driver drives passenger through designated destinations/checkpoints.
  5. **Verify End OTP & Finalize**: Driver arrives at drop point, requests End OTP from tourist, verifies it, collects payment (Cash/UPI), and marks trip as finished. Earnings are automatically credited.

### 📅 Scheduled (Upcoming) Trips
- **Where to View**:
  - **Upcoming Schedules Modal**: Opened from [`app/driver-dashboard.tsx`](file:///c:/Users/nija/Desktop/vibe/app/driver-dashboard.tsx) via `fetchDriverAdvanceSchedulesApi`.
- **Key Details**:
  - List of pre-assigned advance tourist bookings for future dates.
  - Target pickup date, time, passenger details, route, and advance deposit info.

### ✅ Completed Trips & Financials
- **Where to View**:
  - **Driver History**: [`app/driver-history.tsx`](file:///c:/Users/nija/Desktop/vibe/app/driver-history.tsx).
  - **Driver Wallet**: [`app/driver-wallet.tsx`](file:///c:/Users/nija/Desktop/vibe/app/driver-wallet.tsx) / [`app/(tabs)/driver-wallet.tsx`](file:///c:/Users/nija/Desktop/vibe/app/%28tabs%29/driver-wallet.tsx).
- **Key Details**:
  - Daily & monthly total kilometers driven.
  - Detailed list of completed trips with fare breakdown.
  - Total earnings and withdrawable wallet balance (`submitWithdrawalApi`).

---

## 5. Guide (Local Tour Guide) Trip Management

### 🟢 Active Trips (Live Guided Tours)
- **Where to View**:
  - **Guide Dashboard**: [`app/guide-dashboard.tsx`](file:///c:/Users/nija/Desktop/vibe/app/guide-dashboard.tsx).
- **Workflow Steps**:
  1. **Accept Tour Request**: Guide receives guided tour booking notification.
  2. **Meet Tourist**: Guide meets tourist group at starting point.
  3. **Active Guided Tour**: Guide leads tourist through historical / sightseeing checkpoints.
  4. **Complete Tour**: Guide marks tour as completed; daily guide rate settled into guide wallet.

### 📅 Scheduled (Upcoming) Tours
- **Where to View**:
  - **Guide Dashboard (Upcoming Tab)**: [`app/guide-dashboard.tsx`](file:///c:/Users/nija/Desktop/vibe/app/guide-dashboard.tsx).
- **Key Details**:
  - Advance guided tour requests with date, time, group size, and tour itinerary.

### ✅ Completed Tours & Earnings
- **Where to View**:
  - **Guide History / Earnings**: Integrated within [`app/guide-dashboard.tsx`](file:///c:/Users/nija/Desktop/vibe/app/guide-dashboard.tsx).
- **Key Details**:
  - Past completed guided tours, tourist ratings, and total guide earnings.

---

## 6. Real-Time Socket Events & OTP Security

The platform utilizes **Socket.io** (`src/services/socketService.ts` & `backend/config/socket.js`) to provide real-time updates without polling:

| Event Name | Direction | Payload / Purpose |
| :--- | :--- | :--- |
| `trip_requested` | Server -> Driver/Guide | Broadcasts new ride request to nearby available drivers/guides. |
| `trip_accepted` | Driver/Guide -> Server -> User | Notifies user that driver/guide accepted the ride. |
| `trip_status_updated` | Server -> All | Emits state transitions (`Accepted`, `Active`, `Completed`, `Cancelled`). |
| `driver_location_update` | Driver -> Server -> User | Transmits driver GPS latitude/longitude for live map rendering. |
| `trip_completed` | Server -> All | Triggers trip completion screens and refreshes trip history lists. |

---

## 7. Technical Architecture & Source Code Reference

| Feature | Key Files | Description |
| :--- | :--- | :--- |
| **Tourist Trips Screen** | [`app/(tabs)/trips.tsx`](file:///c:/Users/nija/Desktop/vibe/app/%28tabs%29/trips.tsx) | Lists active, upcoming, and completed trips for tourists with filtering options. |
| **Tourist Live Tracking** | [`app/trip-status.tsx`](file:///c:/Users/nija/Desktop/vibe/app/trip-status.tsx) | Full-screen live map, driver details, Start/End OTP, and SOS button. |
| **Driver Dashboard** | [`app/driver-dashboard.tsx`](file:///c:/Users/nija/Desktop/vibe/app/driver-dashboard.tsx) | Driver duty toggle, request acceptance modal, trip phase tracking, and stats. |
| **Driver Live Ride** | [`src/screens/DriverRideScreen.tsx`](file:///c:/Users/nija/Desktop/vibe/src/screens/DriverRideScreen.tsx) | Turn-by-turn driver navigation interface and OTP inputs. |
| **Guide Dashboard** | [`app/guide-dashboard.tsx`](file:///c:/Users/nija/Desktop/vibe/app/guide-dashboard.tsx) | Guided tour requests, active tour manager, and guide wallet earnings. |
| **API Helpers** | [`constants/api.ts`](file:///c:/Users/nija/Desktop/vibe/constants/api.ts) | Backend API methods: `fetchActiveTripApi`, `fetchCustomerTripsApi`, `fetchDriverTripsApi`, `verifyTripOtpApi`, etc. |
| **Socket Service** | [`src/services/socketService.ts`](file:///c:/Users/nija/Desktop/vibe/src/services/socketService.ts) | Real-time WebSocket manager for instant trip updates and location streaming. |
| **Database Schema** | [`backend/schema.sql`](file:///c:/Users/nija/Desktop/vibe/backend/schema.sql) | PostgreSQL schema for `users`, `driver_profiles`, `guide_profiles`, `trips`, and `wallet_transactions`. |

---
*Created for Vibe Tour & Cab Management Platform.*
