# CivicAI PMC --- Requirement Gathering & Project Planning

## 1. Project Name

**CivicAI PMC --- AI-Powered Civic Issue Intelligence Platform**

## 2. Project Vision

Build a PMC-focused web/mobile-ready civic platform that helps citizens
report civic problems and uses AI to understand, verify, prioritize and
route those reports while giving municipal users useful analytics and
resolution-verification tools.

The first implementation will target **Pune Municipal Corporation
(PMC)**. The architecture should be configurable so the same core
platform can later support other Indian cities.

## 3. Problem Statement

Citizens need a simple way to report civic problems. Municipal teams
need structured, prioritized and actionable information.

A traditional complaint system mainly stores:

-   What the citizen reported
-   Where it happened
-   Complaint status

Our proposed platform adds an intelligence layer:

-   What is visible in the evidence?
-   How serious is it?
-   Is this complaint probably a duplicate?
-   Which department should handle it?
-   How reliable is the AI result?
-   Has the reported issue actually been resolved?
-   What areas have repeated problems?

## 4. Main Goals

### Goal 1 --- Easier Reporting

Allow a citizen to report an issue using photo, text and eventually
voice.

### Goal 2 --- AI Understanding

Convert unstructured citizen evidence into structured civic data.

### Goal 3 --- Better Prioritization

Estimate severity and risk so urgent issues can be reviewed first.

### Goal 4 --- Reduce Duplicate Work

Detect similar complaints around the same location/issue.

### Goal 5 --- Better Routing

Recommend the relevant PMC department using issue category and location.

### Goal 6 --- Better Accountability

Maintain an auditable complaint timeline and resolution evidence.

### Goal 7 --- Decision Support

Give administrators dashboards, maps and analytics.

## 5. Target Users

### Citizen

-   Register/login
-   Submit complaint
-   Upload evidence
-   Confirm AI result
-   Track complaint
-   Give feedback
-   Request reopening

### PMC/Admin User

-   Review complaints
-   View AI analysis
-   Confirm/modify category
-   Assign department
-   Change status
-   Monitor SLA/overdue cases
-   View analytics

### Department Officer

-   View assigned complaints
-   Update progress
-   Upload work/proof images
-   Add remarks
-   Mark work for verification

### Supervisor

-   Monitor department performance
-   Review escalations
-   Monitor unresolved/overdue complaints
-   View area-level analytics

## 6. Functional Requirements

### Authentication

-   Citizen registration/login
-   Role-based access
-   Secure password storage
-   Token-based authentication
-   Admin/officer authorization

### Complaint Creation

A complaint should support:

-   Title/issue
-   Optional citizen description
-   Image/evidence
-   Location
-   Timestamp
-   Category
-   AI-generated category
-   AI confidence
-   Severity
-   Status

### AI Analysis

The AI service should produce structured output:

``` json
{
  "category": "Road",
  "subcategory": "Pothole",
  "description": "Large pothole visible on the road.",
  "severity": 82,
  "risk": "Vehicle and pedestrian safety risk",
  "confidence": 0.94,
  "recommended_department": "Road Department"
}
```

The exact category taxonomy should be finalized with the mentor/team
before implementation.

## 7. Complaint Lifecycle

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

Alternative states:

``` text
REJECTED
DUPLICATE
REOPENED
ESCALATED
```

## 8. AI Requirements

### Phase 1

-   Image understanding
-   Category/subcategory
-   Description generation
-   Confidence
-   Severity
-   Department recommendation

### Phase 2

-   Duplicate detection using embeddings + location
-   Multilingual understanding
-   AI chatbot
-   Complaint summarization
-   Spam/evidence-quality checks

### Phase 3

-   Voice complaint
-   Before/after image verification
-   Predictive analytics
-   Hotspot forecasting

## 9. Non-Functional Requirements

### Security

-   JWT/session security
-   Password hashing
-   Role-based authorization
-   Input validation
-   File-type and file-size validation
-   Rate limiting
-   Secure environment variables
-   Audit logs

### Reliability

-   AI failures must not lose complaints.
-   AI output must be validated before database insertion.
-   Low-confidence AI results require confirmation.
-   APIs should return clear error messages.

### Performance

-   Fast normal API responses.
-   AI operations may be asynchronous.
-   Large files should not block normal API requests.

### Maintainability

-   Modular FastAPI backend
-   Service/repository separation
-   API versioning
-   Environment-based configuration
-   Automated API documentation
-   Tests for important services

## 10. Proposed Technology Stack

### Frontend

-   React
-   Vite
-   JavaScript
-   Tailwind CSS
-   Leaflet/OpenStreetMap for maps

### Backend

-   Python
-   FastAPI
-   Pydantic
-   SQLAlchemy

### Database

-   PostgreSQL
-   pgvector for similarity/embedding search

### AI

-   Google Gemini for initial multimodal AI
-   Embedding model for similarity/duplicate detection
-   Speech-to-text provider/model for future voice support

### Storage

-   Cloud/object storage for evidence images

### Development

-   Git
-   GitHub
-   VS Code
-   Postman/Thunder Client
-   pytest

## 11. High-Level Architecture

``` text
React Frontend
      |
      | HTTPS / JSON
      ↓
FastAPI Backend
      |
      +---- Authentication
      |
      +---- Complaint Service
      |
      +---- AI Service
      |       +-- Vision
      |       +-- Severity
      |       +-- Duplicate Detection
      |       +-- NLP
      |
      +---- Location Service
      |
      +---- Notification Service
      |
      +---- Analytics Service
      |
      ↓
PostgreSQL + pgvector
      |
      ↓
Object Storage
```

## 12. MVP Boundary

The first working version should contain:

1.  Authentication
2.  Citizen complaint creation
3.  Image upload
4.  Location
5.  Gemini AI analysis
6.  Category/subcategory
7.  Severity
8.  AI description
9.  Citizen confirmation
10. Admin dashboard
11. Department assignment
12. Complaint status tracking
13. Basic analytics

Do not attempt every advanced feature in the first sprint.

## 13. Future Scope

The architecture should allow:

-   Other PMC departments
-   Other Indian municipal corporations
-   Multi-city configuration
-   More Indian languages
-   Voice reporting
-   AI chatbot
-   Duplicate clustering
-   Predictive maintenance
-   Civic hotspot prediction
-   IoT integration
-   Existing municipal-system integrations
-   Public transparency dashboards
-   Privacy-preserving city analytics

## 14. Success Criteria

The prototype will be considered successful if a test citizen can:

1.  Login.
2.  Upload a civic issue image.
3.  Confirm location.
4.  Receive structured AI analysis.
5.  Confirm the AI suggestion.
6.  Submit a complaint.
7.  See a complaint ID.
8.  Track status.

And an authorized municipal user can:

1.  See the complaint.
2.  See AI analysis and confidence.
3.  See severity.
4.  See recommended department.
5.  Assign/update status.
6.  View evidence.
7.  See basic analytics.

## 15. Planning Conclusion

The first release is a **PMC-focused AI civic complaint intelligence
prototype**, not a nationwide municipal replacement.

The project will first prove the complete citizen-to-administration
workflow in Pune. After the core workflow is stable, AI verification,
multilingual interaction, duplicate detection, predictive analytics and
multi-city support can be added incrementally.
