# Business Requirements Document (BRD) — CivicAI

## 1. Project Overview

**Project Name:** CivicAI

**Project Type:** Full-stack civic issue reporting and management platform

**Initial Target Context:** Pune Municipal Corporation (PMC)

CivicAI provides a centralized digital platform through which citizens can report civic problems and municipal/admin personnel can manage, verify, assign, resolve, and monitor those problems.

## 2. Problem Statement

Citizens frequently experience civic problems such as garbage accumulation, road damage, potholes, streetlight failures, water issues, drainage problems, and public sanitation issues.

Traditional complaint processes may make it difficult to know where to report an issue, track its status, avoid repeated complaints, categorize complaints, assign complaints to the correct department, and maintain centralized information.

CivicAI aims to improve this process through a single digital complaint-management platform.

## 3. Business Objectives

- Provide a simple platform for citizens to report civic issues.
- Centralize civic complaints in one system.
- Allow administrators to verify and manage complaints.
- Improve complaint assignment and status tracking.
- Give citizens visibility into complaint progress.
- Reduce manual categorization through AI-assisted suggestions.
- Maintain accountability through administrative records and audit information.
- Build the system so the basic complaint workflow works even when AI is unavailable.

## 4. Stakeholders

### Citizens
People who report civic issues and track their complaints.

### Admin/PMC Officers
Personnel who review, verify, categorize, prioritize, assign, and update complaints.

### Super Admin
System-level administrator responsible for users, administrators, departments, audit information, and system settings.

### Development Team
The student team responsible for developing, testing, documenting, and deploying CivicAI.

## 5. Major Business Features

### Citizen Features

- Register and login
- Report civic issues
- Add title and description
- Upload supporting photos/evidence
- Provide location
- Track complaint status
- View complaint history
- Receive in-app updates
- Use the AI assistant

### Admin Features

- Admin login
- View complaints
- Verify complaints
- Categorize complaints
- Review AI suggestions
- Set or update priority
- Assign complaints to departments
- Update complaint status
- Monitor complaint progress
- View basic statistics

### Super Admin Features

- Manage users
- Manage administrators
- Manage departments
- Review audit information
- Manage system-level settings

## 6. Core Complaint Lifecycle

Submitted → Verified → Assigned → In Progress → Resolved → Closed

## 7. AI Business Role

AI may assist with:

- Complaint categorization
- Priority/severity suggestion
- Complaint summarization
- Similar/duplicate complaint detection
- Basic description/image analysis
- Citizen AI assistance

AI recommendations must remain reviewable by administrators.

## 8. Success Criteria

The MVP is successful when:

- A citizen can create an account.
- A citizen can log in.
- A citizen can submit a complaint.
- The complaint is stored in MongoDB.
- An admin can log in.
- The admin can view the complaint.
- The admin can update its status.
- The citizen can see the updated status.

## 9. Constraints

- Keep the implementation beginner/student-friendly.
- Avoid unnecessary complexity.
- Follow the agreed monorepo structure.
- Keep frontend, backend, database, AI, security, testing, and deployment consistent.
- Do not make AI a dependency for the basic complaint-management workflow.

## 10. Future Scope

Potential future capabilities include richer AI analysis, duplicate detection, maps, advanced analytics, notification channels, image analysis, and broader municipal deployment.
