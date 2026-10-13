# CivicAI PMC — Target Architecture

This document describes the target direction, not a claim that every component
is implemented. Keep existing working code and evolve it in small, tested
increments. The current repository has a React Native/Expo application in
`apps/mobile`, a TypeScript/Express API in `apps/backend`, and MongoDB via
Mongoose. The requested product direction is a React + Vite + JavaScript web
frontend. That web frontend is a target; do not treat it as already present or
replace `apps/mobile` as part of this architecture document.

## 1. Architecture at a glance

```text
Citizen / Department Officer / Field Worker / Super Admin
                           |
                           v
              React + Vite web application
                           |
                    HTTPS / JSON REST
                           |
                           v
              Node.js + Express API (TypeScript)
                |         |           |
                v         v           v
             MongoDB   Object store  Email provider
             Mongoose   (evidence)   (verification)
                |
                +---- authenticated, bounded request ----> FastAPI AI service
                                                           (when introduced)
```

The Express API remains the system of record and enforcement point. The browser
must never connect directly to MongoDB, the AI provider, or private object
storage. Complaint intake and staff operations must remain usable when the AI
service is unavailable.

## 2. Repository status and migration direction

| Area | Confirmed today | Target direction |
|---|---|---|
| Web UI | The repository currently contains `apps/mobile`, an Expo/React Native application. | Add a React + Vite + JavaScript web client in a separately owned `apps/web` (or an explicitly approved replacement location). Preserve the mobile app and its changes until the team decides its lifecycle. |
| API | `apps/backend` is a TypeScript Express API with versioned routes, Mongoose, authentication, complaints, departments, dashboard, and notifications. | Keep this API and extend it by module; do not rewrite it to JavaScript or introduce a second system of record. |
| Database | MongoDB stores users, complaints, departments, notifications, and authentication-related records. | Add collections and indexes only with the feature that owns them and a migration/backfill plan where needed. |
| AI | An AI provider abstraction exists in the backend; a separate FastAPI service is a future direction. | Introduce FastAPI only when classification or similarity is ready for implementation. Treat every result as untrusted advice requiring policy and, where appropriate, human review. |
| Tests | Backend API and authentication tests exist; frontend and cross-service coverage is incomplete. | Add tests alongside each increment and keep build, typecheck, and test commands documented per app until a root workspace is deliberately adopted. |

The repository currently has separate package managers and app boundaries;
this document does not assume a root workspace or shared package exists. Do
not create empty modules or duplicate APIs in anticipation of future features.

## 3. Runtime responsibilities

### Web client

The React/Vite application owns presentation, accessibility, client-side form
feedback, and navigation. It calls only the public versioned API. It may hide
controls based on a safe user profile for usability, but those checks are not
authorization. Keep API calls and authentication handling centralized rather
than embedding endpoint logic in pages.

### Express API

The API owns authentication, authorization, validation, domain rules, workflow
transitions, persistence, notifications, audit events, and integration with
external services. Each module exposes a narrow router/controller boundary;
controllers handle HTTP translation, services enforce use cases, and models
persist validated domain data. One module should not modify another module's
collections directly except through an agreed service boundary.

### MongoDB

MongoDB is the authoritative store for application records. Mongoose schemas
enforce field constraints and indexes; service-level rules enforce ownership,
state transitions, and cross-document invariants. Avoid treating client input
or AI output as trusted model data.

### AI service

When built, FastAPI owns AI-specific provider orchestration and inference
contracts, not user identity, complaint ownership, final status, or municipal
decisions. The Express API authenticates the caller, selects the minimum
necessary data, calls AI over a private authenticated service channel, validates
the result, and persists a versioned analysis. Provider credentials stay in
the AI service's server-side environment.

## 4. Module boundaries and folder ownership

These are ownership rules for code as it is added; they do not require creating
empty directories now.

### Backend (`apps/backend/src`)

| Area | Owns | Must not own |
|---|---|---|
| `config/`, `database/`, `middleware/` | Validated runtime configuration, database lifecycle, request identity, error translation, and shared HTTP infrastructure. | Complaint or role-specific business decisions. |
| `modules/auth/` | Registration, login, verification, password recovery, token/session lifecycle, and authentication events. | Publicly assignable privileged roles. |
| `modules/users/` | Safe user profile and account administration rules. | Password/token exposure or bypassing auth services. |
| `modules/complaints/` | Complaint intake, citizen ownership, allowed edits, lifecycle transitions, assignment references, and complaint queries. | Department staff administration or AI provider credentials. |
| `modules/departments/` | Department records, active status, and authorized department administration. | Complaint lifecycle policy. |
| `modules/assignments/` (when needed) | Assignment history and staff workload/assignment actions. Introduce only if it needs its own lifecycle beyond complaint fields. | Duplicating complaint state. |
| `modules/uploads/` (when needed) | Upload authorization, metadata, validation, and object-store integration. | Public unrestricted file proxying. |
| `modules/ai/` | Backend-side AI client, schema validation, persistence of analysis references, and retry/error policy. | Making AI the final complaint authority. |
| `modules/notifications/` | In-app notification creation, listing, and read state; future delivery adapters. | Making notification delivery a prerequisite for saving a complaint. |
| `modules/admin/` | Cross-module dashboards and admin-only aggregates. | Duplicating source-of-truth records. |
| `modules/audit/` (when needed) | Append-only security and material administrative action records. | Storing passwords, raw tokens, OTPs, or unnecessary personal data. |

Use existing module names and patterns when extending the backend. Extract a
shared helper only when it has multiple real callers.

### Web frontend (target: `apps/web/src`)

| Area | Owns |
|---|---|
| `app/` | Application bootstrap, router, providers, and global error boundary. |
| `features/<feature>/` | Feature pages, feature-specific components, hooks, and UI state for auth, complaints, departments, notifications, and dashboards. |
| `components/` | Small reusable presentation components with no domain/API authority. |
| `services/` | Central API client and platform integration; no page should construct ad hoc auth headers. |
| `config/` | Validated public build-time settings such as API base URL. Never put private secrets in Vite `VITE_*` variables. |
| `utils/` | Pure shared browser helpers, not backend business rules. |

Use JavaScript as requested. Do not introduce TypeScript into the web app
unless the product direction is explicitly changed.

### AI service (future: `services/ai`)

Own FastAPI endpoints, provider adapters, prompt/model versions, output
validation, and AI-specific tests. It must not expose a public unauthenticated
endpoint or read/write the production MongoDB directly by default.

## 5. Request and data flow

1. A user submits a validated request to the Express API over HTTPS.
2. Authentication middleware identifies the account; route policy checks
   role, resource ownership, and any department scope.
3. A module service applies domain rules and writes the authoritative change.
4. Notifications and audit records are emitted after or transactionally with
   the domain change according to the operation's consistency requirements.
5. Optional AI work is queued or performed as a bounded best-effort action.
   It cannot roll back a valid citizen submission solely because AI is down.
6. The API returns a stable, documented response; the client renders only
   server-confirmed outcomes.

## 6. Cross-cutting architecture rules

- Keep API routes under `/api/v1`; make breaking API changes versioned.
- Validate request parameters, query values, and bodies at the boundary.
- Enforce role, ownership, department scope, and state transition rules on the
  server for every request.
- Use least privilege for service credentials and storage access.
- Store uploaded binary data outside MongoDB in private object storage; store
  validated metadata and object keys in MongoDB.
- Log request correlation IDs and safe error context, never credentials,
  passwords, OTPs, reset tokens, bearer tokens, or uploaded content.
- Use pagination with bounded limits for list endpoints.
- Keep AI analysis, email, and push delivery outside critical database request
  paths where practical; make retries idempotent.
- Use MongoDB transactions only where an operation spans documents and the
  deployment topology supports transactions.

## 7. Testing and delivery

Each change should include focused unit or API tests. Backend changes must
preserve build/typecheck and existing API tests. Web changes must pass its
lint/build checks and relevant component or browser tests. Integration tests
should verify role boundaries, ownership, workflow transitions, and failure
handling without relying on live email, AI, or production data. See
[TEAM_WORKFLOW.md](./TEAM_WORKFLOW.md) for branch and review practice.

## 8. Incremental migration plan

The ordered, independently testable tasks are in
[REQUIREMENTS.md](./REQUIREMENTS.md). In brief:

1. Baseline current contracts and agree the web app location and auth strategy.
2. Bootstrap the Vite client alongside existing applications without changing
   the backend contract.
3. Connect a minimal login/session and profile flow to existing API endpoints.
4. Deliver citizen complaint list, detail, and submission using existing APIs.
5. Add backend role and department-scope foundations with tests.
6. Add staff assignment and workflow transitions incrementally.
7. Add secure evidence upload and resolution verification.
8. Add versioned AI suggestions and duplicate candidates as optional services.
9. Add audit coverage, operational dashboards, and production hardening.

Do not start a later phase until the prior phase's acceptance tests pass and
its contract/documentation has been reviewed.
