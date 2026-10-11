# CivicAI PMC Backend API

The backend listens on the configured `PORT` (default `5000`). API routes use
the `/api/v1` prefix and JSON request/response bodies.

## Authentication

Citizen registration always assigns the `CITIZEN` role and creates an
unverified account. Passwords must be 12–128 characters and at most 72 UTF-8
bytes because bcrypt only processes 72 bytes.

### Register

`POST /api/v1/auth/register`

```json
{
  "fullName": "A Citizen",
  "email": "citizen@example.com",
  "password": "use-a-long-unique-password",
  "phoneNumber": "+91 9000000000"
}
```

`phoneNumber` is optional. Public registration does not accept role or account
status fields.

### Send or resend verification code

`POST /api/v1/auth/send-otp` and `POST /api/v1/auth/resend-otp`

```json
{ "email": "citizen@example.com" }
```

Both endpoints return the same `202 Accepted` response whether or not an
eligible account exists. Codes are six digits, expire after 10 minutes, and
are stored as keyed hashes. Resends have a cooldown and per-account and
per-IP limits.

### Verify email

`POST /api/v1/auth/verify-otp`

```json
{ "email": "citizen@example.com", "otp": "123456" }
```

Codes allow at most five verification attempts and can only be used once.

### Sign in

`POST /api/v1/auth/login`

```json
{ "email": "citizen@example.com", "password": "use-a-long-unique-password" }
```

Only active, email-verified accounts can sign in. Successful responses include
a short-lived bearer access token. Provide it on protected requests:

```http
Authorization: Bearer <accessToken>
```

`GET /api/v1/auth/me` returns the authenticated user's safe profile.
`POST /api/v1/auth/logout` increments that account's token version, revoking
its previously issued access tokens.

### Password reset

`POST /api/v1/auth/forgot-password`

```json
{ "email": "citizen@example.com" }
```

The response is identical for known and unknown email addresses. An eligible
account receives a single-use reset link. Complete the reset with:

`POST /api/v1/auth/reset-password`

```json
{ "token": "<token-from-email-link>", "password": "another-long-password" }
```

Reset tokens expire after 30 minutes, are stored as hashes, and revoke prior
access tokens after a successful password change.

## Complaints

All complaint endpoints require a bearer token. Citizens see only their own
complaints; administrators can list and view all complaints.

### Create

`POST /api/v1/complaints` (citizen)

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

Coordinates must be supplied together. The server assigns the citizen,
complaint number, initial status (`SUBMITTED`), and initial priority (`MEDIUM`).
File uploads and evidence references are not implemented.

### List and filter

`GET /api/v1/complaints?page=1&limit=20&status=SUBMITTED&priority=HIGH&category=Drainage`

Pagination defaults to page 1 and 20 records; the maximum page size is 100.

### Read or update

- `GET /api/v1/complaints/{id}` — citizens can read their own record; admins
  can read any record.
- `PATCH /api/v1/complaints/{id}` — citizens may edit content/location while
  the complaint is still `SUBMITTED`. Administrators may additionally set
  `status`, `priority`, and `departmentId`.

Ownership, role, status, and department fields cannot be changed by citizens.
An unknown or another citizen's complaint returns the same `404` response.

## Departments and dashboard

- `GET /api/v1/departments` lists active departments.
- `GET /api/v1/admin/dashboard` requires the `ADMIN` role and reports
  database-backed complaint totals grouped by status and priority, plus recent
  complaints.
- `GET /api/v1/notifications?page=1&limit=20` lists only the authenticated
  user's in-app notifications and unread count.
- `PATCH /api/v1/notifications/{id}/read` marks that user's notification read.
New complaint submissions create administrator notifications, and administrator
status/assignment changes create notifications for the owning citizen.

Departments are managed separately from complaints. No department-management
write endpoint is currently exposed.

## Health and errors

- `GET /api/health` reports the HTTP server and Mongoose connection states.
  It returns `200` only when MongoDB is connected and `503` otherwise.
- API errors use `{ "success": false, "message": "...", "error": { "code":
  "..." } }`. Sensitive fields and request bodies are not written to request
  logs.
- Authentication routes have per-IP rate limits; OTP and reset-request
  responses do not reveal whether an email belongs to an account.

## Postman or curl smoke-test order

1. Register a citizen and use the configured SMTP delivery to get and verify
   the email code.
2. Sign in; copy the returned access token into the `Authorization` bearer
   field for protected requests.
3. Create a complaint, list it, and retrieve it by its returned `_id`.
4. Create the first administrator using the documented CLI bootstrap, then
   sign in as that account.
5. As an administrator, list/update complaints and call the dashboard.
6. Sign out as a citizen and confirm the old token no longer accesses `/me`.
