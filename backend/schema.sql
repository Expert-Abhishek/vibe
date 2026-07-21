-- Enable UUID extension if available
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Create Enums for Roles and KYC Status
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('tourist', 'driver', 'guide', 'admin');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE kyc_status AS ENUM ('Pending KYC', 'Active', 'Inactive', 'KYC Declined');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Users Table (Core authentication entity)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(15) UNIQUE NOT NULL,
    email VARCHAR(120) UNIQUE,
    password VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'tourist',
    status kyc_status NOT NULL DEFAULT 'Active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for fast user logins by phone or email
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- 3. Driver Profiles (Vehicle details, KYC documents, pricing rates & active status)
CREATE TABLE IF NOT EXISTS driver_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    vehicle_type VARCHAR(50),      -- e.g. '5seater', '7seater', '4x4jeep', 'auto'
    vehicle_model VARCHAR(100),    -- e.g. 'Mahindra Thar', 'Swift Dzire'
    vehicle_number VARCHAR(30),   -- e.g. 'KA-03-MY-7788'
    license_number VARCHAR(50),
    is_active BOOLEAN DEFAULT FALSE,
    rating NUMERIC(3,2) DEFAULT 5.0,
    wallet_balance NUMERIC(10,2) DEFAULT 0.00,
    daily_rate NUMERIC(10,2) DEFAULT 2500.00,
    hourly_addon_rate NUMERIC(10,2) DEFAULT 200.00,
    photo_url TEXT,
    rc_url TEXT,
    dl_url TEXT,
    insurance_url TEXT,
    aadhar_url TEXT,
    car_front_url TEXT,
    car_left_url TEXT,
    car_right_url TEXT,
    car_back_url TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Guide Profiles (Expertise, certification, pricing rate & documents)
CREATE TABLE IF NOT EXISTS guide_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expertise VARCHAR(255),        -- e.g. 'Historical Tours, Jungle Safari'
    license_id VARCHAR(50),       -- e.g. Certification / License ID
    bio TEXT,
    rating NUMERIC(3,2) DEFAULT 5.0,
    is_active BOOLEAN DEFAULT FALSE,
    wallet_balance NUMERIC(10,2) DEFAULT 0.00,
    daily_rate NUMERIC(10,2) DEFAULT 2000.00,
    photo_url TEXT,
    license_cert_url TEXT,
    id_proof_url TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Destinations Master Table (Destination = Checkpoint = Tourist Place)
CREATE TABLE IF NOT EXISTS destinations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    location VARCHAR(255),
    description TEXT,
    images TEXT[] DEFAULT '{}',
    videos TEXT[] DEFAULT '{}',
    latitude NUMERIC(10,6) DEFAULT 15.335000,
    longitude NUMERIC(10,6) DEFAULT 76.460000,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);


-- 6. Plans / Tour Packages Table
CREATE TABLE IF NOT EXISTS plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    km NUMERIC(10,2) DEFAULT 0.00,
    duration VARCHAR(100) NOT NULL DEFAULT '1 Day',
    price NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Plan Checkpoints (Junction Table: Plan <-> Destination/Tourist Place)
CREATE TABLE IF NOT EXISTS plan_checkpoints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
    destination_id UUID NOT NULL REFERENCES destinations(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT TRUE,
    order_index INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_plan_destination UNIQUE (plan_id, destination_id)
);

-- 8. Trips / Bookings Table
CREATE TABLE IF NOT EXISTS trips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_type VARCHAR(50) NOT NULL DEFAULT 'custom_trip', -- 'custom_trip', 'plan_package', 'cab', 'guide'
    title VARCHAR(255) NOT NULL,
    customer_id UUID REFERENCES users(id) ON DELETE SET NULL,
    customer_name VARCHAR(255) NOT NULL,
    driver_or_guide_name VARCHAR(255),
    plan_id UUID REFERENCES plans(id) ON DELETE SET NULL,
    destination_ids TEXT[] DEFAULT '{}',
    amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    payment_mode VARCHAR(50) DEFAULT 'UPI', -- 'UPI', 'Cash', 'Card'
    status VARCHAR(50) DEFAULT 'Completed', -- 'Pending', 'Active', 'Completed', 'Cancelled'
    duration_hours NUMERIC(5,2) DEFAULT 8.00,
    extra_hours NUMERIC(5,2) DEFAULT 0.00,
    addon_charge NUMERIC(10,2) DEFAULT 0.00,
    rating INT DEFAULT 5,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);



