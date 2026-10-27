# CivicAI PMC — Demo Presentation Credentials & Access Guide

> **Note for Presentation:** All accounts listed below are active, verified, and pre-seeded in the database. You can directly log in using these credentials during your project demonstration.

---

## 1. Quick Access Credentials Table

| Role | Department / Grievance Category (मराठी) | Login Email | Password | What You Can Demo |
|---|---|---|---|---|
| **Super Admin** | PMC Central Administration & Multi-Domain Triage | `admin@civicai.com` | `Admin@12345678` | • Central Super Admin Dashboard<br>• **Multi-Domain Complaint Triage** (e.g. Road + Water)<br>• Assign / Reassign Complaints to Departments<br>• Manage all Department Admins |
| **Dept Admin** | Roads & Potholes (खड्डे आणि रस्ते) | `roads.demo@civicai.local` | `Roads@Demo2026!` | • Roads & Potholes dashboard<br>• Asphalt potholes, resurfacing, road cracks |
| **Dept Admin** | Solid Waste & Garbage (कचरा व्यवस्थापन) | `waste.demo@civicai.local` | `Waste@Demo2026!` | • Waste department dashboard<br>• Garbage accumulation, overflowing bins, uncollected waste |
| **Dept Admin** | Water Supply (पाणी पुरवठा) | `water.demo@civicai.local` | `Water@Demo2026!` | • Water department dashboard<br>• Pipeline leakages, low water pressure, contamination |
| **Dept Admin** | Drainage & Sewerage (ड्रेनेज आणि सांडपाणी) | `drainage.demo@civicai.local` | `Drainage@Demo2026!` | • Drainage & Sewerage dashboard<br>• Clogged storm drains, sewer overflow, gutter blockage |
| **Dept Admin** | Street Lighting & Electrical (पथदिवे) | `lighting.demo@civicai.local` | `Lighting@Demo2026!` | • Street lighting dashboard<br>• Non-functional streetlights, broken poles, hanging wires |
| **Dept Admin** | Health & Sanitation (आरोग्य आणि स्वच्छता) | `health.demo@civicai.local` | `Health@Demo2026!` | • Public Health dashboard<br>• Mosquito breeding, public toilet hygiene, pest control |
| **Dept Admin** | Garden & Tree Trimming (उद्यान आणि झाडे) | `garden.demo@civicai.local` | `Garden@Demo2026!` | • Garden & Tree Trimming dashboard<br>• Dangerous branches, fallen trees, park maintenance |
| **Dept Admin** | Encroachment (अतिक्रमण) | `encroach.demo@civicai.local` | `Encroach@Demo2026!` | • Encroachment dashboard<br>• Footpath encroachment, illegal stalls, unauthorized structures |
| **Dept Admin** | Traffic & Signage (वाहतूक आणि फलक) | `traffic.demo@civicai.local` | `Traffic@Demo2026!` | • Traffic & Signage dashboard<br>• Damaged road signs, signal malfunctions, illegal hoardings |
| **Dept Admin** | Other Civic Grievance (इतर नागरी तक्रार) | `general.demo@civicai.local` | `General@Demo2026!` | • General Administration dashboard<br>• Miscellaneous civic grievances & citizen welfare |
| **Citizen** | Public Citizen Account | `citizen@example.com` | `Citizen@12345678` | • Citizen login & reporting<br>• Instant AI issue detection<br>• Live tracking & notifications |

---

## 2. Recommended Presentation Walkthrough (Step-by-Step)

### Step 1: Start Services
```bash
# Terminal 1 — Backend (Port 5000)
cd apps/backend
pnpm dev

# Terminal 2 — Frontend (Port 5173)
cd apps/frontend
npm start
# Press 'w' in terminal to open the web view at http://localhost:5173
```

---

### Step 2: Demonstrate Super Admin Role & Terminal OTP Creation
1. Navigate to the login page: `http://localhost:5173`.
2. Sign in with:
   - **Email:** `admin@civicai.com`
   - **Password:** `Admin@12345678`
3. **What to show the evaluator/examiner:**
   - Notice the **SUPER ADMIN** and **DEMO MODE** badges.
   - Show the **"Create Department Admin"** form:
     - Select a department (e.g. *Roads Department*).
     - Enter an admin name (e.g., `Amit Sharma`).
     - Enter/customize demo email (e.g., `roads.admin@civicai.local`).
     - Click **"Create Department Admin"**.
   - Show the green success message and the **Generated Demo Credentials Card** in the browser displaying:
     - Temporary Password
     - **Confirmation OTP** (with a badge indicating it was dispatched to the backend terminal).
   - Switch to the backend terminal window to show the **High-Visibility Terminal OTP Banner**:
     ```text
     ======================================================================
     🏛️  CIVICAI PMC — NEW DEPARTMENT ADMIN CONFIRMATION OTP
     Admin Name:        Amit Sharma
     Email Address:     roads.admin@civicai.local
     Department:        Roads Department
     ONE-TIME PASSWORD: [ 782419 ]  (Valid for 10 minutes)
     Instruction:       Enter this OTP on initial login to confirm and verify the account.
     Status:            Awaiting Terminal OTP Entry in Web Console
     ======================================================================
     ```
   - Show the list of active department administrators below.
4. Click **Sign out**.

---

### Step 3: Demonstrate Department Admin 2-Step Terminal OTP Authentication
1. On the login screen (`http://localhost:5173`), sign in with the Department Admin:
   - **Email:** `roads.demo@civicai.local` (or newly created admin email)
   - **Password:** `Roads@Demo2026!`
2. **Terminal OTP Verification Challenge:**
   - As soon as the credentials are submitted, the backend detects a Department Admin login.
   - The system immediately dispatches a security OTP and outputs a clean banner in the **backend terminal**:
     ```text
     ======================================================================
     🏛️  CIVICAI PMC — DEPARTMENT ADMIN OTP SECURITY VERIFICATION
     Admin Name:        Roads Department Admin
     Email Address:     roads.demo@civicai.local
     Department:        Roads Department
     ONE-TIME PASSWORD: [ 491028 ]  (Valid for 10 minutes)
     Instruction:       Enter this OTP in the login screen to authenticate.
     Status:            Awaiting Terminal OTP Entry in Web Console
     ======================================================================
     ```
   - The login page smoothly transitions to the **"Two-Factor Security Verification"** screen with:
     - Notice informing the user that the OTP was sent to the backend terminal.
     - 6-digit OTP input field.
     - "Resend Code to Terminal" button (if a new code is needed).
     - "Back to Credentials" button.
3. Enter the 6-digit OTP from the terminal into the login screen and click **"Confirm & Log In"**.
4. The terminal prints confirmation:
   ```text
   ======================================================================
   ✅ CIVICAI PMC — DEPARTMENT ADMIN OTP VERIFIED & CONFIRMED
   Admin Email:        roads.demo@civicai.local
   Account Status:     ACTIVE (Confirmed via Terminal OTP)
   Access Granted:     Department Dashboard Unlocked
   ======================================================================
   ```
5. **Dashboard Access & Department Data Isolation:**
   - Notice the system automatically unlocks and routes to the **DEPARTMENT ADMIN** console.
   - The department badge displays **ROADS DEPARTMENT**.
   - Metric summary cards dynamically calculate counts (Total, Pending, In Progress, Resolved).
   - The complaint list displays only complaints assigned to the Roads department.
6. **Demonstrate Security & Department Isolation:**
   - Explain to the examiner that data isolation is enforced **strictly on the backend**.
   - If a Roads Admin tries to access a Waste or Water complaint ID via URL or API, the backend immediately blocks the request with **`403 Forbidden`**.
7. Click **Sign out**.

---

### Step 4: Demonstrate Waste Management Admin
1. Sign in with:
   - **Email:** `waste.demo@civicai.local`
   - **Password:** `Waste@Demo2026!`
2. **What to show:**
   - The console dynamically reflects **WASTE MANAGEMENT**.
   - Notice the complaint list only shows sanitation and garbage collection complaints.
   - This proves that department administrators are completely isolated from each other.

---

### Step 5: (Optional) Re-seeding the Database
If you ever want to re-verify or reset the demo accounts before presentation day:
```bash
cd apps/backend
pnpm db:seed
```
The script is **100% idempotent**—it checks existing accounts and departments, preserves existing data, and reports that all demo accounts exist with zero errors.
