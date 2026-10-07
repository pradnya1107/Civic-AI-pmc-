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

## 3. Install Dependencies

From the repository root:

```bash
pnpm install
```

## 4. Environment Variables

Create environment files according to the application's configuration.

Example root variables may include:

```env
NODE_ENV=development
```

Backend configuration should include values such as:

```env
PORT=5000
MONGODB_URI=<YOUR_MONGODB_CONNECTION_STRING>
JWT_SECRET=<YOUR_SECRET>
AI_SERVICE_URL=<YOUR_AI_SERVICE_URL>
```

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

The monorepo should provide a development command through the root package scripts.

Typical command:

```bash
pnpm dev
```

If services are started separately:

```bash
pnpm --filter frontend dev
pnpm --filter backend dev
```

The AI service can be started separately from its Python environment.

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

Set the connection string in the backend environment file.

## 9. Git Safety

Do not commit:

- `.env` files containing secrets
- API keys
- Passwords
- Private credentials
- Local virtual environments
- Build output
- `node_modules`

The `.gitignore` file should cover these files and directories.

## 10. Basic Verification

Before development is considered ready, verify:

- Frontend starts successfully.
- Backend starts successfully.
- Backend connects to MongoDB.
- Registration works.
- Login works.
- Complaint creation works.
- Admin can access protected admin operations.
- Complaint status can be updated.
- Citizen can see the updated status.
- AI failure does not break the basic complaint workflow.
