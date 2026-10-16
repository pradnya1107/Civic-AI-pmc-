# CivicAI — GitHub Issue Index

> **Milestone:** [10-Day Delivery Plan](https://github.com/pradnya1107/Civic-AI-pmc-/milestone/1)  
> **Repo:** [pradnya1107/Civic-AI-pmc-](https://github.com/pradnya1107/Civic-AI-pmc-)  
> **Goal:** Fully working CivicAI application in 10 days.

---

## Issue List

| Day | Issue # | Title | Priority | Labels | Status | Depends On |
|-----|---------|-------|----------|--------|--------|------------|
| 1 | [#4](https://github.com/pradnya1107/Civic-AI-pmc-/issues/4) | ISSUE-01: Project Setup and Foundations | High | `setup` `infrastructure` `day-1` | Open | - |
| 2 | [#5](https://github.com/pradnya1107/Civic-AI-pmc-/issues/5) | ISSUE-02: Database Models and MongoDB Connection | High | `database` `backend` `day-2` | Open | #4 |
| 3 | [#6](https://github.com/pradnya1107/Civic-AI-pmc-/issues/6) | ISSUE-03: Authentication System (Register, Login, JWT, RBAC) | High | `auth` `security` `backend` `day-3` | Open | #4, #5 |
| 4 | [#7](https://github.com/pradnya1107/Civic-AI-pmc-/issues/7) | ISSUE-04: Complaint Module - Citizen CRUD | High | `complaint` `feature` `backend` `day-4` | Open | #5, #6 |
| 5 | [#8](https://github.com/pradnya1107/Civic-AI-pmc-/issues/8) | ISSUE-05: Admin Complaint Management (Verify, Assign, Status Update) | High | `admin` `complaint` `backend` `day-5` | Open | #6, #7 |
| 6 | [#9](https://github.com/pradnya1107/Civic-AI-pmc-/issues/9) | ISSUE-06: React + Vite Web Frontend Scaffold and Citizen Auth UI | High | `frontend` `auth` `day-6` | Open | #6 |
| 7 | [#10](https://github.com/pradnya1107/Civic-AI-pmc-/issues/10) | ISSUE-07: Citizen Complaint UI (Submit, List, Detail, Track) | High | `complaint` `frontend` `feature` `day-7` | Open | #7, #9 |
| 8 | [#11](https://github.com/pradnya1107/Civic-AI-pmc-/issues/11) | ISSUE-08: Admin Dashboard UI and In-App Notification System | Medium | `admin` `notifications` `frontend` `day-8` | Open | #8, #10 |
| 9 | [#12](https://github.com/pradnya1107/Civic-AI-pmc-/issues/12) | ISSUE-09: AI Service Integration (Category, Priority, Summary Suggestions) | Medium | `ai` `backend` `day-9` | Open | #7, #8 |
| 10 | [#13](https://github.com/pradnya1107/Civic-AI-pmc-/issues/13) | ISSUE-10: Testing Suite, CI/CD Pipeline, and Production Deployment | High | `testing` `ci-cd` `deployment` `monitoring` `day-10` | Open | #4-#12 |

---

## Dependency Diagram

```
#4  ISSUE-01: Project Setup
 +-- #5  ISSUE-02: Database Models
 |    +-- #6  ISSUE-03: Auth System
 |         +-- #7  ISSUE-04: Complaint CRUD (backend)
 |         |    +-- #8  ISSUE-05: Admin Management
 |         |    |    +-- #11 ISSUE-08: Admin Dashboard UI
 |         |    +-- #12 ISSUE-09: AI Integration
 |         +-- #9  ISSUE-06: Frontend Scaffold
 |              +-- #10 ISSUE-07: Complaint UI
 |                   +-- #11 ISSUE-08: Admin Dashboard UI
 +-- #13 ISSUE-10: Testing + CI/CD + Deployment (depends on all above)
```

---

## Labels Created

| Label | Purpose |
|-------|---------|
| `priority:high` | High priority - must not be skipped |
| `priority:medium` | Medium priority - important but can slip 1 day |
| `status:open` | Issue is open and in progress |
| `setup` | Repo and environment setup |
| `infrastructure` | CI/CD, tooling, config |
| `backend` | Express API and services |
| `database` | MongoDB models |
| `auth` | Authentication and authorization |
| `security` | Security hardening |
| `frontend` | React/Vite web client |
| `feature` | Product feature |
| `complaint` | Complaint module |
| `admin` | Admin dashboard |
| `ai` | AI service |
| `notifications` | Notification system |
| `testing` | Tests and QA |
| `ci-cd` | CI/CD pipeline |
| `deployment` | Production deployment |
| `monitoring` | Observability and health |
| `day-1` to `day-10` | Day tag |

---

## How to Work Through an Issue

1. **Pick the next open issue** in day order.
2. **Create a branch** from `main`:
   ```bash
   git checkout -b feature/issue-01-project-setup
   ```
3. **Work through the Tasks checklist** in the issue body.
4. **Open a PR** referencing the issue (`Closes #4`).
5. **Mark the issue closed** after the PR merges.

---

## Re-create Issues via CLI (if needed)

```bash
# Install gh CLI
winget install --id GitHub.cli -e

# Authenticate
gh auth login

# List all issues
gh issue list --state all --limit 100

# Create a single issue from a file
gh issue create \
  --title "ISSUE-01: Project Setup and Foundations" \
  --body-file docs/Issues/issue-01.md \
  --label "setup,infrastructure,day-1,priority:high" \
  --milestone "10-Day Delivery Plan"
```

---

*Last updated: 2026-10-13 - all 10 issues live on GitHub.*
