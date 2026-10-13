# CivicAI PMC — Database Responsibilities

## 1. Source of truth and current state

MongoDB accessed through Mongoose is the authoritative application database.
The browser and the future AI service do not connect to it directly. The
Express backend owns connection lifecycle, schema validation, indexes, and
domain writes.

The backend currently has Mongoose models for users, complaints, departments,
notifications, and authentication verification/reset records. The current
user role enum is `CITIZEN`/`ADMIN`; the target operational roles are not yet
represented. Confirm each model and index in source before treating it as a
deployed schema.

## 2. Collection ownership and responsibilities

| Collection / record | Owning module | Responsibility | Target state |
|---|---|---|---|
| `users` | Auth/users | Identity, normalized email, password hash, role, active/verification state, token/session revocation version. | Exists; extend only with a reviewed role/membership migration. |
| `complaints` | Complaints | Public complaint number, reporter reference, content, location, status, priority, department reference, timestamps. | Exists; workflow/history additions planned. |
| `departments` | Departments | Department name/code, active state, service scope and safe public metadata. | Exists; write/admin operations incomplete. |
| `notifications` | Notifications | Recipient, related complaint, type, display text, read timestamp. | Exists for in-app notifications. |
| OTP/verification records | Auth | Account verification and resend/attempt/expiry state using non-reversible keyed hashes where applicable. | Exists in auth implementation; exact collection/model names should follow source. |
| Password-reset records | Auth | Single-use reset-token hash, expiry and account binding. | Exists; reset update is transactional and requires MongoDB transaction support. |
| `assignments` | Assignments (planned) | Assignment history: complaint, department, assignee, actor, state, due date and timestamps. | Planned; may be embedded only if query/history needs do not justify separate collection. |
| `complaint_events` or status history | Complaints/audit (planned) | Immutable lifecycle transition records and reasons. | Planned; decide between dedicated history and audit collection before implementation. |
| `evidence` metadata | Uploads (planned) | Object key, verified metadata, uploader, complaint, review state, timestamps. | Planned; binary objects live in private object storage, not MongoDB. |
| `ai_analyses` | AI (planned) | Immutable analysis result, model/provider version, input reference/hash, scores, status and reviewer decision reference. | Planned; store only necessary input/provenance. |
| `audit_logs` | Audit (planned) | Append-only security and privileged domain actions with safe actor/resource/action metadata. | Planned; access and retention are restricted. |

Names above are logical names; follow the actual Mongoose collection naming
pattern when implementing.

## 3. Document design and invariants

- Use MongoDB ObjectIds internally and expose opaque string IDs. Public
  complaint numbers are separate, unique, non-secret identifiers.
- Normalize and index user email consistently; enforce uniqueness in the
  database, not only in a pre-check.
- Password hashes and token-version/security fields must not be selected into
  ordinary response queries by default.
- Store references between independently owned aggregates (user, complaint,
  department, assignment, evidence) rather than duplicating mutable source
  fields without a consistency rule.
- Keep current complaint state on the complaint for efficient reads; record
  material transitions separately for traceability.
- Never allow client-provided reporter, role, privilege, audit actor, AI
  result, or review outcome to become authoritative.
- Use schema enums and service transition checks together; schema enum alone
  does not enforce a valid state transition.
- Use UTC timestamps and Mongoose timestamps where appropriate.

### Target complaint record

The existing complaint record contains a unique complaint number, title,
description, category, address/ward/optional coordinate pair, citizen
reference, optional department, priority, status, and timestamps.

Possible additions, each requiring a migration/contract review:

- `version` or equivalent optimistic concurrency field for conflicting
  updates.
- `assignedTo` only if a dedicated assignment history is not implemented;
  otherwise keep current assignment as a queryable projection and preserve the
  history record.
- `resolvedAt`/`closedAt` only when their lifecycle meanings are agreed.
- GeoJSON point and `2dsphere` index only when geographic queries are needed
  and coordinate validation/retention policy is defined.

Do not add speculative fields just because they appear in the target list.

## 4. Indexing and query patterns

Existing indexes include unique complaint number, user-owned complaint
chronology, complaint status/chronology, and notification recipient/chronology
patterns. Confirm the deployed index state; schema declarations alone do not
prove production indexes exist.

Add indexes in response to concrete, bounded query patterns:

- User email unique index and any authentication lookup/expiry needs.
- Complaints by citizen and created date; staff views by department/status/date.
- Assignments by assignee/status/due date and complaint chronology.
- Notifications by recipient/read state/created date.
- TTL indexes only for explicitly expiring ephemeral records, with behavior
  checked against audit and abuse-investigation requirements.
- Geospatial indexes only for validated GeoJSON and supported geographic
  queries.

Review compound index prefixes against actual filters and sorts. Monitor index
size/write overhead; do not create redundant indexes reflexively.

## 5. Transactions and consistency

MongoDB transactions require a replica set or supported sharded deployment.
The existing password-reset flow uses a transaction to consume the reset token
and update the password atomically; local tests use a replica-set fixture.
MongoDB Atlas or a local replica set is therefore required to exercise that
flow. Do not weaken atomicity merely to support standalone MongoDB.

Use transactions for multi-document invariants only when necessary and
supported. For external email, object storage, AI, or notifications, do not
hold a database transaction open across network calls. Where reliable delivery
is needed, implement an idempotent outbox/worker design as a separate,
testable feature.

## 6. Upload storage boundary

Store binary evidence in private object storage. MongoDB stores only metadata
and an opaque object key. Validate uploads before making them available to
reviewers; define quarantine, cleanup, retention, and deletion behavior.
Never put permanent public object URLs in complaint responses.

## 7. Privacy, security, and retention

- Least-privilege database credentials; separate test/development/production
  databases.
- Never expose connection strings, tokens, OTPs, reset values, password hashes,
  or raw provider errors in API responses or logs.
- Restrict access to precise locations and evidence according to role and
  purpose.
- Set retention and deletion policies for account, complaint, evidence,
  notification, OTP/reset, and audit data before production launch.
- Audit records should be append-only for application identities and exclude
  secrets and unnecessary full complaint text.
- Backups, recovery objectives, and restore drills are operational
  requirements, not substitutes for authorization.

## 8. Schema and migration workflow

1. Identify the owning module and current read/write paths.
2. Write a backward-compatible schema change where practical.
3. Define backfill/default behavior and an idempotent migration command for
   existing records.
4. Add schema, index, authorization, and API tests before rollout.
5. Deploy in an expand/migrate/contract sequence if old and new code overlap.
6. Verify index creation and representative query plans in a safe environment.
7. Document rollback limits; never run destructive database operations as part
   of routine tests.

Use disposable test databases/fixtures. Tests must not connect to a live
production database or delete real user data.
