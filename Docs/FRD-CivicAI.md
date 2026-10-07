# Functional Requirements Document (FRD) — CivicAI

## 1. Purpose

This document defines the functional requirements for CivicAI.

## 2. User Roles

| Role | Main Responsibilities |
|---|---|
| Citizen | Register, report issues, track complaints |
| Admin | Verify, categorize, assign, update and monitor complaints |
| Super Admin | Manage users, admins, departments and system-level information |

## 3. Authentication Requirements

### FR-AUTH-01 — Registration
The system shall allow a citizen to create an account.

### FR-AUTH-02 — Login
The system shall allow registered users to authenticate.

### FR-AUTH-03 — Current User
The system shall provide an authenticated-user endpoint.

### FR-AUTH-04 — Password Security
Passwords shall not be stored in plain text and shall be securely hashed.

### FR-AUTH-05 — Authorization
Protected operations shall use role-based access control.

## 4. Complaint Requirements

### FR-CMP-01 — Create Complaint
A citizen shall be able to create a complaint.

Required conceptual information includes:

- Title
- Description
- Category
- Location
- Evidence/photo reference
- Priority
- Status
- Citizen/user reference
- Department reference
- AI analysis reference
- Created timestamp
- Updated timestamp

### FR-CMP-02 — View Complaints
Authorized users shall be able to view complaints according to their role.

### FR-CMP-03 — View Complaint Details
The system shall provide a complaint-detail view.

### FR-CMP-04 — Update Complaint
Authorized users shall be able to update permitted complaint information.

### FR-CMP-05 — Delete Complaint
The API may support complaint deletion according to authorization rules.

## 5. Admin Requirements

### FR-ADM-01
Admins shall be able to view complaints.

### FR-ADM-02
Admins shall be able to verify complaints.

### FR-ADM-03
Admins shall be able to categorize complaints.

### FR-ADM-04
Admins shall be able to review AI suggestions.

### FR-ADM-05
Admins shall be able to set or update priority.

### FR-ADM-06
Admins shall be able to assign complaints to departments.

### FR-ADM-07
Admins shall be able to update complaint status.

## 6. Department Requirements

Departments shall allow complaints to be assigned to an appropriate municipal team.

Initial conceptual departments may include:

- Roads
- Waste Management
- Water
- Drainage
- Street Lighting
- Public Health

The final department list can be finalized by the team.

## 7. Complaint Status Requirements

The supported lifecycle is:

1. Submitted
2. Verified
3. Assigned
4. In Progress
5. Resolved
6. Closed

## 8. Notification Requirements

The system may create in-app notifications when:

- A complaint is submitted
- A complaint is verified
- A complaint is assigned
- Complaint status changes
- A complaint is resolved

The first version should use in-app notifications.

## 9. AI Functional Requirements

AI may provide:

- Suggested category
- Suggested priority
- Complaint summary
- Similarity/duplicate information
- Basic description/image analysis
- Citizen assistant responses

AI output must be treated as a suggestion. Admins retain the ability to review or change decisions.

## 10. Audit Requirements

Important administrative actions should be recorded, including:

- Status changes
- Complaint assignment
- User-role changes
- Department updates

## 11. API Requirements

Base API:

`/api/v1`

Main API groups:

- `/api/v1/auth`
- `/api/v1/users`
- `/api/v1/complaints`
- `/api/v1/admin`
- `/api/v1/departments`
- `/api/v1/notifications`
- `/api/v1/ai`

### Authentication

```text
POST /api/v1/auth/register
POST /api/v1/auth/login
GET  /api/v1/auth/me
```

### Complaints

```text
POST   /api/v1/complaints
GET    /api/v1/complaints
GET    /api/v1/complaints/:id
PATCH  /api/v1/complaints/:id
DELETE /api/v1/complaints/:id
```

### Admin Complaints

```text
GET   /api/v1/admin/complaints
PATCH /api/v1/admin/complaints/:id/status
PATCH /api/v1/admin/complaints/:id/assign
```

## 12. API Response Standard

Successful response:

```json
{
  "success": true,
  "message": "Complaint created successfully",
  "data": {}
}
```

Error response:

```json
{
  "success": false,
  "message": "Unable to create complaint",
  "error": {
    "code": "VALIDATION_ERROR"
  }
}
```

All APIs should follow a consistent response style.
