# CivicAI PMC — Authentication and Authorization

## 1. Current contract and target roles

The current backend API documents registration, email verification by OTP,
login, current-user lookup, logout, forgot-password, and reset-password.
Authentication uses short-lived bearer access tokens; logout increments a
token version to revoke existing tokens. Only active, email-verified accounts
can log in. Reset-token consumption and password change are transactional.
See [apps/backend/API.md](../apps/backend/API.md) for the live request
contracts.

The current user model supports `CITIZEN` and `ADMIN`. The target roles are
Citizen, Department Officer, Field Worker, and Super Admin. Role migration,
staff provisioning, and permissions must be implemented and tested before
those roles are exposed. Never map the current `ADMIN` role implicitly to a
new role without an explicit migration decision.

## 2. Authentication lifecycle requirements

1. **Registration:** validate input, normalize email, hash the password with
   bcrypt, create a Citizen only, and initiate verification. Never trust a
   client-supplied role or verification state.
2. **Email verification:** issue bounded, single-use, expiring codes; store
   keyed hashes rather than raw OTP values; enforce send and attempt limits.
   Keep responses generic where account enumeration is possible.
3. **Login:** issue credentials only for an active, verified account after
   password verification. Use the repository's validated secrets and expiry
   configuration.
4. **Authenticated requests:** validate signature, expiry, token version, and
   account state; attach a safe identity to request context. Do not trust
   user ID or role supplied in request bodies.
5. **Logout:** revoke the applicable credential/session server-side. The
   existing token-version behavior is account-wide unless the implementation
   adds a session identifier; document that user-visible behavior.
6. **Recovery:** use generic responses, one-use expiring reset tokens stored
   as hashes, rate limits, and atomic token-consumption/password updates.
   Never send a reset token to logs or return it in API responses.

Passwords must never be stored or logged in plain text. Enforce the current
backend password policy consistently on registration, reset, and change
operations. Do not log passwords, OTPs, access tokens, reset tokens, cookies,
or authorization headers at any verbosity.

## 3. Browser and token storage

The current Expo web session store is memory-only; a reload ends the browser
session. Native storage behavior is separate and must not be generalized to
the future Vite client.

For the target browser application:

- Do not persist bearer access or refresh tokens in `localStorage`,
  `sessionStorage`, IndexedDB, URL query strings, or client-readable cookies.
- For a browser-only production session, prefer a backend-managed session or
  opaque refresh/session cookie with `HttpOnly`, `Secure` in HTTPS, an
  appropriate `SameSite` policy, narrow `Path`/domain, expiry, and CSRF
  defenses. Keep access-token/session issuance and revocation server-side.
- If initially using the existing bearer API for local development, hold the
  short-lived access token in memory only, send it over the configured API
  origin, and accept that a page reload requires login. Do not disguise this
  limitation as persistent secure authentication.
- Do not issue refresh tokens to JavaScript as a shortcut. Any cookie/BFF
  adaptation requires a reviewed backend contract, CORS and CSRF tests, and
  must preserve existing clients.
- Never put private API keys or backend secrets in `VITE_*` variables; all
  Vite-exposed variables are public.

The production cookie/session choice is a prerequisite for persistent web
sessions, not an instruction to change the current API as part of
documentation work.

## 4. Authorization model

Authentication answers “who is calling?” Authorization answers “may this
caller perform this action on this resource now?” Every protected API route
must enforce both.

| Operation | Citizen | Department Officer | Field Worker | Super Admin |
|---|---|---|---|---|
| Read own profile | Own | Own | Own | Own |
| Create complaint | Yes | Only if also explicitly acting as citizen, if supported | Same rule | Same rule |
| Read complaint | Own | Authorized department scope | Assigned work only | System-wide, audited for sensitive access |
| Edit citizen-submitted content | Own, allowed states only | No by default | No | Policy-defined, audited |
| Triage/set department | No | Within department scope | No | Yes, audited |
| Assign/reassign work | No | Within department scope | No | Yes, audited |
| Update assigned work/progress | No | Within department scope | Assigned work only | Policy-defined, audited |
| Submit resolution evidence | No | If authorized reviewer/worker | Assigned work only | Policy-defined |
| Verify/reject evidence | No | Authorized reviewer in scope | No | Yes or delegated reviewer |
| Manage roles/departments | No | No | No | Yes, strong controls and audit |
| Read aggregate analytics | Own-only summaries | Department scope | Assignment scope | System scope, privacy-safe |

This is the target matrix. Role combinations or delegations require explicit
policy. Enforce resource ownership and department membership in service-layer
queries or policy helpers, not only route names or frontend guards. Conceal
another citizen's resource with the same not-found response where current
behavior requires it.

## 5. Role provisioning and privilege changes

- Public registration creates only a Citizen.
- Create the initial administrator through the existing protected operational
  procedure; do not add a public bootstrap route.
- Privileged staff accounts require verified identity and an authorized
  provisioning process.
- Role changes require Super Admin authorization, re-authentication or
  equivalent step-up policy for sensitive deployments, reason capture, audit,
  and revocation/re-evaluation of existing sessions.
- Define how a user can hold more than one role before implementing role
  arrays or department membership. Avoid overloading one string role with
  department scope.

## 6. Transport, browser and API defenses

- Require HTTPS outside local development.
- Use a strict CORS allowlist for known web origins; CORS is not
  authentication.
- If cookies are used, set CSRF protections for state-changing requests and
  verify origin as appropriate.
- Apply rate limiting to login, verification, resend, and recovery endpoints;
  use a shared store before multi-instance production deployment.
- Validate all inputs and reject unexpected privilege-bearing fields.
- Prevent user enumeration through generic verification/recovery responses.
- Use secure headers, request-size limits, and safe structured logging.
- Keep authentication errors generic enough not to reveal account existence
  or sensitive internal state.

## 7. Test requirements

Test at minimum:

- registration always assigns Citizen; role/status injection is rejected;
- password hashing and safe profile serialization;
- verified/active login succeeds; wrong password, unverified, disabled, expired,
  revoked, and malformed credentials fail safely;
- OTP expiry, attempt limits, resend cooldown, and single-use behavior;
- reset-token expiry/single use and atomic password change;
- logout revocation semantics;
- every role/action row, cross-citizen reads, cross-department reads, and
  unassigned worker access;
- browser reload/session behavior and absence of tokens in persistent
  JavaScript-readable storage;
- cookie CSRF/CORS behavior if cookie sessions are adopted.

Do not claim live email, Atlas, or browser end-to-end authentication is tested
unless those services and flows were actually exercised.
