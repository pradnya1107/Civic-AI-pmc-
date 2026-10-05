# CivicAI PMC --- Features, API Endpoints & System Specification

## 1. Purpose

This document converts the approved requirements into an
implementation-level feature and API plan.

The APIs are proposed endpoints. Exact request/response schemas may be
refined during development.

## 2. User Roles

  Role                 Main responsibility
  -------------------- --------------------------------------
  Citizen              Create and track civic complaints
  Admin                Review, assign and manage complaints
  Department Officer   Work on assigned complaints
  Supervisor           Monitor performance and escalations

## 3. Core Features

### F01 --- Authentication

-   Register
-   Login
-   Refresh/logout
-   Role-based authorization
-   Profile

### F02 --- Complaint Submission

-   Create complaint
-   Upload image
-   Capture location
-   Add text
-   Save draft
-   Submit

### F03 --- AI Complaint Analysis

-   Detect civic issue
-   Category
-   Subcategory
-   Description
-   Confidence
-   Severity
-   Risk
-   Department recommendation

### F04 --- Citizen Confirmation

The citizen must be able to review AI output before final submission.

### F05 --- Complaint Tracking

-   Complaint ID
-   Current status
-   Timeline
-   Department
-   Priority
-   Evidence
-   Updates

### F06 --- Admin Management

-   Complaint list
-   Filters
-   Search
-   AI information
-   Assignment
-   Status update
-   Escalation

### F07 --- Department Workflow

-   Assigned complaint list
-   Start work
-   Add remarks
-   Upload proof
-   Submit resolution

### F08 --- AI Resolution Verification

Compare original evidence with resolution evidence and generate a
verification recommendation.

### F09 --- Duplicate Detection

Compare new complaint with existing complaints using: - semantic
similarity - category - geographic distance - time window

### F10 --- Analytics

-   Total complaints
-   Open/resolved
-   Severity distribution
-   Category distribution
-   Department workload
-   Average resolution time
-   Area hotspots

## 4. Proposed API Endpoints

Base URL:

``` text
/api/v1
```

### Authentication

``` http
POST /auth/register
POST /auth/login
POST /auth/refresh
POST /auth/logout
GET  /auth/me
```

### Users

``` http
GET   /users/me
PATCH /users/me
```

Admin:

``` http
GET /admin/users
PATCH /admin/users/{user_id}/role
```

### Complaints

``` http
POST /complaints
GET  /complaints
GET  /complaints/{complaint_id}
PATCH /complaints/{complaint_id}
DELETE /complaints/{complaint_id}
```

Citizen-specific:

``` http
GET /complaints/my
POST /complaints/{complaint_id}/reopen
POST /complaints/{complaint_id}/feedback
```

### Evidence

``` http
POST /complaints/{complaint_id}/evidence
GET  /complaints/{complaint_id}/evidence
DELETE /evidence/{evidence_id}
```

### AI Analysis

``` http
POST /ai/analyze-image
POST /ai/analyze-complaint
GET  /complaints/{complaint_id}/ai-analysis
POST /complaints/{complaint_id}/confirm-ai
```

Possible analysis response:

``` json
{
  "category": "Road",
  "subcategory": "Pothole",
  "description": "A large pothole is visible on the road.",
  "confidence": 0.94,
  "severity": 82,
  "risk_level": "HIGH",
  "risk_reason": "Potential vehicle and pedestrian safety hazard",
  "recommended_department": "Road Department"
}
```

### Duplicate Detection

``` http
POST /complaints/{complaint_id}/check-duplicates
GET  /complaints/{complaint_id}/similar
```

### Departments

``` http
GET  /departments
GET  /departments/{department_id}
GET  /departments/{department_id}/complaints
```

Admin:

``` http
POST /departments
PATCH /departments/{department_id}
```

### Assignment

``` http
POST /complaints/{complaint_id}/assign
POST /complaints/{complaint_id}/reassign
```

### Status

``` http
PATCH /complaints/{complaint_id}/status
GET   /complaints/{complaint_id}/timeline
```

Example:

``` json
{
  "status": "IN_PROGRESS",
  "remark": "Inspection team assigned."
}
```

### Resolution

``` http
POST /complaints/{complaint_id}/resolution
POST /complaints/{complaint_id}/resolution-evidence
POST /complaints/{complaint_id}/verify-resolution
```

### AI Resolution Verification

``` http
POST /ai/verify-resolution
GET  /complaints/{complaint_id}/resolution-verification
```

Possible result:

``` json
{
  "recommendation": "LIKELY_RESOLVED",
  "confidence": 0.91,
  "reason": "The visible road defect appears repaired in the submitted resolution image."
}
```

### Analytics

``` http
GET /analytics/overview
GET /analytics/categories
GET /analytics/severity
GET /analytics/departments
GET /analytics/areas
GET /analytics/trends
GET /analytics/hotspots
```

### AI Assistant --- Future

``` http
POST /assistant/chat
POST /assistant/understand-complaint
```

### Voice --- Future

``` http
POST /voice/transcribe
POST /voice/create-complaint
```

## 5. Complaint Status Model

``` text
DRAFT
   ↓
AI_ANALYZING
   ↓
CITIZEN_CONFIRMATION
   ↓
SUBMITTED
   ↓
UNDER_REVIEW
   ↓
ASSIGNED
   ↓
IN_PROGRESS
   ↓
RESOLUTION_SUBMITTED
   ↓
AI_VERIFICATION
   ↓
RESOLVED
```

Additional:

``` text
DUPLICATE
REJECTED
REOPENED
ESCALATED
```

## 6. Priority Model

Example:

``` text
severity_score: 0–100
```

Suggested interpretation:

``` text
0–29   LOW
30–59  MEDIUM
60–79  HIGH
80–100 CRITICAL
```

This is only a prototype policy and should be validated with domain
requirements.

## 7. Duplicate Detection Logic

A new complaint can be compared using:

``` text
Semantic similarity
        +
Location distance
        +
Category match
        +
Time window
```

Example:

``` text
Similarity = 0.91
Distance = 35 metres
Category = same
Time window = 3 days

→ Flag as possible duplicate
```

The system should recommend a duplicate rather than automatically
deleting a citizen report.

## 8. AI Confidence Policy

``` text
Confidence >= 0.90
→ High-confidence suggestion

0.70–0.89
→ Ask citizen/official to confirm

< 0.70
→ Require manual selection/review
```

These thresholds are initial design values and should be tested rather
than treated as guaranteed accuracy.

## 9. Security Requirements

-   Password hashing
-   JWT/session security
-   Role-based access control
-   HTTPS in deployment
-   CORS configuration
-   Request validation with Pydantic
-   File type validation
-   File size limits
-   Rate limiting
-   API authentication
-   Audit logs
-   Secure `.env` handling
-   No API keys in frontend code
-   Access control for evidence images
-   AI output validation
-   Protection against prompt injection through uploaded text
-   Minimal collection of personal data

## 10. Recommended Project Structure

``` text
civicai-pmc/
│
├── frontend/
│   ├── src/
│   └── ...
│
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── core/
│   │   ├── api/
│   │   ├── models/
│   │   ├── schemas/
│   │   ├── services/
│   │   ├── ai/
│   │   ├── repositories/
│   │   └── utils/
│   ├── tests/
│   ├── requirements.txt
│   └── .env.example
│
├── docs/
│   ├── 01-comparative-research.md
│   ├── 02-requirements-and-planning.md
│   └── 03-features-and-api-spec.md
│
├── .gitignore
└── README.md
```

## 11. Development Order

### Step 1

Create GitHub repository and documentation.

### Step 2

Create FastAPI backend.

### Step 3

Create PostgreSQL database and models.

### Step 4

Implement authentication.

### Step 5

Implement complaint creation.

### Step 6

Implement evidence/image upload.

### Step 7

Implement location.

### Step 8

Integrate Gemini AI.

### Step 9

Add AI category/description/confidence.

### Step 10

Add severity and department recommendation.

### Step 11

Build citizen dashboard.

### Step 12

Build admin dashboard.

### Step 13

Build department workflow.

### Step 14

Add duplicate detection.

### Step 15

Add resolution evidence and AI verification.

### Step 16

Add analytics and maps.

### Step 17

Test security, APIs and AI failure cases.

### Step 18

Deploy prototype and prepare competition demo.

## 12. Final Product Definition

The final prototype should be described as:

> **CivicAI PMC is a proposed AI-powered civic issue intelligence
> platform for Pune Municipal Corporation. It enables citizens to report
> civic issues using multimedia evidence and location, while AI assists
> in understanding, categorizing, prioritizing, identifying similar
> complaints, recommending responsible departments, and verifying
> resolution evidence. Municipal users receive structured workflows,
> dashboards and analytics to support faster and more informed civic
> issue management.**

## 13. Future India-Scale Direction

The project can later become:

``` text
CivicAI PMC
    ↓
CivicAI Maharashtra
    ↓
CivicAI India
```

The architecture should separate:

-   City configuration
-   Departments
-   Issue categories
-   Language configuration
-   Escalation rules
-   SLA rules
-   Geographic boundaries

This allows the same software architecture to support multiple
municipalities without hard-coding Pune-specific logic into every
module.

## 14. Conclusion

The immediate objective is not to build a complete nationwide government
platform.

The immediate objective is to prove a strong, technically feasible
**PMC-focused AI civic intelligence prototype** with a complete
citizen-to-resolution workflow.

The project can then expand through modular AI capabilities and city
configuration.
