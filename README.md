# CivicAI — Pune Municipal Corporation (PMC)

CivicAI is an AI-assisted civic issue reporting and complaint management platform designed for the Pune Municipal Corporation (PMC). It enables citizens to report civic issues, track resolutions, and empowers municipal administrators to verify, assign, and manage issues across departments.

---

## 🚀 Quick Start (Day 1 Setup)

### Prerequisites

- **Node.js**: `v20+` (tested with v25)
- **pnpm**: `v10+` (tested with v12)
- **MongoDB**: Local MongoDB instance or MongoDB Atlas URI

### 1. Clone & Install

```bash
git clone https://github.com/pradnya1107/Civic-AI-pmc-.git
cd Civic-AI-pmc-
pnpm install
```

### 2. Configure Environment

Copy the example environment file for the backend:

```bash
# Windows PowerShell
Copy-Item apps/backend/.env.example apps/backend/.env

# Linux/macOS
cp apps/backend/.env.example apps/backend/.env
```

Ensure your `apps/backend/.env` has:
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://127.0.0.1:27017/civicai_pmc
JWT_SECRET=your_long_random_secret_at_least_32_characters
```

### 3. Run Development Server

```bash
pnpm dev
```

The backend server starts on `http://localhost:5000`.

### 4. Verify Health Check

Visit in browser or test via curl:
```bash
curl http://localhost:5000/api/v1/health
```

Expected response:
```json
{
  "success": true,
  "message": "CivicAI API is running",
  "status": "ok",
  "server": "running",
  "database": "connected"
}
```

---

## 📦 Project Scripts

Run from repository root:

| Command | Description |
|---|---|
| `pnpm dev` | Start backend in development mode with hot-reload |
| `pnpm build` | Compile TypeScript backend to `dist/` |
| `pnpm test` | Run test suite with in-memory MongoDB |
| `pnpm test:types` | Run TypeScript typechecking without emit |
| `pnpm lint` | Lint & check types across the project |

---

## 📁 Repository Structure

```text
Civic-AI-pmc-/
├── .github/
│   └── workflows/
│       └── ci.yml               # GitHub Actions CI (lint, build, test)
├── apps/
│   ├── backend/                 # Node.js + Express + TypeScript API
│   │   ├── src/                 # Controllers, services, routes, models
│   │   ├── tests/               # Vitest automated test suite
│   │   └── package.json
│   └── mobile/                  # React Native / Expo mobile app
├── packages/
│   └── shared/                  # Shared types, models, constants
├── Docs/                        # Full specifications & 10-day roadmap
│   ├── BRD-CivicAI.md
│   ├── FRD-CivicAI.md
│   ├── Architecture.md
│   └── Issues/README.md         # 10-Day GitHub issues index
├── package.json                 # Monorepo root scripts
├── pnpm-workspace.yaml          # Monorepo workspace configuration
└── README.md
```

---

## 📋 10-Day Delivery Roadmap

Refer to [Docs/Issues/README.md](./Docs/Issues/README.md) and the [GitHub Milestone](https://github.com/pradnya1107/Civic-AI-pmc-/milestone/1) for all daily task checklists.
