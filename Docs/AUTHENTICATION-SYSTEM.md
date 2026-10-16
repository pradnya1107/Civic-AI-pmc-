# CivicAI PMC — Authentication System (Register, Login, JWT, RBAC)
**Issue Reference:** [ISSUE-03: Authentication System (Register, Login, JWT, RBAC) #6](https://github.com/pradnya1107/Civic-AI-pmc-/issues/6)  
**Requirements Addressed:** FR-AUTH-01 to FR-AUTH-05, BRD-5 Auth, FRD Section 3  
**Status:** Completed & Verified  

---

## 1. Overview & Architecture

The Authentication System provides the security backbone for the CivicAI platform. It manages identity, credentials, cryptographic tokens, rate limiting, and role-based access control (RBAC) across public citizens, department administrators, central PMC administrators, and super administrators.

```
       ┌────────────────┐
       │     Client     │
       └───────┬────────┘
               │ 1. POST /api/v1/auth/register (or /login)
               ▼
   ┌───────────────────────┐
   │ authRateLimit (10/min)│ ──> [429 Too Many Requests if >10 attempts/min]
   └───────────┬───────────┘
               │ 2. Validated by Zod Schemas
               ▼
   ┌───────────────────────┐
   │    auth.controller    │
   └───────────┬───────────┘
               │ 3. bcrypt (12 rounds) & JWT (HS256, 7d expiry)
               ▼
   ┌───────────────────────┐
   │     auth.service      │ ──> register, login, validateToken, revokeUserTokens
   └───────────┬───────────┘
               │
               ▼
   ┌───────────────────────┐
   │     MongoDB Atlas     │
   └───────────────────────┘
```

---

## 2. Implemented Components & Endpoints

### 2.1 Core Modules

| Module | File Location | Responsibility |
|---|---|---|
| **Auth Service** | [`apps/backend/src/modules/auth/auth.service.ts`](file:///c:/Users/PRADNYA/Civic%20AI/apps/backend/src/modules/auth/auth.service.ts) | Implements `register`, `login`, `validateToken`, `revokeUserTokens`. Enforces bcrypt (12 rounds) and HS256 JWT tokens. |
| **Auth Controller** | [`apps/backend/src/modules/auth/auth.controller.ts`](file:///c:/Users/PRADNYA/Civic%20AI/apps/backend/src/modules/auth/auth.controller.ts) | Handles HTTP transport, status codes (201, 200, 401, 403, 409, 429), and safe payload responses. |
| **Auth Routes** | [`apps/backend/src/modules/auth/auth.routes.ts`](file:///c:/Users/PRADNYA/Civic%20AI/apps/backend/src/modules/auth/auth.routes.ts) | Mounts auth endpoints with Zod request validation and `authRateLimit` middleware. |
| **Authentication Middleware** | [`apps/backend/src/middleware/authenticate.ts`](file:///c:/Users/PRADNYA/Civic%20AI/apps/backend/src/middleware/authenticate.ts) | Extracts Bearer JWT token, calls `validateToken()`, and attaches authenticated `req.user`. |
| **Role Guard (RBAC)** | [`apps/backend/src/middleware/authorize.ts`](file:///c:/Users/PRADNYA/Civic%20AI/apps/backend/src/middleware/authorize.ts) | Factory creating role guards (`authorize("ADMIN", "SUPER_ADMIN")`). Case-insensitive role comparison. Returns 403 Forbidden on role mismatch. |
| **Rate Limiter** | [`authRateLimit`](file:///c:/Users/PRADNYA/Civic%20AI/apps/backend/src/modules/auth/auth.routes.ts) | Enforces 10 requests/minute on sensitive auth endpoints (`/register`, `/login`), responding with HTTP 429. |

### 2.2 Endpoints

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/v1/auth/register` (also `/auth/register`) | Public (Rate-limited: 10/min) | Registers a new citizen. Hashes password with bcrypt (12 rounds). Returns HTTP 201 with signed JWT and `role: citizen`. |
| `POST` | `/api/v1/auth/login` (also `/auth/login`) | Public (Rate-limited: 10/min) | Verifies email and password. Returns HTTP 200 with JWT access token and user metadata. |
| `GET` | `/api/v1/auth/me` (also `/auth/me`) | Authenticated (`Bearer <token>`) | Returns safe authenticated user profile without exposing sensitive fields (e.g. `passwordHash`). |
| `POST` | `/api/v1/auth/logout` | Authenticated (`Bearer <token>`) | Revokes existing tokens by incrementing `tokenVersion`. |
| `POST` | `/api/v1/auth/send-otp` | Public (Rate-limited) | Dispatches 6-digit email verification OTP. |
| `POST` | `/api/v1/auth/verify-otp` | Public (Rate-limited) | Verifies email OTP and activates user account. |
| `POST` | `/api/v1/auth/forgot-password` | Public (Rate-limited) | Dispatches secure password reset token. |
| `POST` | `/api/v1/auth/reset-password` | Public (Rate-limited) | Consumes single-use reset token and updates user password hash. |

---

## 3. Acceptance Criteria Verification

| Criteria | Expected Behavior | Verification Status |
|---|---|---|
| **AC-1: Citizen Registration** | New citizen POSTs valid registration data $\rightarrow$ 201 Created with JWT and `role: citizen`. | Verified in `tests/auth-system.test.ts` |
| **AC-2: Login & Current Profile** | Registered user signs in $\rightarrow$ 200 with JWT $\rightarrow$ `GET /auth/me` returns user profile. | Verified in `tests/auth-system.test.ts` |
| **AC-3: RBAC Protection** | Citizen token attempts to access admin route $\rightarrow$ 403 Forbidden. | Verified in `tests/auth-system.test.ts` |
| **AC-4: Rate Limiting** | $>10$ login attempts per minute $\rightarrow$ 429 Too Many Requests. | Verified in `tests/auth-system.test.ts` |
| **Security Standards** | Passwords stored with bcrypt 12+ rounds; tokens expire in 7d; secrets never leaked in logs. | Verified across test suite |

---

## 4. Test Suite

The dedicated test suite [`apps/backend/tests/auth-system.test.ts`](file:///c:/Users/PRADNYA/Civic%20AI/apps/backend/tests/auth-system.test.ts) executes 13 tests covering all aspects of Issue #3:
- Citizen registration success (201 + JWT + role citizen)
- Duplicate email rejection (409 Conflict)
- Citizen login success (200 + JWT)
- Wrong password rejection (401 Invalid Credentials)
- Profile retrieval (`GET /auth/me` and `GET /api/v1/auth/me`)
- JWT validation (`validateToken` unit tests)
- Malformed & expired JWT rejection (401 Unauthorized)
- Revoked token rejection upon token version increment
- RBAC role guard rejection on citizen token (403 Forbidden)
- RBAC role guard approval on admin token (200 OK)
- Case-insensitive role comparison in `authorize` middleware
- Auth rate limiter (max 10 requests/min $\rightarrow$ 429 Too Many Requests)
