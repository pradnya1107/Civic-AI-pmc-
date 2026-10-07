# CivicAI — Implementation Plan

## 1. Implementation Strategy

CivicAI should be developed incrementally.

The team should first build a reliable MVP and then add AI and advanced features.

## Phase 1 — Repository and Setup

### Tasks

- Create GitHub repository.
- Create monorepo structure.
- Configure pnpm workspace.
- Configure Turborepo.
- Create frontend application.
- Create backend application.
- Create shared package.
- Add basic documentation.
- Add `.env.example`.
- Add `.gitignore`.

### Output

A clean repository that all four team members can clone and run.

## Phase 2 — Backend Foundation

### Tasks

- Configure Express application.
- Configure MongoDB and Mongoose.
- Create configuration handling.
- Create error-handling middleware.
- Create basic API response format.
- Configure API version `/api/v1`.

### Output

Running backend connected to MongoDB.

## Phase 3 — Authentication

### Tasks

- Create User model.
- Implement registration.
- Hash passwords.
- Implement login.
- Generate JWT.
- Implement authentication middleware.
- Implement role-based authorization.
- Implement `/auth/me`.

### Output

Citizen and admin authentication foundation.

## Phase 4 — Complaint MVP

### Tasks

- Create Complaint model.
- Create complaint service.
- Create complaint controller.
- Create complaint routes.
- Validate complaint input.
- Store complaints in MongoDB.
- Allow authenticated citizens to create complaints.
- Allow authorized users to view complaints.

### Output

Citizen can submit and retrieve complaints.

## Phase 5 — Admin MVP

### Tasks

- Create admin complaint list.
- Create complaint detail view.
- Implement verification.
- Implement status updates.
- Implement department assignment.
- Protect admin routes.

### Output

Admin can manage complaints.

## Phase 6 — Citizen Tracking

### Tasks

- Build complaint history page.
- Build complaint detail page.
- Display status lifecycle.
- Display updates relevant to the citizen.

### Output

Citizen can track complaint progress.

## Phase 7 — Frontend Improvement

### Tasks

- Build reusable components.
- Add responsive design.
- Add loading states.
- Add error states.
- Add empty states.
- Add protected routes.
- Connect frontend services through Axios.

### Output

Clean and usable web interface.

## Phase 8 — Notifications

### Tasks

- Create Notification model.
- Create notification service.
- Add in-app notifications for important complaint events.

### Output

Citizens receive relevant complaint updates inside the application.

## Phase 9 — AI Service

Only after the MVP is stable.

### Tasks

- Create Python FastAPI service.
- Create provider abstraction.
- Implement complaint categorization.
- Implement priority suggestion.
- Implement summarization.
- Store AIAnalysis results.
- Add admin review interface.

### Output

AI-assisted complaint analysis.

## Phase 10 — Similarity and Duplicate Detection

### Tasks

- Compare new complaints with existing complaints.
- Return possible similar complaints.
- Show similarity information to admins.
- Keep final decision with admin.

### Output

AI-assisted duplicate/similar complaint detection.

## Phase 11 — Audit and Security Improvements

### Tasks

- Add AuditLog model.
- Record important admin actions.
- Review authorization rules.
- Review input validation.
- Review API error handling.
- Review sensitive-data handling.

### Output

Improved accountability and security.

## Phase 12 — Testing

### Backend

- Authentication tests
- Authorization tests
- Complaint API tests
- Admin status-update tests

### Frontend

- Component tests
- Form validation tests
- Protected-route tests
- Complaint workflow tests

### Integration

Test the complete flow:

```text
Register
  ↓
Login
  ↓
Create Complaint
  ↓
Admin Login
  ↓
View Complaint
  ↓
Update Status
  ↓
Citizen Views Status
```

## Phase 13 — Deployment

After local MVP and testing are stable:

- Build frontend.
- Deploy backend.
- Configure production MongoDB.
- Deploy AI service when required.
- Configure environment variables.
- Configure CI/CD.
- Verify production APIs and frontend.

## Recommended Team Work Split

For a four-member student team:

### Member 1 — Frontend
- React pages
- Components
- Routing
- Citizen UI

### Member 2 — Backend
- Express APIs
- Authentication
- Complaint APIs
- Admin APIs

### Member 3 — Database + Security
- MongoDB models
- Mongoose
- Validation
- Authorization
- Audit logging
- Testing support

### Member 4 — AI + Integration
- FastAPI AI service
- AI provider abstraction
- Categorization
- Priority suggestion
- Summarization
- Backend integration

All members should coordinate through GitHub branches and pull requests.

## Definition of MVP Complete

The MVP is complete when the following works end-to-end:

```text
Citizen Registration
       ↓
Citizen Login
       ↓
Create Complaint
       ↓
MongoDB Storage
       ↓
Admin Login
       ↓
Admin Views Complaint
       ↓
Admin Updates Status
       ↓
Citizen Tracks Status
```

Advanced AI and analytics are not required for MVP completion.
