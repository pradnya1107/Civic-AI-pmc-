# CivicAI Documentation

CivicAI is a full-stack civic issue reporting and management platform initially designed for the Pune Municipal Corporation (PMC) context.

## Purpose

CivicAI connects citizens and municipal administrators through a centralized complaint-management platform.

Citizens can report civic issues, upload evidence, provide location and description, and track complaint progress. Admin/PMC personnel can verify, categorize, assign, update, and monitor complaints.

## Documentation

| Document | Purpose |
|---|---|
| [BRD-CivicAI.md](./BRD-CivicAI.md) | Business requirements and project objectives |
| [FRD-CivicAI.md](./FRD-CivicAI.md) | Functional requirements |
| [Architecture.md](./Architecture.md) | System architecture and technology stack |
| [Workflow.md](./Workflow.md) | Main user and complaint workflows |
| [ENVIRONMENT-SETUP.md](./ENVIRONMENT-SETUP.md) | Development environment setup |
| [ImplementationPlan.md](./ImplementationPlan.md) | Step-by-step implementation plan |
| [Backend API](../apps/backend/API.md) | Authentication, complaint and admin API usage |

## Core MVP

The first working version must support:

1. Citizen registration
2. Citizen login
3. Complaint creation
4. Complaint storage in MongoDB
5. Admin login
6. Admin complaint viewing
7. Admin status update
8. Citizen status tracking

AI, analytics, maps, advanced notifications, and other advanced features must not delay this basic workflow.

## Technology Stack

- Frontend: React, Vite, JavaScript, Tailwind CSS, React Router, Axios
- Backend: Node.js, Express.js, REST API, Mongoose
- Database: MongoDB
- AI service: Python, FastAPI, AI provider such as Gemini
- Repository: Git, GitHub, pnpm workspace, Turborepo

## Important Design Principle

AI is an assistive component. AI suggestions such as category, priority, summary, or similarity are reviewed by administrators. The AI must not become the final authority for critical municipal decisions.
