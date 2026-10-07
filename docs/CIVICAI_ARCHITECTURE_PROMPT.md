# CivicAI — Production-Ready Full-Stack Monorepo Prompt

You are a **Senior Full-Stack Architect, Production Engineer, Security Engineer, and AI Application Architect**.

I am building **CivicAI**, a civic issue reporting and management platform focused initially on **Pune Municipal Corporation (PMC)**.

The application should be designed as a **production-ready, scalable, secure, clean, simple, and beginner-understandable full-stack monorepo**.

Do NOT over-engineer the project. Build a strong foundation that can be expanded after the MVP.

---

# 1. PROJECT OBJECTIVE

CivicAI is a platform where citizens can:

* Register and log in
* Report civic issues
* Upload issue photos
* Provide location/details
* Track complaint status
* Receive updates
* Get AI-assisted guidance
* View their submitted complaints

Authorized PMC/admin users should be able to:

* View complaints
* Verify complaints
* Categorize complaints
* Assign complaints
* Change complaint status
* Manage reported issues
* Monitor complaint statistics
* View AI-generated insights

The platform should use AI to assist with civic complaint processing rather than blindly making decisions.

AI should support features such as:

* Complaint categorization
* Priority/severity suggestion
* Complaint summarization
* Duplicate/similar complaint detection
* Citizen assistance/chatbot
* Basic image/description analysis where appropriate

Human/admin verification must remain available for important decisions.

---

# 2. REQUIRED TECHNOLOGY STACK

## Frontend

Use:

* React
* Vite
* JavaScript
* Tailwind CSS
* React Router
* Axios
* Modern component-based architecture

The frontend must be:

* Responsive
* Mobile-first
* Clean
* Accessible
* Easy to understand
* Suitable for future PWA/mobile conversion

---

# 3. BACKEND

Use:

* Node.js
* Express.js
* JavaScript
* REST API
* Mongoose

Backend responsibilities:

* Authentication
* Authorization
* User management
* Complaint management
* File/image upload handling
* Validation
* API responses
* Error handling
* Security
* Database communication
* AI service communication

---

# 4. DATABASE

Use:

**MongoDB + Mongoose**

Design the database for scalability.

Initial collections/models:

```text
User
Complaint
Department
Notification
AIAnalysis
AuditLog
```

Do not create unnecessary models unless they are actually required.

Each model should have:

* Proper validation
* Timestamps
* Appropriate indexes
* Clear relationships/reference fields
* Secure handling of sensitive information

---

# 5. AI SERVICE

Create AI as a separate service instead of putting all AI logic directly inside the Node.js backend.

Use:

**Python + FastAPI**

The architecture should be:

```text
React Frontend
       ↓
Node.js / Express API
       ↓
MongoDB
       ↓
Python / FastAPI AI Service
       ↓
Gemini / Selected AI Provider
```

The Node.js backend should communicate with the AI service through internal APIs.

AI service should contain separate modules for:

```text
classification
summarization
priority analysis
duplicate detection
citizen assistant
```

Keep AI provider-specific code isolated so that the AI provider can be replaced later.

---

# 6. MONOREPO STRUCTURE

Create the following base structure:

```text
civic-ai/
│
├── README.md
├── .gitignore
├── .env.example
├── docker-compose.yml
│
├── docs/
│   ├── README.md
│   ├── problem-statement.md
│   ├── proposed-solution.md
│   ├── requirements.md
│   ├── srs.md
│   ├── scope.md
│   ├── user-roles.md
│   ├── use-cases.md
│   ├── feature-priority.md
│   ├── architecture.md
│   ├── database-design.md
│   ├── api-documentation.md
│   ├── ai-architecture.md
│   ├── security.md
│   ├── testing.md
│   ├── deployment.md
│   ├── development-roadmap.md
│   └── decisions.md
│
├── frontend/
│   ├── package.json
│   ├── vite.config.js
│   ├── index.html
│   ├── public/
│   │
│   └── src/
│       ├── assets/
│       ├── components/
│       ├── layouts/
│       ├── pages/
│       ├── routes/
│       ├── services/
│       ├── hooks/
│       ├── context/
│       ├── utils/
│       ├── constants/
│       ├── App.jsx
│       └── main.jsx
│
├── backend/
│   ├── package.json
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── utils/
│   │   ├── validators/
│   │   ├── constants/
│   │   ├── app.js
│   │   └── server.js
│   │
│   └── tests/
│
├── ai-service/
│   ├── requirements.txt
│   ├── .env.example
│   ├── app/
│   │   ├── main.py
│   │   ├── config/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── models/
│   │   ├── schemas/
│   │   ├── prompts/
│   │   └── utils/
│   │
│   └── tests/
│
├── scripts/
│   ├── setup/
│   ├── database/
│   └── development/
│
└── .github/
    ├── workflows/
    └── pull_request_template.md
```

---

# 7. DOCUMENTATION-FIRST APPROACH

Before generating application code, create the documentation structure.

The `docs/` folder should explain:

### problem-statement.md

Explain:

* Current civic issue reporting problem
* Problems faced by citizens
* Problems faced by authorities
* Existing limitations
* Why CivicAI is needed

### proposed-solution.md

Explain:

* CivicAI solution
* How citizens interact with the platform
* How administrators interact with it
* Where AI is used
* Expected benefits

### requirements.md

Separate:

```text
Functional Requirements
Non-Functional Requirements
System Requirements
Security Requirements
AI Requirements
```

### feature-priority.md

Create:

```text
MUST HAVE
SHOULD HAVE
NICE TO HAVE
```

Do not allow Nice-to-Have features to block the MVP.

### architecture.md

Explain:

```text
Frontend
   ↓
Backend API
   ↓
MongoDB
   ↓
AI Service
   ↓
AI Provider
```

Include a Mermaid architecture diagram.

### database-design.md

Include:

* Collections
* Fields
* Relationships
* Indexes
* Data flow

Include an ER-style Mermaid diagram where appropriate.

### api-documentation.md

Document:

* Authentication endpoints
* User endpoints
* Complaint endpoints
* Admin endpoints
* Notification endpoints
* AI endpoints

For every API document:

```text
Method
Endpoint
Purpose
Authentication
Request
Response
Possible Errors
```

### security.md

Document:

* JWT authentication
* Password hashing
* Role-based authorization
* Input validation
* Rate limiting
* CORS
* Secure headers
* Environment variables
* File upload validation
* API security
* AI security
* Audit logging

---

# 8. USER ROLES

Initially support:

### Citizen

Can:

* Register/login
* Create complaint
* Upload evidence
* Track complaint
* View complaint history
* Receive notifications
* Use AI assistant

### Admin / PMC Officer

Can:

* Login
* View complaints
* Verify complaints
* Categorize complaints
* Assign complaints
* Update status
* View statistics
* Review AI suggestions

### Super Admin

Can:

* Manage users
* Manage departments
* Manage admin accounts
* View audit logs
* Configure system-level settings

Use role-based access control.

---

# 9. COMPLAINT WORKFLOW

Implement a clear workflow:

```text
Citizen submits complaint
        ↓
Complaint created
        ↓
AI analyzes complaint
        ↓
Category suggested
        ↓
Priority suggested
        ↓
Admin reviews
        ↓
Verified
        ↓
Assigned to department
        ↓
In Progress
        ↓
Resolved
        ↓
Citizen notified
        ↓
Citizen confirms / provides feedback
        ↓
Closed
```

Use appropriate status constants instead of arbitrary strings throughout the codebase.

---

# 10. BACKEND API STRUCTURE

Use versioned APIs:

```text
/api/v1/auth
/api/v1/users
/api/v1/complaints
/api/v1/admin
/api/v1/departments
/api/v1/notifications
/api/v1/ai
```

Example:

```text
POST   /api/v1/auth/register
POST   /api/v1/auth/login
GET    /api/v1/auth/me

POST   /api/v1/complaints
GET    /api/v1/complaints
GET    /api/v1/complaints/:id
PATCH  /api/v1/complaints/:id
DELETE /api/v1/complaints/:id

GET    /api/v1/admin/complaints
PATCH  /api/v1/admin/complaints/:id/status
PATCH  /api/v1/admin/complaints/:id/assign
```

Do not expose sensitive database implementation details through APIs.

---

# 11. FRONTEND PAGES

Create a clean mobile-first UI.

Initial pages:

```text
/
 /login
 /register

 /dashboard
 /report-issue
 /complaints
 /complaints/:id
 /notifications
 /profile
 /ai-assistant

 /admin
 /admin/complaints
 /admin/complaints/:id
 /admin/users
 /admin/departments
 /admin/analytics
```

Use protected routes for authenticated pages.

Use role-based routes for admin pages.

---

# 12. FRONTEND COMPONENT ARCHITECTURE

Create reusable components such as:

```text
Button
Input
Modal
Navbar
Sidebar
Card
StatusBadge
ComplaintCard
ComplaintForm
FileUploader
LoadingSpinner
ErrorMessage
EmptyState
Pagination
ProtectedRoute
```

Avoid duplicating UI logic.

---

# 13. AUTHENTICATION

Implement:

```text
Register
Login
Logout
Current User
JWT authentication
Password hashing
Protected routes
Role-based authorization
```

Do not hardcode secrets.

Use:

```text
.env
.env.example
```

Never commit real API keys.

---

# 14. SECURITY REQUIREMENTS

Implement production-minded security:

* Helmet
* CORS configuration
* Rate limiting
* Request validation
* Sanitization
* Secure password hashing
* JWT expiration
* Role-based authorization
* File type validation
* File size limits
* Error handling without leaking secrets
* Environment variables
* Audit logs for important admin actions

Do not store passwords in plain text.

Do not expose API keys to the frontend.

---

# 15. AI SAFETY

AI output must NOT automatically make critical administrative decisions.

For example:

```text
AI suggests:
Category = Road Damage
Priority = High
Confidence = 0.87
```

Admin can verify or modify the result.

Store AI analysis separately from the original citizen complaint.

AI responses should be treated as suggestions, not authoritative facts.

Implement graceful AI failure handling:

```text
AI available
AI temporarily unavailable
AI timeout
Invalid AI response
Low confidence
```

The main complaint system should continue working even if the AI service is unavailable.

---

# 16. ERROR HANDLING

Use a consistent API response structure.

Example success:

```json
{
  "success": true,
  "message": "Complaint created successfully",
  "data": {}
}
```

Example error:

```json
{
  "success": false,
  "message": "Unable to create complaint",
  "error": {
    "code": "VALIDATION_ERROR"
  }
}
```

Create centralized error-handling middleware.

---

# 17. ENVIRONMENT VARIABLES

Create `.env.example` files.

Example:

```env
NODE_ENV=development
PORT=5000

MONGODB_URI=

JWT_SECRET=
JWT_EXPIRES_IN=

AI_SERVICE_URL=

CORS_ORIGIN=
```

AI service:

```env
APP_ENV=development
PORT=8000

GEMINI_API_KEY=
```

Never put real credentials into the repository.

---

# 18. TESTING

Prepare structure for:

### Backend

* Unit tests
* API tests
* Authentication tests
* Authorization tests
* Complaint workflow tests

### AI

* AI response validation
* Invalid response handling
* Timeout handling
* Low-confidence handling

### Frontend

* Component testing
* Form validation
* Protected route testing

---

# 19. DEVELOPMENT PHASES

Design the project according to this roadmap:

## Phase 1 — Foundation

* Monorepo
* Documentation
* GitHub
* Frontend setup
* Backend setup
* MongoDB connection
* Environment configuration

## Phase 2 — Authentication

* Register
* Login
* JWT
* Roles
* Protected routes

## Phase 3 — Core Civic Complaint MVP

* Create complaint
* Upload evidence
* View complaint
* Track status
* Admin complaint management

## Phase 4 — AI Integration

* Classification
* Priority suggestion
* Summarization
* Duplicate detection
* AI assistant

## Phase 5 — Admin Dashboard

* Statistics
* Complaint management
* Department assignment
* Status management

## Phase 6 — Testing & Security

* API testing
* Security testing
* AI failure testing
* Edge cases
* Responsive testing

## Phase 7 — Deployment

* Production environment
* Database
* Backend
* Frontend
* AI service
* Environment variables

---

# 20. MVP REQUIREMENT

The MVP must be achievable by the internal deadline.

The minimum end-to-end flow must be:

```text
Citizen
 ↓
Register/Login
 ↓
Create Civic Complaint
 ↓
Store in MongoDB
 ↓
Admin Login
 ↓
View Complaint
 ↓
Update Status
 ↓
Citizen Tracks Complaint
```

Then integrate AI without breaking this workflow.

---

# 21. CODE QUALITY

Follow these rules:

* Clean code
* Meaningful names
* Small reusable functions
* Separation of concerns
* No unnecessary abstraction
* No duplicate code
* No hardcoded secrets
* No hardcoded URLs
* Centralized configuration
* Centralized error handling
* Environment-based configuration
* Consistent API structure
* Consistent folder conventions

Use comments only where they improve understanding.

---

# 22. GIT WORKFLOW

Use:

```text
main
develop

feature/frontend
feature/backend
feature/ai
feature/auth
feature/admin
feature/testing
```

Do not commit directly to `main`.

Create meaningful commits such as:

```text
feat: add user authentication
feat: add complaint creation API
feat: add admin complaint dashboard
feat: integrate AI classification
fix: handle complaint validation error
docs: update API documentation
```

---

# 23. IMPORTANT DEVELOPMENT RULE

Do NOT generate the entire project blindly in one huge response.

Work in stages.

### Stage 1

Generate:

```text
Project architecture
Folder structure
Documentation structure
Technology decisions
Data flow
System architecture
```

### Stage 2

Generate:

```text
docs/*.md
```

### Stage 3

Generate:

```text
Backend foundation
Database
Authentication
```

### Stage 4

Generate:

```text
Complaint module
Admin module
```

### Stage 5

Generate:

```text
Frontend
```

### Stage 6

Generate:

```text
AI service
```

### Stage 7

Generate:

```text
Testing
Security
Deployment
```

After each stage, verify that the previous stage works before moving forward.

---

# 24. BEGIN NOW

Start with **Stage 1 only**.

Do NOT generate all application code yet.

Give me:

1. Final recommended architecture
2. Complete monorepo folder tree
3. Explanation of every major folder
4. Technology choices and reasons
5. System data flow
6. Authentication flow
7. Complaint workflow
8. AI workflow
9. MongoDB collection overview
10. API module overview
11. Development phases
12. MVP boundary
13. Recommended Git branching strategy
14. List of `.md` documentation files we should create

Keep the architecture **simple enough for a student development team to understand and implement**, while making it structured enough to demonstrate production-level engineering during our competition presentation.

Do not add unnecessary microservices, Kubernetes, Kafka, Redis, or complex infrastructure unless there is a clear requirement.

The final goal is a **working CivicAI MVP first, scalable architecture second**.
