# CivicAI PMC — Demo Presentation Credentials & Access Guide

> **Note for Presentation:** All accounts listed below are active, verified, and pre-seeded in the database. You can directly log in using these credentials during your project demonstration.

---

## 1. Quick Access Credentials Table

| Role | Department / Scope | Login Email | Password | What You Can Demo |
|---|---|---|---|---|
| **Super Admin** | PMC Central Administration | `admin@civicai.com` | `Admin@12345678` | • Super Admin Console<br>• Create new Department Admins<br>• View all active admins<br>• Global system administration |
| **Dept Admin** | Roads Department | `roads.demo@civicai.local` | `Roads@Demo2026!` | • Roads department dashboard<br>• Pothole and road repair complaints<br>• Cannot access Waste complaints (403) |
| **Dept Admin** | Waste Management | `waste.demo@civicai.local` | `Waste@Demo2026!` | • Waste department dashboard<br>• Garbage collection & sanitation complaints |
| **Dept Admin** | Water Supply | `water.demo@civicai.local` | `Water@Demo2026!` | • Water pipeline & leak complaints<br>• Water contamination reports |
| **Dept Admin** | Drainage | `drainage.demo@civicai.local` | `Drainage@Demo2026!` | • Drainage & stormwater flood complaints |
| **Dept Admin** | Street Lighting | `lighting.demo@civicai.local` | `Lighting@Demo2026!` | • Streetlight outage & damaged pole issues |
| **Dept Admin** | Public Health | `health.demo@civicai.local` | `Health@Demo2026!` | • Mosquito breeding & sanitation complaints |
| **Citizen** | Public Citizen Account | `citizen@example.com` | `Citizen@12345678` | • Citizen login & reporting<br>• Blocked from accessing admin routes |

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

### Step 2: Demonstrate Super Admin Role
1. Navigate to the login page: `http://localhost:5173`.
2. Sign in with:
   - **Email:** `admin@civicai.com`
   - **Password:** `Admin@12345678`
3. **What to show the evaluator/examiner:**
   - Notice the **SUPER ADMIN** and **DEMO MODE** badges.
   - Show the **"Create Department Admin"** form:
     - Select a department (e.g. *Roads Department*).
     - Notice the demo email auto-populates (`roads.demo@civicai.local`).
     - Enter an admin name (e.g., `Amit Sharma`).
     - Click **"Create Department Admin"**.
   - Show the green success message and the **Generated Demo Credentials Card** in the browser.
   - Switch to the backend terminal window to show the **Terminal Banner**:
     ```text
     ==================================================
     CIVICAI PMC — DEMO DEPARTMENT ADMIN CREATED
     Name:               Amit Sharma
     Department:         Roads Department
     Demo Email:         roads.demo@civicai.local
     Temporary Password: <GeneratedPassword>
     Account Status:     Active
     Login Page:         http://localhost:5173
     ==================================================
     ```
   - Show the list of active department administrators below.
4. Click **Sign out**.

---

### Step 3: Demonstrate Department Admin Role & Data Isolation
1. Sign in with the Roads Department Admin:
   - **Email:** `roads.demo@civicai.local`
   - **Password:** `Roads@Demo2026!`
2. **What to show:**
   - Notice the system automatically routes to the **DEPARTMENT ADMIN** console.
   - The department badge displays **ROADS DEPARTMENT**.
   - Metric summary cards dynamically calculate counts:
     - **Total Assigned**
     - **Pending**
     - **In Progress**
     - **Resolved**
   - The complaint list displays only complaints assigned to the Roads department.
3. **Demonstrate Security & Department Isolation:**
   - Explain to the examiner that data isolation is enforced **strictly on the backend**.
   - If a Roads Admin tries to access a Waste or Water complaint ID via URL or API, the backend immediately blocks the request with **`403 Forbidden`**.
4. Click **Sign out**.

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
