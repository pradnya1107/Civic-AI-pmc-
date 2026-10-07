# CivicAI — Workflow

## 1. Main MVP Workflow

The minimum working product follows this flow:

```text
Citizen
   ↓
Register
   ↓
Login
   ↓
Create Complaint
   ↓
Complaint Stored in MongoDB
   ↓
Admin Login
   ↓
Admin Views Complaint
   ↓
Admin Updates Status
   ↓
Citizen Tracks Status
```

This workflow is the highest priority.

## 2. Complete Complaint Workflow

```text
Citizen
   ↓
Reports Civic Issue
   ↓
CivicAI
   ↓
Complaint Stored
   ↓
Optional AI Analysis
   ↓
Category / Priority / Summary Suggestions
   ↓
Admin Reviews
   ↓
Complaint Verified
   ↓
Assigned to Department
   ↓
In Progress
   ↓
Resolved
   ↓
Citizen Notified
   ↓
Citizen Tracks / Provides Feedback
   ↓
Closed
```

## 3. Citizen Workflow

### Step 1 — Registration
The citizen creates an account.

### Step 2 — Login
The citizen authenticates and enters the dashboard.

### Step 3 — Report Issue
The citizen provides:

- Title
- Description
- Category, if available
- Location
- Supporting photo/evidence

### Step 4 — Submission
The backend validates and stores the complaint in MongoDB.

### Step 5 — Tracking
The citizen can open the complaint and view its current status.

## 4. Admin Workflow

### Step 1 — Admin Login
The admin authenticates through the protected admin interface.

### Step 2 — View Complaints
The admin sees submitted complaints.

### Step 3 — Verify
The admin reviews whether the complaint is valid.

### Step 4 — Review AI Suggestions
If AI analysis exists, the admin reviews category, priority, summary, or similarity suggestions.

### Step 5 — Assign
The complaint is assigned to the appropriate department.

### Step 6 — Update Status
The admin updates the complaint through its lifecycle.

## 5. Status Lifecycle

```text
Submitted
    ↓
Verified
    ↓
Assigned
    ↓
In Progress
    ↓
Resolved
    ↓
Closed
```

## 6. AI-Assisted Workflow

Example:

```text
Citizen Complaint
      ↓
Complaint Stored
      ↓
AI Analysis
      ↓
Suggested Category
Suggested Priority
Suggested Summary
Possible Similar Complaint
      ↓
Admin Review
      ↓
Admin Final Decision
```

AI does not automatically make critical final decisions.

## 7. AI Failure Workflow

```text
Complaint Created
      ↓
AI Service Available?
    /       \
  Yes        No
   ↓          ↓
AI Analysis   Continue Core Workflow
   ↓          ↓
Admin Review  Admin Review
       \      /
        \    /
       Final Decision
```

The core complaint workflow must continue even if AI is unavailable.

## 8. Notification Workflow

Notifications may be created when:

- Complaint is submitted
- Complaint is verified
- Complaint is assigned
- Status changes
- Complaint is resolved

The initial implementation uses in-app notifications.


What makes our app different?
-We add in our app AI features and the workflow is given below.

Citizen
   ↓
Submit Complaint
   ↓
CivicAI
   ↓
AI analyzes complaint
   ├── Category suggestion
   ├── Priority suggestion
   ├── Summary
   └── Possible duplicate
          ↓
     Admin Review
          ↓
   Final Decision
          ↓
     Department
          ↓
     Resolution
          ↓
 Citizen Feedback