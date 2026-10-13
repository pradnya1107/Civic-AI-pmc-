# CivicAI PMC — Product Requirements

## 1. Purpose and scope

CivicAI PMC is a civic issue reporting and operational management platform for
Pune. It supports citizens who report and track issues and municipal teams
that triage, assign, resolve, and analyze them.

This document defines the target product requirements. It is not a statement
that every requirement is currently implemented. The current repository
contains an Expo mobile client and a TypeScript/Express backend; the target web
direction is React + Vite + JavaScript. Preserve working code while migrating
in increments.

## 2. Roles

| Role | Intended responsibility | Authorization boundary |
|---|---|---|
| Citizen | Register, verify account, create complaints, and view/update eligible own complaints. | May access only their own records and permitted public department data. |
| Department Officer | Triage and manage work within assigned department scope; assign field work if granted that permission. | Cannot administer users or departments outside explicit grants. |
| Field Worker | View assigned work and submit progress and resolution evidence. | Cannot browse unrelated citizen reports or reassign work unless explicitly authorized. |
| Super Admin | Manage departments, staff access, system-wide operations, and analytics. | Privileged actions require strong authentication, audit records, and least-privilege policy. |

Public registration must always create a Citizen. No client-supplied role may
grant privileged access. Staff roles must be provisioned or changed only
through an authenticated administrative process.

**Current-state note:** the backend user model currently has `CITIZEN` and
`ADMIN`, not the four-role target. Do not silently reinterpret `ADMIN` as
Super Admin or expose new roles before a migration and authorization tests are
approved.

## 3. Core functional requirements

### 3.1 Authentication and account security

- Support account registration, email verification, login, logout, current
  profile, and password recovery using the existing backend contracts.
- Require verified, active accounts for authentication as currently specified.
- Apply rate limits to credential, OTP, and recovery endpoints.
- Do not reveal whether an account exists through verification/recovery
  responses.
- Never return or log password hashes, secrets, one-time codes, or tokens.
- See [AUTHENTICATION.md](./AUTHENTICATION.md).

### 3.2 Citizen dashboard and complaint lifecycle

- A citizen can submit a complaint with title, description, category, and
  location; coordinates are optional but must be a valid pair when supplied.
- The API assigns the reporter, public complaint reference, initial status,
  and any server-controlled priority.
- A citizen can list and view only their own complaints and can edit only
  fields allowed by the current lifecycle policy.
- The system records status changes, responsible department, and assignment
  history with actor and timestamps.
- The citizen dashboard shows complaint totals and recent state, not
  cross-citizen data.

**Target lifecycle (to be approved with workflow implementation):**

```text
SUBMITTED -> UNDER_REVIEW -> ASSIGNED -> IN_PROGRESS -> RESOLVED -> CLOSED
                   |              |           |
                   +------------> REJECTED <---+
```

Every transition must have an allowed source state, authorized actor, and
reason where policy requires it. Reopening a resolved/closed issue needs an
explicit rule and audit record. The current backend status enum does not yet
include `CLOSED`; this target must not be applied without a migration and
contract update.

### 3.3 AI classification, severity, and duplicate detection

- Classification and severity are recommendations, not authoritative
  decisions.
- Store model/provider version, timestamp, confidence or score where available,
  and the original recommendation separately from any human override.
- Show a recommendation's provenance to authorized reviewers.
- Duplicate detection returns candidate matches with an explainable similarity
  score; it must not silently merge or suppress a complaint.
- Citizen submission and staff operations must continue when AI is unavailable.
- Do not send unnecessary personal information, contact details, credentials,
  or uploaded metadata to an AI provider.

### 3.4 Departments, assignments, and field operations

- An authorized administrator manages active departments and membership.
- Department Officers can see/manage only records in their authorized scope.
- Assignments record complaint, assignee, assigning actor, department, time,
  and optional due date/history.
- Field Workers see assigned work and may submit progress/evidence within
  server-enforced transition rules.
- Reassignment, rejection, escalation, and cancellation must be auditable.

### 3.5 Resolution evidence and verification

- An authorized worker may submit resolution notes and permitted evidence.
- Evidence is private by default, access-controlled, size/type-limited, and
  associated with a complaint and submitting actor.
- A designated reviewer verifies or rejects evidence; a successful upload
  alone must not mark a complaint resolved.
- Record review outcome, actor, timestamp, and reason. Protect citizens'
  personal data in all evidence access paths.

### 3.6 Notifications

- Create in-app notifications for relevant complaint lifecycle events.
- Notification delivery must not make a complaint write fail.
- Users can list and mark only their own notifications read.
- Email/SMS/push channels require separate opt-in, provider configuration, and
  delivery/error policy; never log secrets or one-time codes.

### 3.7 Analytics and geographic intelligence

- Provide aggregate counts and trends by time, status, category, department,
  ward, and priority subject to authorization and privacy rules.
- Use validated coordinates and approved geographic boundaries; do not infer
  a precise location when the user did not provide one.
- Avoid exposing personally identifying complaint details in aggregate views.
- Define retention, time zones, and aggregation semantics with each metric.

### 3.8 Audit logs

- Record security-sensitive and material administrative actions, including
  role changes, assignment changes, status overrides, evidence decisions, and
  department configuration changes.
- Audit records are append-only to application roles and include actor,
  action, resource reference, timestamp, and safe before/after summary.
- Exclude credentials, raw tokens, OTPs, and unnecessary personal content.

## 4. Non-functional requirements

- **Security:** deny by default; validate inputs; enforce authorization server
  side; use TLS in deployed environments; protect secrets; limit request and
  upload sizes.
- **Privacy:** collect only data needed to operate and resolve complaints;
  scope access by role, ownership, and department.
- **Reliability:** complaint intake and core state changes do not depend on AI
  or notification providers.
- **Performance:** paginate list APIs, add indexes based on measured queries,
  bound external calls, and avoid unbounded dashboard scans.
- **Accessibility:** keyboard-operable web workflows, semantic controls,
  visible focus, and actionable validation feedback.
- **Observability:** structured safe logs, request correlation IDs, health
  checks that distinguish API and database readiness, and operational
  monitoring without secret exposure.
- **Maintainability:** module-owned domain rules, documented versioned APIs,
  and focused automated tests.

## 5. API, data, and error requirements

- JSON REST endpoints use `/api/v1`.
- Request and response shapes are documented in [API.md](./API.md).
- All list APIs have bounded pagination and stable sorting.
- Validation, authentication, authorization, missing-resource, conflict, and
  unexpected errors use the shared error envelope.
- MongoDB is authoritative; browser code never queries it directly.
- File metadata is stored in MongoDB; file bytes use private object storage.
- Schema changes include forward/backward compatibility or an explicit
  migration and rollback plan.

## 6. Acceptance principles

Each feature is accepted only when:

1. Its API contract and role matrix are documented.
2. Unauthorized and cross-owner requests are tested.
3. Success is based on persisted server-confirmed results, not client state.
4. Provider failures and retries have explicit behavior.
5. Existing backend build/typecheck/tests and relevant client checks pass.
6. No unrelated module is changed without a documented dependency.

## 7. Prioritized migration tasks

Each task is independently reviewable and testable. These are planning items,
not implementation authorization.

| Priority | Task | Testable outcome |
|---|---|---|
| P0 | Record current routes, request/response schemas, role behavior, package commands, and baseline test results. | Contract inventory reconciles with `apps/backend/API.md`; existing tests remain green. |
| P0 | Agree the web app location, authentication transport, and deployment origins without altering current apps. | Reviewed decision recorded; no existing mobile/backend files replaced. |
| P1 | Bootstrap React + Vite + JavaScript web application with config validation and a health/API connectivity view. | Production build succeeds; no private values are bundled. |
| P1 | Implement web login, verification/recovery entry points, logout, and safe session lifecycle against existing endpoints. | Tests cover API success/error, expired session, and no token in localStorage. |
| P1 | Implement citizen complaint list, detail, and submission against existing APIs. | Citizen ownership and validation scenarios pass; server success controls UI confirmation. |
| P2 | Define and migrate the four-role model and department membership without granting privilege by public registration. | Migration/idempotency tests and per-role authorization matrix pass. |
| P2 | Add department management and assignment history/actions. | Scope, allowed transitions, and audit tests pass. |
| P2 | Add evidence upload authorization and resolution review. | MIME/size/access/rejection tests pass; private object is not publicly enumerable. |
| P3 | Add versioned AI classification/severity and duplicate candidate workflows as optional work. | Contract, invalid-output, timeout, and unavailable-service tests pass. |
| P3 | Add cross-department analytics, geographic aggregation, and audit reporting. | Aggregation authorization/privacy tests pass; metrics have defined semantics. |
| P3 | Harden production deployment, rate-limit storage, monitoring, retention, and recovery. | Operational runbooks and deployment checks reviewed; no live secret included in test output. |

