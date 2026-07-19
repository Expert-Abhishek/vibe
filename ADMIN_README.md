# Vibe App - Admin Control Panel & Design Flow Guide

This document details the architecture, design layout, state flows, and interaction logic of the **Admin Dashboard** inside the Vibe application. This guide will help you understand all admin controls and design interfaces to expand or build out the admin portal.

---

## 1. Admin State Architecture (`admin-state.ts`)

The admin portal operates on a shared state file: [app/admin-state.ts](file:///c:/Users/nija/Desktop/vibe/app/admin-state.ts). 
Currently, it acts as an **in-memory data store** syncing configurations between the Admin, Driver, Guide, and Tourist user apps.

```
                  +--------------------------------+
                  |         admin-state.ts         |
                  +--------------------------------+
                  | - drivers list                 |
                  | - guides list                  |
                  | - customTripRequests array     |
                  | - advanceBookings array        |
                  | - instantBookingEnabled        |
                  | - vehicleRatesPerHour config   |
                  +---------------+----------------+
                                  |
         +------------------------+------------------------+
         |                                                 |
         v                                                 v
+-------------------------+                       +------------------------+
|  Admin Dashboard App    |                       |  Tourist Checkout App  |
|  (admin-dashboard.tsx)  |                       |  (plan-route / trips)  |
+-------------------------+                       +------------------------+
| - Edits vehicle hourly  |                       | - Computes prices      |
|   rates dynamically     |======================>|   using per-hour and   |
| - Sends price quotes    |                       |   day-rate vehicle     |
|   for custom trips      |                       |   configs from state   |
+-------------------------+                       +------------------------+
```

---

## 2. Admin Dashboard Layout (`admin-dashboard.tsx`)

The screen is divided into 5 specialized control tabs managed by the `activeTab` state:

```typescript
const [activeTab, setActiveTab] = useState<'dashboard' | 'plan' | 'voucher' | 'driver' | 'guide'>('dashboard');
```

### 2.1 Tab 1: Dashboard (`'dashboard'`)
* **Purpose**: Overview of active platform stats, booking fees earned, and pending tasks.
* **UI Elements**:
  * **Summary KPI Cards**: Total Trips Completed, Driver Platform Fee Collected (10%), Guide Booking Commission.
  * **Vehicle Hourly Price Manager**:
    * Rendered inputs to change standard per-hour fees for: **5 Seater**, **7 Seater SUV**, **4x4 Jeep**, and **Auto**.
    * Editing updates `adminState.vehicleRatesPerHour` values dynamically.
  * **Instant Booking Toggle**: Switch selector to enable/disable immediate matching.

### 2.2 Tab 2: Custom Trips Quoting (`'plan'`)
* **Purpose**: Quoting custom travel routes submitted by tourists using the Custom Trip Builder.
* **Quoting Flow**:
  1. A tourist builds a trip with multiple stops and submits it. It goes to `adminState.customTripRequests` as `Pending`.
  2. The Admin goes to the **Custom Trips Tab**.
  3. A list of pending requests displays checkpoints, vehicle type chosen, date, and user details.
  4. The Admin enters a custom price (e.g. `5000`) in the input box and clicks **"Send Quote"**.
  5. The request status is set to `'Quoted'` and the tourist receives the price in their active trips dashboard to confirm.

```
Tourist builds route  --->  Admin inputs price  ---> Status set to "Quoted" ---> Tourist confirms payment
 (Status: Pending)            in Quoting panel
```

### 2.3 Tab 3: Vouchers Manager (`'voucher'`)
* **Purpose**: Manage active promotion codes.
* **UI Elements**:
  * Form inputs to create a voucher: **Voucher Code** (text input), **Description**, **Discount Type** (Flat or Percent), and **Discount Value**.
  * Grid list of current active vouchers.
  * **Edit/Delete Actions**: Clicking edit populates the form to update existing properties; clicking delete clears it from the active database array.

### 2.4 Tab 4: Driver Management (`'driver'`)
* **Purpose**: Monitor driver activity and approve KYC documentation.
* **KYC States**: `Active` (Verified) | `Inactive` | `Pending KYC` | `KYC Declined`.
* **Flow**:
  * Driver signs up and uploads driving license/details (status goes to `Pending KYC`).
  * Admin views listing row on driver tab:
    * Click **"Approve KYC"**: Sets driver status to `'Active'` (allowing them to receive rides).
    * Click **"Decline KYC"**: Sets driver status to `'KYC Declined'`.
    * Click **"Deactivate"**: Blocks active driver by setting status to `'Inactive'`.

### 2.5 Tab 5: Guide Management (`'guide'`)
* **Purpose**: Monitor tourist guide registry.
* **UI Elements**:
  * Shows guide profile details, expertise highlights, and current approval status.
  * Same KYC controls block (**"Approve KYC"** / **"Decline"**) to toggle guide onboarding.

---

## 3. UI Design Guide for Admin Panel

When designing or updating the Admin layout:
1. **Theme Harmonization**: Use the Amber (`#F5C518` / `colors.amber`) for active states, warnings, and highlighting key metrics.
2. **Contrast Ratio**: For charts and status tags, use translucent background containers with high-contrast text color pairs (e.g. `rgba(16, 185, 129, 0.1)` background with solid green `#10B981` text for verified status).
3. **Data Scannability**: Ensure table columns align cleanly. Use tabular cards with clear separator borders rather than tightly packed grid lines.
4. **Platform Optimization**: Admin operations can contain high volumes of text inputs and charts. Use clean vertical ScrollViews with absolute headers that don't shift when software keyboard pops up on mobile devices.
