# CivicAI PMC — Team Workflow

## 1. Team ownership

| Member | Role and primary ownership | Review partners |
|---|---|---|
| Member 1 | Project Lead; backend authentication, security, API integration, release coordination | Affected backend/frontend owner; security-aware review for auth/security changes |
| Member 2 | React frontend and UI/UX | Member 1 for API/auth integration; Member 4 for documentation that changes user flows |
| Member 3 | Complaint-management backend and complaint workflow | Member 1 for authorization/security; Member 4 for contract/documentation alignment |
| Member 4 | AI intelligence prototype and technical documentation | Member 1 for security/integration; Member 3 for complaint-domain contracts |

Ownership identifies responsibility, not exclusive access. The member who
opens a PR cannot be its sole reviewer. Changes crossing boundaries must name
the affected owners in the PR.

The repository currently has a pnpm-managed backend under `apps/backend` and
an npm-managed Expo application under `apps/mobile`; there is no confirmed root
workspace convention. Do not replace the existing mobile app when introducing
the target React/Vite web client.

## 2. Branch strategy

| Branch | Purpose | Allowed changes |
|---|---|---|
| `main` | Stable, reviewed releases only | Release PRs from `dev`; no unfinished feature work or direct pushes |
| `dev` | Shared integration branch | Completed, tested feature PRs; no direct pushes |
| `feature/backend-auth` | Member 1's authentication/security/integration work | Focused auth/security changes, with security review |
| `feature/frontend-ui` | Member 2's React frontend/UI work | Focused frontend/UI work |
| `feature/complaint-management` | Member 3's complaint API/workflow work | Focused complaint-domain work |
| `feature/ai-intelligence` | Member 4's AI prototype/documentation work | Focused AI/documentation work |

Feature branches start from `dev` and merge into `dev` by pull request. Release
work moves from `dev` to `main` only after integration checks pass and the
release is approved. Hotfixes to `main` require an urgent, reviewed PR and a
follow-up merge/cherry-pick into `dev` so the fix is not lost.

### Existing branch inventory and safe transition

At the last repository inspection, `main`, `dev`, and
`feature/backend-auth` existed locally and remotely. The remote also had
`feature/mobile-ui`, `feature/ai-complaint`, and `feature/docker-setup`.
`feature/frontend-ui`, `feature/complaint-management`, and
`feature/ai-intelligence` were not present in the inspected refs. The requested
names therefore do not exactly match every existing remote feature branch.

Do not rename, reset, recreate, delete, or force-push any existing branch just
to match this naming plan. Before using a requested name, its owner should
compare the existing branch's commits and worktree with `dev`, coordinate with
the current branch owner, and decide whether to continue the existing branch
or create a new branch from `dev`. Keep remote work intact during that
transition.

## 3. Starting and updating a feature branch

Before switching branches, check and preserve local changes. Commit the work
to its intended branch or use a deliberate, documented stash; never discard
someone else's changes.

Create a new feature branch only after confirming the name is not already in
use and the owner has inspected similarly named remote work:

```powershell
git status --short --branch
git fetch origin
git switch dev
git pull --ff-only origin dev
git switch -c feature/<name>
git push -u origin feature/<name>
```

To update an existing feature branch with integration changes, use a merge so
shared branch history is not rewritten:

```powershell
git status --short --branch
git fetch origin
git switch feature/<name>
git merge origin/dev
```

Resolve conflicts deliberately, run the affected checks, then push the
feature branch:

```powershell
git push origin feature/<name>
```

If the branch already exists only on the remote, inspect it before tracking
it:

```powershell
git fetch origin
git branch -r
git switch --track origin/feature/<existing-name>
```

Do not rebase or force-push a branch used by another team member. If a branch
is already behind or has conflicts, merge `origin/dev` into it and coordinate
with its contributors.

## 4. Issues and acceptance criteria

Create an issue for each feature, bug, or security concern. Use the templates
in `.github/ISSUE_TEMPLATE/`. Split work into independently testable units and
link each implementation PR to its issue.

Every issue must state:

- **Problem and context:** current behavior, intended users, and why the change
  is needed.
- **Scope:** what is included and explicitly out of scope.
- **Acceptance criteria:** observable, testable Given/When/Then outcomes or an
  equivalent checklist; include validation and authorization boundaries.
- **Test plan:** automated tests, manual checks, and expected failure cases.
- **Dependencies and data impact:** API/schema changes, migration/backfill,
  compatibility, rollout, and rollback where applicable.
- **Security/privacy:** roles affected, personal data touched, upload or
  external-service risks, and whether security review is needed.

An issue is ready to close only when its acceptance criteria are met, relevant
tests pass, documentation is updated, and any follow-up work is linked.

Never include passwords, tokens, OTPs, connection strings, personal data, or
unpublished vulnerability details in public issues. Use private vulnerability
reporting for sensitive security reports.

## 5. Commit-message conventions

Use Conventional Commit-style messages:

```text
<type>(<scope>): <imperative summary>
```

Examples:

```text
feat(auth): add account lockout policy
fix(complaints): reject invalid status transitions
docs(workflow): define feature branch process
test(api): cover cross-department access
```

Use a short imperative subject. Common types: `feat`, `fix`, `docs`, `test`,
`refactor`, `perf`, `build`, `ci`, and `chore`. Add a body for rationale,
behavior changes, or migration notes. Mark breaking changes with `!` and
describe the migration (for example, `feat(api)!: change complaint response
envelope`). Never put credentials or personal data in commit messages.

## 6. Pull request requirements

- Open PRs from `feature/*` into `dev`; release PRs go from `dev` into `main`.
- Keep a PR focused, small enough to review, and linked to its issue.
- Use a draft PR for early feedback; mark ready only when implementation,
  docs, and tests are complete.
- Include purpose, user-visible behavior, affected modules, screenshots for
  UI changes, API/schema details, migration/rollback, security/privacy impact,
  exact checks and results, and manual checks still required.
- Do not include generated build output, local `.env` files, credentials, or
  unrelated formatting.
- Resolve review conversations and update the PR after requested changes.
- The author must not approve their own PR. Obtain at least one approval from
  an affected team member; auth, authorization, uploads, or secret-handling
  changes require Member 1 or another security-aware reviewer.
- Merge only after required checks pass, approval is current, and no blocking
  review comments remain. Use the repository's configured merge method.
- Do not merge unfinished feature work into `main`. Release PRs must summarize
  included features, known limitations, and rollback plan.

## 7. Testing before merge

Run all checks relevant to changed files and record actual results:

- Backend: build, TypeScript/test typecheck, focused unit/API tests, and
  `git diff --check`.
- Frontend: install from its lockfile, type/lint checks if configured,
  production build, and relevant UI/API tests.
- Mobile: run its existing checks when shared API behavior or mobile code
  changes.
- Database: schema/migration and authorization tests with disposable test
  data; transaction tests require a replica-set-capable fixture.
- Integrations: mock email, AI, and storage providers in automated tests.
  Live-provider behavior must be labeled untested unless actually exercised.

Required CI checks should be made branch-protection rules only after stable
workflow jobs exist. The repository had no GitHub Actions workflows at the
last inspection; do not configure a required status check that cannot report.
Once configured, create/use a `security` label for public, non-sensitive
hardening issues; private vulnerability reports should not be mirrored into a
public issue until disclosure is coordinated.

## 8. Code review and merging

Reviewers check correctness, scope, security, readability, tests, API
compatibility, migration safety, and documentation. For authorization changes,
review negative cases (wrong role, wrong owner, wrong department, invalid
state) rather than only the happy path.

Recommended merge sequence:

1. Feature PR passes review and checks, then merges into `dev`.
2. Integration checks run on `dev`; resolve regressions with a focused PR.
3. Project Lead approves a release PR from `dev` to `main`.
4. After release, verify deployment and key workflows with non-production
   accounts, then record the release/tag according to the team's release
   process.

No branch should be force-pushed or deleted as a shortcut around review.

## 9. Branch protection recommendations

Configure GitHub rulesets or branch protection for `main` and `dev`:

- Require pull requests; prohibit direct pushes.
- Require at least one approval from someone other than the author.
- Dismiss stale approvals when new commits change reviewed code.
- Require all PR conversations to be resolved.
- Require the branch to be up to date with its base before merging.
- Require successful CI checks once workflows exist (backend build/typecheck/
  tests; frontend checks when added).
- Block force pushes and branch deletion; apply rules to administrators too
  where the GitHub plan/team policy permits.
- For `main`, additionally require release-owner approval and all release
  checks. Keep `dev` protected from unreviewed integration changes.

Feature branches can remain unprotected if individually owned and short-lived;
protect a shared feature branch if multiple contributors push to it. Do not
enable merge queue, signed-commit enforcement, or other checks until the team
has configured and tested the corresponding workflow. Protection is a GitHub
setting and is not established by this document.

## 10. Four-member onboarding checklist

- [ ] **Project Lead (Member 1):** confirm GitHub access and
  `feature/backend-auth` ownership; review current authentication/security
  work before updating it; coordinate integration and release PRs.
- [ ] **Frontend/UI owner (Member 2):** confirm whether existing
  `feature/mobile-ui` work is active before using `feature/frontend-ui`; agree
  the frontend location and package manager before adding a web app.
- [ ] **Complaint workflow owner (Member 3):** inspect `dev` and current
  complaint code; create `feature/complaint-management` from `dev` only after
  confirming no unlisted remote/shared work exists.
- [ ] **AI/documentation owner (Member 4):** inspect existing
  `feature/ai-complaint` work before using `feature/ai-intelligence`; keep AI
  work advisory and align documentation with implemented contracts.
- [ ] All members: enable two-factor authentication, clone the repository,
  confirm `git status --short --branch`, fetch current refs, and verify the
  assigned branch's upstream before making changes.
- [ ] All members: configure Git identity, install only the relevant app's
  dependencies from its lockfile, run baseline checks, and learn the issue/PR
  templates and private security reporting path.
- [ ] All members: never commit `.env` files or secrets; review staged paths
  (`git diff --cached --name-only`) before every commit and report suspected
  credential exposure privately.

## 11. Contract-first integration

For changes shared by frontend/mobile/backend:

1. Agree request/response shape, role permissions, status codes, and error
   behavior in the API documentation or issue.
2. Add/update backend validation and contract tests.
3. Implement backend behavior and preserve compatible existing clients.
4. Integrate clients against the documented contract; do not create mock
   success behavior in a real flow.
5. Run targeted checks for each affected app and one cross-boundary test where
   available.
6. Update documentation when behavior changes.

Backend `apps/backend/API.md` records current behavior. `Docs/API.md` records
the target inventory and explicitly distinguishes planned endpoints. Update
both when an endpoint changes, keeping current and proposed statements
consistent.

## 12. Security, documentation, and release

- Keep `.env` files, credentials, tokens, production data, and private
  diagnostic output out of commits, screenshots, issues, and logs.
- Use safe placeholders in examples. Rotate any credential confirmed exposed.
- Do not weaken validation, authentication, authorization, rate limits, or
  TLS to make a test pass.
- Do not use destructive database commands against shared or production
  environments.
- Review dependency changes for necessity and compatibility; do not apply
  forced mass upgrades.
- Update the owning API, architecture, database, authentication, or environment
  document with code changes; distinguish planned behavior from implemented.
- Release schema changes in a backwards-compatible order when multiple
  deployments or clients overlap. Provide a rollback or mitigation note for
  migrations, auth behavior changes, uploads, and external integrations.
