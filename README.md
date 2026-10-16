# لقاء — 2025 Saqafees Meet
### Full-Stack Event Registration, QR Pass & Attendance Management System

A production-ready full-stack event registration and QR pass management web application built with **Next.js App Router**, **TypeScript**, **Tailwind CSS**, and **MongoDB**. Designed with a prestigious aesthetic (Deep Navy, Subtle Gold, and Restrained Green) supporting **Arabic (RTL)** and **Malayalam** scripts.

---

## 1. Event Information

- **Event Name**: لقاء (Liqaa')
- **Subtitle**: 2025 Saqafees Meet
- **Date**: Saturday, 21 November 2026
- **Time**: 10:00 AM – 2:00 PM IST
- **Timezone**: `Asia/Kolkata`
- **Venue**: Markaz, Calicut, Kerala

---

## 2. Key Features

### 🏛️ Public Portal & Registration
- **Responsive Landing Page**: Hero banner with Arabic event title, event schedule, instructions, venue directions, and contact information.
- **Strict 4-Field Registration Form**:
  1. **Name** (Trimmed, 2–100 characters)
  2. **Place** (Trimmed, 2–100 characters)
  3. **Mobile Number** (Validated with Indian 10-digit and international E.164 normalization)
  4. **Shuhba (Class Department)** (Strict enum of 8 departments):
     - `HADEES`
     - `THAFSEER`
     - `SHAREEA`
     - `ILUMU NAFS`
     - `IMUL IDARA`
     - `THAKHASSUS`
     - `WIRAS`
     - `LUGA`
- **Duplicate Prevention**: Database-level unique index on normalized mobile numbers. If an attendee registers twice, they are given a direct link to retrieve their existing pass.
- **Pass Retrieval**: Attendees can look up and re-download their pass anytime by entering their registered mobile number.

### 🎫 QR Pass & Verification
- **Unique Registration ID**: Human-readable identifier format (e.g. `LQM-2026-A83F72`).
- **Cryptographic Security**: 32-byte cryptographic verification token stored as a SHA-256 hash in MongoDB. The participant's phone number or personal details are **never** exposed in the raw QR code.
- **High-Resolution QR Code**: Downloadable as an 800x800 high-res PNG image.
- **Downloadable PDF Pass**: Vector-rendered A5 pass (`jspdf`) featuring Navy & Gold aesthetics, participant badge, department, venue details, high-res QR code, and gate instructions.
- **Printable Browser Pass**: Clean, print-styled card (`/pass/[id]`) optimized for standard paper and mobile printing.

### 📅 Calendar Integration
- **Add to Google Calendar**: Direct URL pre-filled with event title, Asia/Kolkata timezone, Markaz venue, and pass reminder.
- **Downloadable `.ics` File**: RFC 5545 compliant calendar reminder file for Apple Calendar, Outlook, and Android with dual reminder alarms:
  - 1 day (24 hours) prior
  - 1 hour prior

### 💬 WhatsApp Cloud API Integration
- **Automated Confirmation**: Sends the official personalized Malayalam welcome and registration confirmation upon database commit.
- **Dev Simulation Mode**: When credentials are not yet configured in `.env.local`, the application automatically activates **Simulation Mode**, logging the message status as `simulated` in `NotificationLog` without failing registrations.
- **Webhook Endpoint**: `POST /api/webhooks/whatsapp` processes delivery, read, and failure statuses securely.

### 🛡️ Admin Dashboard & Live QR Scanner
- **Secure Authentication**: Password hashing with `bcryptjs`, tamper-proof JWT session cookies via `jose`, and login brute-force rate limiting.
- **Real-Time Overview Metrics**:
  - Total registrations
  - Checked-in vs Pending attendance counts
  - Shuhba-wise registration and check-in distribution
  - WhatsApp notification delivery status breakdown
- **Participant Management**:
  - Search by name, registration ID, place, or mobile number
  - Filter by department (Shuhba) and check-in status
  - Edit attendee details with an authorized audit log
  - Download individual QR PNGs and PDF passes
  - One-click check-in toggle
  - UTF-8 BOM CSV Export for Excel and Malayalam text compatibility
- **Mobile-First QR Camera Scanner**:
  - Scans attendee QR codes using the device camera (`html5-qrcode`)
  - **Atomic Check-in**: Uses MongoDB `$set` with condition `checkInStatus: false` to prevent concurrent duplicate scans
  - **Duplicate Alert**: Displays an instant "Already Checked In" warning with check-in timestamp and staff name
  - **Manual ID Fallback**: Allows typing the Registration ID if camera permission is denied
  - **Admin Override**: Authorized administrators can force an override check-in for genuine corrections

---

## 3. Technology Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS v4
- **Database**: MongoDB with Mongoose 9
- **Validation**: Zod
- **QR Code**: `qrcode` (PNG Buffer & Data URL)
- **PDF Generation**: `jspdf`
- **Authentication**: Secure HTTP-only cookies with `jose` (HS256) and `bcryptjs`
- **Camera Scanning**: `html5-qrcode`

---

## 4. Setup & Installation

### Prerequisites
- Node.js 20 or higher (Tested with Node.js 24)
- MongoDB instance (Local MongoDB or MongoDB Atlas)

### Step 1: Clone and Install
```bash
git clone <repository-url>
cd "saqafees meet"
npm install
```

### Step 2: Environment Configuration
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

Configure your environment variables in `.env.local`:
```env
# MongoDB Connection URI (Atlas or Local)
MONGODB_URI=mongodb://127.0.0.1:27017/saqafees-meet

# Application URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Authentication Secret (min 32 characters)
AUTH_SECRET=saqafees_meet_super_secret_jwt_key_2026_at_least_32_chars_long

# Default Initial Administrator Credentials
ADMIN_DEFAULT_EMAIL=admin@saqafees.org
ADMIN_DEFAULT_PASSWORD=Admin@Saqafees2026!
ADMIN_DEFAULT_NAME="Saqafees Administrator"

# WhatsApp Business Cloud API (Optional - runs in Simulation Mode if omitted)
WHATSAPP_ENABLED=false
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_BUSINESS_ACCOUNT_ID=
WHATSAPP_VERIFY_TOKEN=saqafees_webhook_verify_token_2026
```

### Step 3: Run the Automated Tests
```bash
npm test
```
Runs 13 unit and integration tests covering phone normalization, Zod validation, cryptographic tokens, and RFC 5545 calendar generators.

### Step 4: Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### Step 5: Build for Production
```bash
npm run build
npm start
```

---

## 5. Admin Access & Seed Account

The application automatically seeds a default administrator account upon the first login attempt if the database contains zero admin users:

- **URL**: [http://localhost:3000/admin/login](http://localhost:3000/admin/login)
- **Default Email**: `admin@saqafees.org`
- **Default Password**: `Admin@Saqafees2026!`

You can modify these default values in `.env.local` prior to first launch.

---

## 6. API Route Contracts

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/registrations` | Register a new attendee (validates Zod, checks duplicate mobile, dispatches notification) |
| `POST` | `/api/registrations/lookup` | Look up a registration ID and pass token by mobile number |
| `GET` | `/api/registrations/[id]/qr` | Download high-resolution QR PNG |
| `GET` | `/api/registrations/[id]/pass` | Download vector PDF registration pass |
| `GET` | `/api/calendar/ics` | Download standards-compliant `.ics` calendar reminder file |
| `GET` | `/api/verify/[token]` | Verify registration pass validity (public / staff view) |
| `POST` | `/api/check-in` | Perform authorized atomic check-in (requires staff session) |
| `POST` | `/api/admin/auth/login` | Staff / Admin authentication |
| `POST` | `/api/admin/auth/logout` | Terminate session cookie |
| `GET` | `/api/admin/stats` | Aggregated dashboard metrics, Shuhba breakdown, WhatsApp stats |
| `GET` | `/api/admin/participants` | Paginated attendee list with search & filters |
| `PATCH` | `/api/admin/participants/[id]` | Edit attendee details or toggle check-in |
| `DELETE` | `/api/admin/participants/[id]` | Delete attendee (Admin role only) |
| `GET` | `/api/admin/export` | Download CSV export of participants |
| `GET/PATCH` | `/api/admin/settings` | Retrieve or update event settings & registration open status |
| `GET/POST` | `/api/webhooks/whatsapp` | Meta WhatsApp Cloud API verification and delivery webhooks |

---

## 7. License

Proprietary — Designed & Built for **لقاء — 2025 Saqafees Meet**.
