# CivicAI PMC — API Contract

## 1. Contract status

This is the target contract and inventory guide. It does not replace the
implementation-specific reference in [apps/backend/API.md](../apps/backend/API.md).
The existing API reference is authoritative for current behavior. Items below
are labeled **Existing** where the current backend documentation confirms
them; target-only routes are labeled **Planned** and must not be presented as
implemented until code and tests exist.

## 2. Conventions

- Base path: `/api/v1`.
- Content type: `application/json` unless an upload flow explicitly says
  otherwise.
- IDs: opaque MongoDB-backed identifiers represented as strings; clients must
  not infer database structure from them.
- Dates: ISO 8601 UTC strings.
- Authentication: bearer access token on protected routes, consistent with the
  existing backend contract unless a reviewed web-session design changes it.
- Pagination: `page` starts at 1; `limit` is bounded by the endpoint (current
  complaint and notification APIs cap at 100). Return pagination metadata.
- Clients must not send server-owned fields such as owner, role, status,
  priority, audit actor, or verification timestamps unless an endpoint
  explicitly grants that operation.

## 3. Standard response and errors

Successful single-resource response:

```json
{
  "data": {
    "id": "resource-id"
  }
}
```

Successful list response:

```json
{
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 0,
    "totalPages": 0
  }
}
```

The following is the target normalized error envelope. Preserve current
responses where clients already depend on them; normalize only through an
explicit compatibility change:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The request is invalid.",
    "details": [
      { "field": "title", "code": "too_small", "message": "Required." }
    ],
    "requestId": "correlation-id"
  }
}
```

Expected status mapping:

| HTTP | Meaning | Example code |
|---|---|---|
| 400 | Malformed request or validation failure | `VALIDATION_ERROR` |
| 401 | Missing, invalid, expired, or revoked credentials | `UNAUTHENTICATED` |
| 403 | Authenticated but not permitted | `FORBIDDEN` |
| 404 | Resource absent or intentionally concealed by ownership policy | `NOT_FOUND` |
| 409 | State conflict, duplicate, or invalid transition | `CONFLICT` |
| 413 | Request or upload too large | `PAYLOAD_TOO_LARGE` |
| 415 | Unsupported media type | `UNSUPPORTED_MEDIA_TYPE` |
| 429 | Rate limit exceeded | `RATE_LIMITED` |
| 500 | Unexpected server failure | `INTERNAL_ERROR` |
| 503 | Required dependency unavailable | `SERVICE_UNAVAILABLE` |

Never return stack traces, database errors, secrets, tokens, or provider
credentials to clients. A request ID should be safe to include in support
reports and logs.

## 4. Existing endpoint inventory

The exact schema and current response details remain in
[apps/backend/API.md](../apps/backend/API.md).

| Method and path | Access | Status |
|---|---|---|
| `POST /auth/register` | Public; always creates Citizen | Existing |
| `POST /auth/send-otp` | Public, rate limited | Existing |
| `POST /auth/resend-otp` | Public, rate limited | Existing |
| `POST /auth/verify-otp` | Public, rate limited | Existing |
| `POST /auth/login` | Public, rate limited | Existing |
| `GET /auth/me` | Authenticated | Existing |
| `POST /auth/logout` | Authenticated | Existing |
| `POST /auth/forgot-password` | Public, generic response | Existing |
| `POST /auth/reset-password` | Public with single-use reset token | Existing |
| `POST /complaints` | Citizen | Existing |
| `GET /complaints` | Authenticated; citizen sees own records, admin sees all | Existing |
| `GET /complaints/{id}` | Owner or admin | Existing |
| `PATCH /complaints/{id}` | Owner-limited edits or admin updates | Existing |
| `GET /departments` | Public/auth behavior as implemented | Existing; active list |
| `GET /admin/dashboard` | Admin | Existing |
| `GET /notifications` | Authenticated; own records only | Existing |
| `PATCH /notifications/{id}/read` | Authenticated; own record only | Existing |

No department-management write API, staff assignment API, evidence upload,
resolution verification, explicit audit-query API, or AI analysis API is
confirmed in the current API reference.

## 5. Target domain endpoint additions

These endpoints are proposals for incremental implementation. The backend
must continue to enforce authorization even if a UI does not expose an action.

### Users and staff (Planned)

- `GET /users/me` or retain existing `GET /auth/me` as the single current-user
  contract; do not ship redundant profiles without a reason.
- `GET /admin/users?page=&limit=&role=&status=` — Super Admin only, safe
  projected profile fields.
- `PATCH /admin/users/{userId}/role` — Super Admin only, validated role change,
  audited; never accept privileged role through registration.
- `GET /departments/{departmentId}/members` — scoped to authorized staff.
- `PUT /departments/{departmentId}/members/{userId}` — Super Admin only,
  audited membership update.

### Complaints, workflow, and assignment (Planned)

- `GET /complaints?page=&limit=&status=&category=&departmentId=&ward=` —
  server-side filters; enforce citizen ownership and staff scope.
- `POST /complaints` — existing create contract; retain client fields already
  documented and reject server-controlled fields.
- `PATCH /complaints/{id}` — keep citizen content edits separate from
  privileged status/assignment operations where that improves auditability.
- `POST /complaints/{id}/transitions` with `{ "toStatus": "...", "reason":
  "..." }` — authorize actor, validate transition, record history. Planned;
  do not replace current PATCH behavior without compatibility tests.
- `POST /complaints/{id}/assignments` with `{ "assigneeId": "...",
  "departmentId": "...", "dueAt": "..." }` — Department Officer or Super
  Admin subject to scope.
- `GET /complaints/{id}/assignments` — authorized complaint participants.

### Evidence (Planned)

- `POST /complaints/{id}/evidence/uploads` — authorize before issuing a
  short-lived, single-object upload grant; return upload URL/headers and
  opaque upload ID.
- `POST /complaints/{id}/evidence` — finalize validated upload metadata and
  associate it with the complaint.
- `GET /complaints/{id}/evidence/{evidenceId}` — authorize each access and
  issue a short-lived download URL or safely stream the private object.
- `POST /complaints/{id}/evidence/{evidenceId}/review` — authorized reviewer
  submits verified/rejected decision and reason.

### AI (Planned)

- `POST /complaints/{id}/analysis` — authorized workflow or background
  service requests an analysis; return job/analysis reference if asynchronous.
- `GET /complaints/{id}/analysis` — scoped user reads safe recommendation and
  provenance.
- `POST /complaints/{id}/analysis/{analysisId}/decision` — authorized human
  records accept/override/decline; immutable AI result is not overwritten.

### Analytics and audit (Planned)

- `GET /admin/analytics/complaints?from=&to=&groupBy=` — Super Admin, bounded
  date range, aggregate data only.
- `GET /admin/audit-logs?page=&limit=&actorId=&action=&from=&to=` — Super
  Admin with sensitive-field redaction and strict pagination.

## 6. Complaint contract and controlled fields

Current create body (confirmed by existing API documentation):

```json
{
  "title": "Blocked roadside drain",
  "description": "The drain is blocked and water is overflowing.",
  "category": "Drainage",
  "location": {
    "address": "Main Road, Pune",
    "ward": "Ward 1",
    "latitude": 18.52,
    "longitude": 73.85
  }
}
```

The server assigns reporter, public reference, initial status, and initial
priority. Coordinates must be supplied together. File uploads are not
implemented in the current complaint contract.

The target response should expose a safe `data` representation with public
reference, complaint details, location, current state, department/assignment
summary allowed to the caller, timestamps, and applicable analysis summary.
Never serialize Mongoose documents directly as a public contract.

## 7. Upload rules

- Allow only explicitly approved MIME types and file extensions; validate
  actual file signatures server-side, not only browser headers.
- Enforce per-file and per-complaint count limits, maximum byte size, and
  request rate. Return `413`/`415` consistently.
- Use private object storage, short-lived scoped upload/download grants, and
  non-guessable object keys. Do not persist public permanent URLs.
- Scan or quarantine uploaded files before staff access where the chosen
  provider supports it. Define cleanup for abandoned uploads.
- Strip or avoid exposing EXIF location and other unnecessary metadata.
- Store only object key, detected media type, byte size, checksum, uploader,
  complaint ID, status, and timestamps in MongoDB.
- Authorize every issue, finalize, read, and delete operation; a valid URL is
  a temporary capability, not a substitute for correct ownership checks.

## 8. Contract evolution and testing

Additive changes should remain backward compatible. For breaking changes,
document migration, support a transition period where feasible, and update
clients and contract tests together. API tests should cover valid input,
validation failures, role denial, cross-owner access, invalid transitions,
pagination bounds, and dependency failures. Do not assert that planned
endpoints exist until they are implemented and tested.
