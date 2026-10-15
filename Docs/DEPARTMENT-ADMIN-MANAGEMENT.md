# CivicAI PMC — Department Admin Management (Demo Mode)

## Overview
The **Department Admin Management** system empowers the Super Admin to provision and manage municipal department administrators (e.g., Roads, Waste Management, Water, Drainage, Street Lighting, Public Health) within the Pune Municipal Corporation (PMC) platform.

In **Demo Mode** (`Option A`), the system generates deterministic demo login credentials for evaluation and academic presentation without requiring third-party SMTP or real email infrastructure.

---

## Key Features

1. **Super Admin Management Console**:
   - Super Admin can select from the 6 municipal departments.
   - Enter admin's name and confirm demo email (e.g., `roads.demo@civicai.local`).
   - Automatically generates a secure random temporary password.
   - Displays temporary credentials in the Super Admin interface and prints a formatted credential card to the backend development terminal.

2. **Terminal Credential Output (Demo Mode)**:
   In development/demo mode (`CIVICAI_DEMO_MODE=true` or `NODE_ENV !== "production"`), credentials appear in the terminal upon creation:
   ```text
   ==================================================
   CIVICAI PMC — DEMO DEPARTMENT ADMIN CREATED
   Name:               Roads Department Admin
   Department:         Roads Department
   Demo Email:         roads.demo@civicai.local
   Temporary Password: <GeneratedPassword>
   Account Status:     Active
   Login Page:         http://localhost:5173
   ==================================================
   ```

3. **Department Admin Authentication**:
   - Department Admins log in via standard `/api/v1/auth/login` using their demo email and generated temporary password.
   - Session tokens (JWT) encode the administrator's identity and link them to their assigned department.

4. **Department-Level Data Isolation (Strict Backend Enforcement)**:
   - Department Admins can **only** query, view, and update complaints belonging to their assigned department (`departmentId`).
   - Any attempt to view or mutate another department's complaint returns `403 Forbidden` (`FORBIDDEN`).
   - Citizen complaints and Super Admin cross-department visibility remain intact.

5. **Department Dashboard**:
   - Dynamic complaint counters: Total Assigned, Pending, In Progress, Resolved.
   - Scoped list of complaints with complaint number, title, category, priority, status, address, and timestamp.
   - Empty state when no complaints are assigned to the department.

---

## Demo Department Reference

| Department | Slug | Demo Email Identifier |
|---|---|---|
| Roads | `roads` / `roads-infrastructure` | `roads.demo@civicai.local` |
| Waste Management | `waste` / `waste-management` | `waste.demo@civicai.local` |
| Water Supply | `water` / `water-supply` | `water.demo@civicai.local` |
| Drainage | `drainage` | `drainage.demo@civicai.local` |
| Street Lighting | `street-lighting` | `lighting.demo@civicai.local` |
| Public Health | `public-health` | `health.demo@civicai.local` |

---

## API Endpoints Added / Extended

### Super Admin Endpoints (Requires `SUPER_ADMIN` role)
- `POST /api/v1/admin/department-admins`: Create department admin account (returns temporary password in demo mode).
- `GET /api/v1/admin/department-admins`: List all department administrators with their department assignments.
- `GET /api/v1/departments`: List available municipal departments.

### Department Admin Endpoints (Requires `DEPARTMENT_ADMIN` or `ADMIN` role)
- `GET /api/v1/department-admin/me`: Get current admin's profile and department metadata.
- `GET /api/v1/department-admin/dashboard`: Get department-scoped complaint summary counts.
- `GET /api/v1/department-admin/complaints`: List complaints assigned exclusively to the admin's department.
- `GET /api/v1/complaints/:id`: Get complaint details (enforces department isolation; rejects cross-department access with 403).

---

## How to Run & Test

### 1. Start the Backend
```bash
cd apps/backend
pnpm dev
```

### 2. Start the Frontend
```bash
cd apps/frontend
npm start
# Press 'w' in terminal to open web browser at http://localhost:5173
```

### 3. Run Automated Tests
```bash
# Run all backend tests (49 tests including department isolation suite)
pnpm --filter backend test

# Run typechecks
pnpm --filter backend test:types
npm --prefix apps/frontend run typecheck
```
