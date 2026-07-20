# Vibe App - Node.js + PostgreSQL Backend Setup Guide

This is the backend service for **Vibe App**, written in Node.js (Express framework) and PostgreSQL.

---

## 🚀 Quick Setup & Run Instructions

### 1. Install Dependencies
Open a terminal in the `backend` folder and run:
```bash
cd backend
npm install
```

---

### 2. Set Up PostgreSQL Database

#### Option A: Local PostgreSQL
1. Ensure PostgreSQL is installed and running.
2. Create a database named `vibe_db`:
```sql
CREATE DATABASE vibe_db;
```
3. Run the schema SQL script to set up tables (`users`, `driver_profiles`, `guide_profiles`):
```bash
psql -U postgres -d vibe_db -f schema.sql
```

#### Option B: Cloud PostgreSQL (Neon / Supabase / Render / Railway)
1. Create a PostgreSQL database instance on your cloud provider.
2. Copy the connection string (e.g. `postgres://user:password@ep-xyz.aws.neon.tech/vibe_db?sslmode=require`).
3. Set `DATABASE_URL` in your `.env` file.
4. Execute `schema.sql` query in your database dashboard SQL editor.

---

### 3. Environment Variables Config (`.env`)

Check `backend/.env` and adjust your DB credentials:
```env
PORT=5000
NODE_ENV=development

PGHOST=localhost
PGPORT=5432
PGUSER=postgres
PGPASSWORD=postgres
PGDATABASE=vibe_db

# Or use connection string:
# DATABASE_URL=postgres://user:pass@host:5432/vibe_db

JWT_SECRET=super_secret_jwt_vibe_key_2026
```

---

### 4. Start the Backend Server

```bash
npm start
# or for auto-reload development mode:
npm run dev
```

The server will start at `http://localhost:5000`.

---

## 📡 API Endpoints

### 1. Health Check
* **GET `/health`**
  * Check server and database status.

### 2. User Registration
* **POST `/api/auth/register`**
  * **Headers:** `Content-Type: application/json`
  * **Payload (Tourist / Rider):**
    ```json
    {
      "name": "Rahul Sharma",
      "phone": "9876543210",
      "email": "rahul@example.com",
      "password": "password123",
      "role": "tourist"
    }
    ```
  * **Payload (Driver):**
    ```json
    {
      "name": "Vikram Singh",
      "phone": "9876543211",
      "password": "password123",
      "role": "driver",
      "vehicle_type": "5seater",
      "vehicle_model": "Swift Dzire",
      "vehicle_number": "KA-03-MY-7788",
      "license_number": "DL-1420110012345"
    }
    ```
  * **Payload (Guide):**
    ```json
    {
      "name": "Amit Patel",
      "phone": "9876543212",
      "password": "password123",
      "role": "guide",
      "expertise": "Historical & Heritage Walks",
      "license_id": "GUIDE-9988-IN",
      "bio": "Certified guide with 7+ years experience."
    }
    ```

### 3. User Login
* **POST `/api/auth/login`**
  * **Payload:**
    ```json
    {
      "phone": "9876543210",
      "password": "password123"
    }
    ```
  * **Response:** Returns JWT `token` and user profile details.

### 4. Get User Profile
* **GET `/api/auth/me`**
  * **Headers:** `Authorization: Bearer <JWT_TOKEN>`
  * Returns logged-in user profile & role details.
