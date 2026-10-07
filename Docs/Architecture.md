# CivicAI — System Architecture

## 1. Architecture Overview

CivicAI follows a modular full-stack architecture.

```text
┌─────────────────────────────┐
│           Citizen           │
│      React Web Frontend     │
└──────────────┬──────────────┘
               │ REST API
               ▼
┌─────────────────────────────┐
│       Node.js + Express     │
│          Backend API        │
└───────┬─────────────┬───────┘
        │             │
        ▼             ▼
┌──────────────┐  ┌───────────────┐
│   MongoDB    │  │  Python AI    │
│  + Mongoose  │  │   FastAPI     │
└──────────────┘  └───────┬───────┘
                          │
                          ▼
                  ┌────────────────┐
                  │ AI Provider    │
                  │ e.g. Gemini    │
                  └────────────────┘
```

## 2. Frontend

Technology:

- React
- Vite
- JavaScript
- Tailwind CSS
- React Router
- Axios
- Responsive/mobile-first design

Responsibilities:

- User interface
- Authentication screens
- Complaint forms
- Complaint tracking
- Admin dashboard
- API communication
- Protected routes
- Displaying AI suggestions

## 3. Backend

Technology:

- Node.js
- Express.js
- REST API
- Mongoose

Responsibilities:

- Authentication
- Authorization
- Complaint management
- User management
- Department management
- Notifications
- Admin operations
- Audit records
- Communication with AI service

## 4. Database

MongoDB is the main database.

Initial models/collections:

- User
- Complaint
- Department
- Notification
- AIAnalysis
- AuditLog

## 5. AI Service

The AI layer is implemented separately using:

- Python
- FastAPI
- AI provider such as Gemini

The service should use provider abstraction so the application is not tightly coupled to one provider.

## 6. AI Architecture Principle

The complaint-management workflow must not depend on AI.

```text
Complaint
   │
   ├── Core workflow ───────────────► Database/Admin
   │
   └── Optional AI analysis ────────► AI Service
                                         │
                                         ▼
                                  Suggestions
                                         │
                                         ▼
                                   Admin Review
```

If the AI service is unavailable, the citizen should still be able to submit a complaint and the admin should still be able to manage it.

## 7. Backend Module Structure

```text
backend/src/modules/
├── auth/
├── users/
├── complaints/
├── departments/
├── notifications/
├── admin/
└── ai/
```

Additional modules should only be introduced when justified.

## 8. Frontend Structure

```text
frontend/src/
├── components/
├── pages/
├── features/
├── hooks/
├── services/
├── stores/
├── types/
├── utils/
├── config/
└── main.tsx
```

## 9. Repository Architecture

CivicAI uses a monorepo with pnpm workspace and Turborepo.

```text
CivicAI/
├── apps/
│   ├── frontend/
│   └── backend/
├── packages/
│   ├── shared/
│   ├── ui/
│   └── config/
├── docs/
├── scripts/
├── .github/
├── .env.example
├── .gitignore
├── package.json
├── pnpm-workspace.yaml
└── turbo.json
```

## 10. Security Architecture

Required practices include:

- JWT authentication
- Secure password hashing
- Protected routes
- Role-based access control
- Input validation
- Authorization checks
- Audit logging for important administrative actions
- Citizens must not access admin operations

## 11. Deployment Direction

The application is designed so frontend, backend, database, and AI service can be deployed independently when required.

The first implementation should prioritize local development and a working MVP before production deployment complexity is added.
