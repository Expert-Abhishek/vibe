# Vibe App - Backend Selection & Integration Guide

This guide outlines the system architecture, database schemas, API contracts, real-time communication events, and comparative backend technologies for the **Vibe App**. 

---

## 1. Multi-Role System Architecture

Vibe is a multi-role transportation and tourism platform. The client-side application handles four distinct interfaces:
1. **Tourist/Rider**: Standard passenger/client who books cabs, hires guides, buys jungle safari passes, and builds custom trip itineraries.
2. **Driver**: Receives nearby booking offers, updates active ride statuses, and views wallet payouts.
3. **Guide**: Receives pre-booking requests for historical and heritage tours, accepts/declines, and views earnings.
4. **Admin**: Toggles global state configs (e.g., Instant Booking, Vehicle Hourly Rates) and approves Driver/Guide KYC applications.

```
+------------------+     REST / WebSockets     +-------------------+
|  Tourist/Rider   |<==========================>|                   |
+------------------+                            |                   |
|      Driver      |<==========================>|  Backend Service  |
+------------------+                            |                   |
|      Guide       |<==========================>|                   |
+------------------+                            +---------+---------+
|      Admin       |<==========================>|         |
+------------------+                                      v
                                                +---------+---------+
                                                |  Relational DB    |
                                                |  (PostgreSQL/etc) |
                                                +-------------------+
```

---

## 2. Database Schema (SQL DDL Migration Script)

Below is the standard PostgreSQL schema definition to transition from the client-side memory mock (`admin-state.ts`) to a production relational database.

```sql
-- Enable PostGIS extension for geo-spatial location matching if using PostgreSQL
CREATE EXTENSION IF NOT EXISTS postgis;

-- 1. Users Table (Core authentication entity)
CREATE TYPE user_role AS ENUM ('tourist', 'driver', 'guide', 'admin');
CREATE TYPE kyc_status AS ENUM ('Pending KYC', 'Active', 'Inactive', 'KYC Declined');

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone VARCHAR(15) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    username VARCHAR(50) UNIQUE,
    role user_role NOT NULL DEFAULT 'tourist',
    status kyc_status NOT NULL DEFAULT 'Active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Driver Profiles (Vehicle details and location)
CREATE TABLE driver_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    vehicle_type VARCHAR(50) NOT NULL, -- '5seater', '7seater', '4x4jeep', 'auto'
    vehicle_model VARCHAR(100),       -- 'Mahindra Thar', 'Swift Dzire'
    vehicle_number VARCHAR(20) UNIQUE, -- 'KA-03-MY-7788'
    is_active BOOLEAN DEFAULT FALSE,
    rating NUMERIC(3,2) DEFAULT 5.0,
    current_lat NUMERIC(9,6),
    current_lng NUMERIC(9,6),
    geom GEOMETRY(Point, 4326),        -- Spatial index field
    wallet_balance NUMERIC(10,2) DEFAULT 0.00,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_driver_geom ON driver_profiles USING gist(geom);

-- 3. Guide Profiles (Expertise and certification)
CREATE TABLE guide_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expertise VARCHAR(255) NOT NULL,   -- 'History & Heritage Walks', 'Food tours'
    rating NUMERIC(3,2) DEFAULT 5.0,
    is_active BOOLEAN DEFAULT FALSE,
    bio TEXT,
    wallet_balance NUMERIC(10,2) DEFAULT 0.00,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Bookings & Rides (Core transaction log)
CREATE TYPE booking_type_enum AS ENUM ('cab', 'guide', 'custom_trip', 'plan');
CREATE TYPE booking_status AS ENUM ('Pending', 'Accepted', 'Cancelled', 'Completed');
CREATE TYPE payment_mode_enum AS ENUM ('UPI', 'Cash');

CREATE TABLE bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tourist_id UUID NOT NULL REFERENCES users(id),
    type booking_type_enum NOT NULL,
    status booking_status NOT NULL DEFAULT 'Pending',
    pickup_name VARCHAR(255) NOT NULL,
    pickup_lat NUMERIC(9,6) NOT NULL,
    pickup_lng NUMERIC(9,6) NOT NULL,
    drop_name VARCHAR(255) NOT NULL,
    drop_lat NUMERIC(9,6) NOT NULL,
    drop_lng NUMERIC(9,6) NOT NULL,
    stops JSONB DEFAULT '[]'::jsonb,   -- Array of stop nodes
    price NUMERIC(10,2) NOT NULL,
    payment_mode payment_mode_enum NOT NULL DEFAULT 'UPI',
    passenger_count INT DEFAULT 1,
    driver_id UUID REFERENCES users(id), -- Assigned driver
    guide_id UUID REFERENCES users(id),  -- Assigned guide
    otp_code VARCHAR(6),                -- Trip verification OTP
    scheduled_at TIMESTAMP WITH TIME ZONE, -- If pre-booked advance slot
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Custom Trip Requests (Quoting & builder history)
CREATE TYPE custom_trip_status AS ENUM ('Pending', 'Quoted', 'Booked');

CREATE TABLE custom_trip_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tourist_id UUID NOT NULL REFERENCES users(id),
    checkpoints JSONB NOT NULL,        -- Coordinates and names of list
    status custom_trip_status NOT NULL DEFAULT 'Pending',
    vehicle VARCHAR(50) NOT NULL,
    quoted_price NUMERIC(10,2),
    booking_type VARCHAR(20) NOT NULL, -- 'spot', 'prebook'
    scheduled_date DATE,
    scheduled_time VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. System Settings
CREATE TABLE system_settings (
    key VARCHAR(50) PRIMARY KEY,
    value JSONB NOT NULL
);

INSERT INTO system_settings (key, value) VALUES 
('instant_booking_enabled', 'false'::jsonb),
('vehicle_rates_per_hour', '{"5seater":150, "7seater":220, "4x4jeep":350, "auto":100}'::jsonb),
('vehicle_rates_per_day', '{"5seater":1800, "7seater":2600, "4x4jeep":4200, "auto":1200}'::jsonb);
```

---

## 3. Core REST API Contract Endpoints

### 3.1 Authentication (OTP Flow)
* **POST `/api/auth/send-otp`**
  * Body: `{ "phone": "+919876543210" }`
  * Response: `{ "success": true, "message": "OTP Sent Successfully" }`
* **POST `/api/auth/verify-otp`**
  * Body: `{ "phone": "+919876543210", "otp": "4892" }`
  * Response: `{ "token": "jwt_token...", "user": { "id": "uuid", "role": "tourist", "status": "Active" } }`
* **POST `/api/auth/register-profile`**
  * Headers: `Authorization: Bearer <jwt>`
  * Body: `{ "name": "Suresh Kumar", "role": "driver", "vehicle_type": "5seater", "vehicle_number": "KA-03-MY-7788" }`

### 3.2 Bookings & Rides (Tourist)
* **POST `/api/bookings/create`**
  * Body: 
    ```json
    {
      "type": "cab",
      "pickup_name": "Bengaluru Palace",
      "pickup_lat": 12.9982,
      "pickup_lng": 77.5920,
      "drop_name": "Majestic Railway Station",
      "drop_lat": 12.9784,
      "drop_lng": 77.5694,
      "stops": [],
      "price": 340,
      "payment_mode": "UPI",
      "passenger_count": 2,
      "scheduled_at": "2026-07-20T10:00:00.000Z"
    }
    ```
  * Response: `{ "success": true, "booking_id": "booking_uuid", "status": "Pending" }`

### 3.3 Custom Trips (Tourist & Admin)
* **POST `/api/custom-trips/request`**
  * Body: `{ "checkpoints": [...], "vehicle": "4x4jeep", "booking_type": "prebook", "date": "2026-07-20", "time": "08:00 AM" }`
  * Response: `{ "success": true, "request_id": "req_uuid", "status": "Pending" }`
* **GET `/api/admin/custom-trips`** *(Admin)*: Lists all pending custom trips requiring a custom price quote.
* **POST `/api/admin/custom-trips/quote`** *(Admin)*: Sets a quote price.
  * Body: `{ "request_id": "req_uuid", "quoted_price": 5200 }`

---

## 4. Real-Time WebSocket Events Matrix

For live ride matching and notifications, a real-time event-driven connection is required.

| Event Name | Direction | Payload | Description |
| :--- | :--- | :--- | :--- |
| `ride_request_created` | Server ➔ Drivers | `{ booking_id, pickup, drop, price }` | Broadcasts new ride offers to active drivers in range. |
| `ride_accept` | Client (Driver) ➔ Server | `{ booking_id, driver_id }` | Triggered when a driver accepts an offer. |
| `ride_matched` | Server ➔ Client (Tourist) | `{ booking_id, driver: { name, phone, vehicle_number, otp } }` | Updates the matching loading UI with the driver details. |
| `location_update` | Client (Driver) ➔ Server | `{ driver_id, lat, lng }` | Streams active GPS telemetry for map route plotting. |
| `trip_started` | Client (Driver) ➔ Server | `{ booking_id, otp }` | Starts ride tracking once passenger enters the matching OTP. |
| `trip_completed` | Client (Driver) ➔ Server | `{ booking_id }` | Ends the ride, updates transaction wallet balance. |

---

## 5. Technology Stack Selection Options

Depending on the scale of your launch and database preferences, choose one of the three backend models below:

### Option A: Supabase (Highly Recommended)
* **Why**: Supabase is an open-source Firebase alternative powered by PostgreSQL. It comes with built-in JWT authentication, auto-generated REST APIs, and **Realtime database listeners** out-of-the-box.
* **Geospatial Queries**: Built-in support for PostGIS means you can fetch drivers in radius with a simple SQL function:
  ```sql
  CREATE OR REPLACE FUNCTION get_nearby_drivers(lat double precision, lng double precision, radius_meters double precision)
  RETURNS TABLE (driver_id uuid, name text, distance double precision) AS $$
  BEGIN
    RETURN QUERY
    SELECT d.user_id, u.name, ST_Distance(d.geom, ST_SetSRID(ST_Point(lng, lat), 4326)) as distance
    FROM driver_profiles d
    JOIN users u ON u.id = d.user_id
    WHERE d.is_active = true
      AND ST_DWithin(d.geom, ST_SetSRID(ST_Point(lng, lat), 4326), radius_meters)
    ORDER BY distance;
  END;
  $$ LANGUAGE plpgsql;
  ```
* **Realtime Listener Code in Expo client**:
  ```typescript
  import { createClient } from '@supabase/supabase-js';
  const supabase = createClient('URL', 'KEY');

  // Listen to bookings update (e.g. driver assigned, trip completed)
  const bookingChannel = supabase
    .channel('public:bookings')
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'bookings', filter: `id=eq.${myBookingId}` }, (payload) => {
      console.log('Booking Update:', payload.new);
      if (payload.new.status === 'Accepted') {
        // Driver accepted!
      }
    })
    .subscribe();
  ```

### Option B: Node.js (TypeScript) + Express + PostgreSQL + Socket.io
* **Why**: Best choice for full control over custom business matching logic. Easy to share types between React Native client and server using a shared monorepo configuration.
* **Architecture**:
  * **REST API Layer**: Standard Express Router for Authentication, Wallet entries, History logs.
  * **Realtime Layer**: Socket.io Server instance for location tracking and match notifications.
  * **ORM**: Prisma or Drizzle ORM for robust migrations.

### Option C: Firebase Firestore + Cloud Functions
* **Why**: Best for serverless, rapid prototyping. Data structures sync dynamically to JSON document nodes.
* **Realtime Database**: Firestore `.onSnapshot()` listens to status changes immediately.
* **Background Driver Assigning**: Triggered using Cloud Function Pub/Sub schedules.

---

## 6. Recommended Transition Plan

1. **Phase 1: API Setup**: Deploy a Supabase project instance (Free Tier). Add the DDL script above via the SQL Editor panel.
2. **Phase 2: Authentication**: Switch the client-side signup flow from simple `admin-state.ts` pushes to using standard `supabase.auth.signInWithOtp()`.
3. **Phase 3: Bookings Database integration**: Replace in-memory arrays inside `book-cab.tsx`, `make-trip.tsx`, and `plan-route.tsx` with standard insert commands (`supabase.from('bookings').insert(...)`).
4. **Phase 4: Real-time Live Matching**: Implement the `get_nearby_drivers` SQL query to assign drivers dynamically instead of mock timeouts.
