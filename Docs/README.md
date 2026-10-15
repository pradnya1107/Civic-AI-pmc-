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
| [REQUIREMENTS.md](./REQUIREMENTS.md) | Target product requirements and prioritized migration tasks |
| [Architecture.md](./Architecture.md) | Target architecture, current-state notes, and module ownership |
| [API.md](./API.md) | Existing API inventory and proposed versioned API contracts |
| [DATABASE.md](./DATABASE.md) | Collection ownership, schema responsibilities, indexes, and migrations |
| [AUTHENTICATION.md](./AUTHENTICATION.md) | Authentication lifecycle, browser sessions, and authorization model |
| [TEAM_WORKFLOW.md](./TEAM_WORKFLOW.md) | Issues, branch/PR, ownership, testing, and security workflow |
| [Workflow.md](./Workflow.md) | Main user and complaint workflows |
| [ENVIRONMENT-SETUP.md](./ENVIRONMENT-SETUP.md) | Development environment setup |
| [ImplementationPlan.md](./ImplementationPlan.md) | Step-by-step implementation plan |
| [CI.md](./CI.md) | Continuous Integration pipeline and automated checks |
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

- Target web frontend: React, Vite, JavaScript
- Existing client: Expo/React Native in `apps/mobile`; preserve while web is introduced
- Backend: Node.js, Express.js, TypeScript, REST API, Mongoose
- Database: MongoDB
- Future AI service: Python, FastAPI, provider adapter
- Collaboration: Git and GitHub; package-manager/workspace consolidation is not assumed

## Important Design Principle

AI is an assistive component. AI suggestions such as category, priority, summary, or similarity are reviewed by administrators. The AI must not become the final authority for critical municipal decisions.
