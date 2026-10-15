# Continuous Integration (CI) — CivicAI PMC

This document details the Continuous Integration (CI) architecture, workflow design, automated validation checks, and troubleshooting procedures for the CivicAI Pune Municipal Corporation (PMC) platform.

---

## 1. What CI Means in this Project

Continuous Integration (CI) is the practice of automatically verifying code changes as soon as they are pushed to the repository or proposed via Pull Requests. 

In CivicAI PMC, CI guarantees:
- **Type Safety**: TypeScript code compiles without type errors across both backend and mobile modules.
- **Regression Prevention**: Automated API and unit tests pass before code enters `dev` or `main`.
- **Build Integrity**: The backend builds cleanly and produces executable production outputs.
- **Lockfile Hygiene**: All dependencies strictly adhere to committed lockfiles (`pnpm-lock.yaml` and `package-lock.json`), ensuring consistent behavior across developer machines and production environments.

---

## 2. Why GitHub Actions is Used

- **Native Integration**: Seamlessly integrates with pull requests, branch protection rules, and issue tracking in GitHub without external CI servers.
- **Fast Feedback**: Runs parallel jobs for backend and mobile apps with built-in dependency caching (`pnpm` and `npm`).
- **Secure by Default**: Operates under minimal read-only permissions (`permissions: contents: read`) and keeps sensitive credentials and environment secrets completely isolated from pull requests.
- **Self-Contained Testing**: Executes tests against an in-memory replica set (`mongodb-memory-server`), ensuring zero dependence on external database instances and preventing test data leaks.

---

## 3. Workflow Trigger Events

The workflow file is located at [`.github/workflows/ci.yml`](../.github/workflows/ci.yml). It triggers automatically under the following conditions:

| Event | Target Branches | Purpose |
|---|---|---|
| **Push** | `main`, `dev`, `feature/**`, `fix/**` | Validates every commit pushed to key branches or feature branches. |
| **Pull Request** | `main`, `dev` | Validates proposed changes before merging. |

> **Concurrency Control**: If a new commit is pushed to the same branch while a previous CI run is in progress, the older run is cancelled automatically (`cancel-in-progress: true`) to save compute minutes.

---

## 4. Pipeline Jobs & Automated Checks

The CI pipeline runs two independent, parallel jobs:

### A. Backend CI Job (`backend-ci`)
Runs on `ubuntu-latest` with Node.js 20 and pnpm 12.10.1:

1. **Checkout**: Clones the repository using `actions/checkout@v4`.
2. **Setup pnpm & Node.js**: Configures pnpm 12.10.1 and Node.js 20 with pnpm store caching.
3. **Install Dependencies**: Executes `pnpm install --frozen-lockfile` to ensure exact dependency tree resolution without modifying lockfiles.
4. **Typecheck**: Executes `pnpm --filter backend test:types` (`tsc --noEmit -p tsconfig.test.json`). Verifies types across application code, tests, and configuration.
5. **Build**: Executes `pnpm --filter backend build` (`tsc`). Verifies production build emission into `dist/`.
6. **Automated Tests**: Executes `pnpm --filter backend test` (`vitest run`). Runs 33 unit and integration tests covering authentication, OTP lifecycle, complaint CRUD, role-based authorization, and health endpoints.

### B. Mobile CI Job (`mobile-ci`)
Runs on `ubuntu-latest` with Node.js 20:

1. **Checkout**: Clones the repository.
2. **Setup Node.js**: Configures Node.js 20 with npm dependency caching based on `apps/mobile/package-lock.json`.
3. **Install Dependencies**: Executes `npm ci --prefix apps/mobile` to install exact mobile dependencies.
4. **Typecheck**: Executes `npm --prefix apps/mobile run typecheck` (`tsc --noEmit`). Verifies TypeScript consistency for React Native and Expo components.

---

## 5. Local Reproduction Commands

Before pushing code, run these checks locally to ensure CI will pass:

```powershell
# From repository root:

# 1. Backend typecheck
pnpm lint

# 2. Backend production build
pnpm build

# 3. Backend automated tests (all 33 tests)
pnpm test

# 4. Mobile typecheck
pnpm mobile:typecheck
```

---

## 6. How to Troubleshoot Failures

When a GitHub Actions run fails:

1. **Navigate to the Run**:
   - Go to your repository on GitHub: `https://github.com/pradnya1107/Civic-AI-pmc-/actions`.
   - Click on the failed workflow run.
2. **Inspect the Failed Step**:
   - Expand the failed job (`Backend CI` or `Mobile CI`).
   - Click on the red step to view the exact error logs and stack traces.

### Common Failure Scenarios & Fixes:

- **Typecheck Failure (`tsc --noEmit`)**:
  - *Cause*: A TypeScript type mismatch or missing property.
  - *Fix*: Run `pnpm lint` or `pnpm mobile:typecheck` locally and fix compiler diagnostics.
- **Lockfile Out of Date (`ERR_PNPM_OUTDATED_LOCKFILE`)**:
  - *Cause*: A dependency in `package.json` was updated without regenerating `pnpm-lock.yaml`.
  - *Fix*: Run `pnpm install` locally, verify changes, and commit the updated `pnpm-lock.yaml`.
- **Test Assertion Failure**:
  - *Cause*: A backend test broke due to route, controller, or schema modifications.
  - *Fix*: Run `pnpm test` locally to inspect the failure output. Since tests run against an in-memory replica set, external database connections are not required.
- **Bcrypt Native Build Failure**:
  - *Cause*: Binary compilation issues on non-standard environments.
  - *Fix*: Ensure `allowBuilds` in `pnpm-workspace.yaml` contains `bcrypt: true`.
