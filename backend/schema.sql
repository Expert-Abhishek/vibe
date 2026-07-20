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

-- 3. Driver Profiles (Vehicle details, KYC documents & active status)
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

-- 4. Guide Profiles (Expertise, certification & documents)
CREATE TABLE IF NOT EXISTS guide_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expertise VARCHAR(255),        -- e.g. 'Historical Tours, Jungle Safari'
    license_id VARCHAR(50),       -- e.g. Certification / License ID
    bio TEXT,
    rating NUMERIC(3,2) DEFAULT 5.0,
    is_active BOOLEAN DEFAULT FALSE,
    wallet_balance NUMERIC(10,2) DEFAULT 0.00,
    photo_url TEXT,
    license_cert_url TEXT,
    id_proof_url TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
