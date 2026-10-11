# CivicAI — Environment Setup

## 1. Prerequisites

Install the following before development:

- Git
- Node.js
- pnpm
- Python 3.x
- MongoDB or access to MongoDB Atlas
- A code editor such as VS Code

Verify installations:

```bash
node --version
pnpm --version
python --version
git --version
```

## 2. Clone Repository

```bash
git clone <YOUR_GITHUB_REPOSITORY_URL>
cd CivicAI
```

## 3. Install Backend Dependencies

The current pnpm package is located in `apps/backend`:

```powershell
Set-Location apps\backend
pnpm install
```

## 4. Environment Variables

Create environment files according to the application's configuration.

Example root variables may include:

```env
NODE_ENV=development
```

Copy `apps/backend/.env.example` to `apps/backend/.env` if the local file does
not already exist. Configure the backend values shown in that template:

```env
PORT=5000
MONGODB_URI=your_local_mongodb_connection_string
JWT_SECRET=your_long_random_secret_at_least_32_characters
JWT_EXPIRES_IN=15m
OTP_HASH_SECRET=another_random_secret_at_least_32_characters
SMTP_HOST=your_smtp_host
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_smtp_username
SMTP_PASSWORD=your_smtp_password
SMTP_FROM=CivicAI PMC <no-reply@example.com>
FRONTEND_URL=http://localhost:5173
```

`MONGODB_URI`, `JWT_SECRET`, `OTP_HASH_SECRET`, SMTP values, and
`FRONTEND_URL` are validated before the backend starts. Generate unique random
secrets; do not use the placeholders above as credentials.

Frontend configuration should include the backend API base URL, for example:

```env
VITE_API_BASE_URL=http://localhost:5000/api/v1
```

AI service configuration may include:

```env
AI_PORT=8000
AI_PROVIDER_API_KEY=<YOUR_AI_PROVIDER_KEY>
```

Never commit real secrets to GitHub.

## 5. Recommended Environment Files

```text
CivicAI/
├── .env.example
├── apps/
│   ├── frontend/
│   │   └── .env
│   └── backend/
│       └── .env
```

The exact location can be finalized according to the implementation configuration.

## 6. Start Development

There is no root package script yet. From `apps/backend`, start or verify the
backend:

```bash
pnpm dev
pnpm build
pnpm start
```

`pnpm test` runs API tests against a temporary in-memory MongoDB database named
`civicai_test`; it does not read or connect to the local `.env` MongoDB URI.
`pnpm test:watch` starts the test runner in watch mode. The first test run may
download the MongoDB test binary.

Create the first administrator from the backend folder using process
environment values (not public registration):

```powershell
$env:ADMIN_FULL_NAME = "PMC Administrator"
$env:ADMIN_EMAIL = "admin@example.com"
$env:ADMIN_PASSWORD = "replace-with-a-long-unique-password"
pnpm admin:create
Remove-Item Env:ADMIN_FULL_NAME, Env:ADMIN_EMAIL, Env:ADMIN_PASSWORD
```

The command refuses to create another administrator once an admin account
exists. It prints no credential values.

## 7. Python AI Service Setup

Create and activate a virtual environment:

### Windows

```bash
python -m venv .venv
.venv\Scripts\activate
```

### Linux/macOS

```bash
python3 -m venv .venv
source .venv/bin/activate
```

Install Python dependencies:

```bash
pip install -r requirements.txt
```

Run the FastAPI service using the project's configured entry point.

## 8. MongoDB

The backend requires MongoDB.

Two development options:

1. Local MongoDB
2. MongoDB Atlas

For local development, start the MongoDB service and set
`MONGODB_URI=mongodb://127.0.0.1:27017/civicai_pmc` in the backend environment
file. The server connects to MongoDB before it accepts HTTP requests. Verify
the status at `http://localhost:5000/api/health`; see
[the API guide](../apps/backend/API.md) for endpoint examples.

## 9. Git Safety

Do not commit:

- `.env` files containing secrets
- API keys
- Passwords
- Private credentials
- Local virtual environments
- Build output
- `node_modules`
- log files
- temporary files

The `.gitignore` file should cover these files and directories.

## 10. Basic Verification

Before development is considered ready, verify:

- Frontend starts successfully.
- Backend starts successfully.
- Backend connects to MongoDB.
- Registration works.
- Email verification works through configured SMTP.
- Login and logout work.
- Complaint creation works.
- Admin can access protected admin operations.
- Complaint status can be updated.
- Citizen can see the updated status.
- AI failure does not break the basic complaint workflow.
