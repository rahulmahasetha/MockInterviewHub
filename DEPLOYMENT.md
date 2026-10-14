# 🚀 Production CI/CD & Deployment Guide

This document describes the automated Continuous Integration (CI) and Continuous Deployment (CD) pipelines for **MockInterviewHub**, including GitHub Actions setup, secrets management, hosting configuration, health checks, and rollback procedures.

---

## 📌 Architecture Overview

```text
               [ Push / Pull Request to main ]
                              │
             ┌────────────────┴────────────────┐
             ▼                                 ▼
   [ Backend CI Job ]                 [ Frontend CI Job ]
    • Node.js 20 & npm ci              • Node.js 20 & npm ci
    • Syntax & lint checks             • React component tests
    • Jest unit & route tests          • Code coverage report
    • Pytest integration tests         • Production bundle build
    • Code coverage report             • Artifact verification
             │                                 │
             └────────────────┬────────────────┘
                              ▼
           [ Quality Gate: All Tests Passed? ]
                     ├── NO  ──► ❌ Pipeline Fails (Deploy Blocked)
                     └── YES ──► ✅ Proceed to CD (on push to main)
                              │
             ┌────────────────┴────────────────┐
             ▼                                 ▼
   [ Deploy Backend (Render) ]       [ Deploy Frontend (Vercel) ]
    • Trigger deploy hook / API       • Deploy via Vercel Action / Hook
    • Poll GET /health endpoint       • Verify HTTP 200 availability
    • Rollback if probe fails         • Production live!
```

---

## ⚙️ Workflows Created

1. **`.github/workflows/ci.yml`**
   - **Triggers:** Every `push` and `pull_request` targeting the `main` branch, plus manual `workflow_dispatch`.
   - **Backend Job:** Clean dependency installation (`npm ci`), syntax linting, 100 Jest unit/route tests with coverage, background fallback server initialization, and Pytest black-box API tests.
   - **Frontend Job:** Clean dependency installation (`npm ci`), 87 React testing library tests with coverage, optimized production build (`npm run build`), and artifact upload.
   - **Test Isolation:** Backend tests run against in-memory fallback mocks without requiring live Gemini or Groq external API keys.

2. **`.github/workflows/cd.yml`**
   - **Triggers:** Push to `main` branch (after tests pass) and manual `workflow_dispatch`.
   - **Quality Gate:** Re-executes test and build verification before triggering any deployment.
   - **Backend Deployment:** Triggers Render or custom deploy webhooks, then actively polls `/health` to verify service readiness.
   - **Frontend Deployment:** Deploys client bundles to Vercel and performs an HTTP reachability check.

---

## 🔐 Required Secrets & Environment Variables

### 1. GitHub Repository Secrets
Navigate to **GitHub Repository ➔ Settings ➔ Secrets and variables ➔ Actions ➔ New repository secret**:

| Secret Name | Required For | Description | Example / How to Obtain |
| :--- | :--- | :--- | :--- |
| `RENDER_BACKEND_DEPLOY_HOOK_URL` | Automated Backend Deploy | Deploy hook URL provided by Render Web Service. | `https://api.render.com/deploy/srv-xxxx?key=yyyy` |
| `BACKEND_PRODUCTION_URL` | Health Check Verification | Live production URL of your backend. | `https://mockinterviewhub-api.onrender.com` |
| `VERCEL_TOKEN` | Automated Frontend Deploy | Vercel Personal Access Token. | Generate at [vercel.com/account/tokens](https://vercel.com/account/tokens) |
| `VERCEL_ORG_ID` | Vercel Deploy Action | Vercel Organization / User ID. | Found in `.vercel/project.json` or team settings |
| `VERCEL_PROJECT_ID` | Vercel Deploy Action | Vercel Project ID. | Found in `.vercel/project.json` or project settings |
| `FRONTEND_PRODUCTION_URL` | Frontend Health Check | Live URL of your frontend application. | `https://mockinterviewhub.vercel.app` |
| `REACT_APP_API_URL` | Build Variable | Points React frontend to production backend. | `https://mockinterviewhub-api.onrender.com` |

---

### 2. Backend Hosting Environment Variables (Render / Railway / Server)
Set these in your backend hosting platform dashboard (e.g. Render ➔ Environment):

| Environment Variable | Required | Description | Example |
| :--- | :--- | :--- | :--- |
| `NODE_ENV` | Yes | Node environment | `production` |
| `PORT` | Yes | Server port | `3001` (or `$PORT` assigned by host) |
| `MONGODB_URI` | Yes | MongoDB Atlas connection string | `mongodb+srv://user:pass@cluster.mongodb.net/mockinterviewhub` |
| `JWT_SECRET` | Yes | Secret for signing JWT authentication tokens | `secure_random_string_min_32_characters` |
| `GEMINI_API_KEY` | Optional / Recommended | Google Gemini AI key for AI mock interviews | `AIzaSy...` (from Google AI Studio) |
| `GROQ_API_KEY` | Optional / Fallback | Groq Cloud API key for high-speed LLM fallback | `gsk_...` (from console.groq.com) |
| `AI_PROVIDER` | Optional | Default AI model provider | `gemini` (default) or `groq` |

---

### 3. Frontend Hosting Environment Variables (Vercel)
Set these in your Vercel project settings (**Project ➔ Settings ➔ Environment Variables**):

| Environment Variable | Description | Example |
| :--- | :--- | :--- |
| `REACT_APP_API_URL` | Full URL to the running backend service. | `https://mockinterviewhub-api.onrender.com` |

---

## 🏥 Automated Health Checks

The backend provides a native health probe at `GET /health`:

```bash
curl -i https://<your-backend-domain>/health
```

**Sample Response (HTTP 200 OK):**
```json
{
  "status": "healthy",
  "uptime": 1425.82,
  "timestamp": "2026-10-14T09:20:00.000Z",
  "database": "connected"
}
```

* If MongoDB is connected: `"database": "connected"`.
* If running in offline resilient mode: `"database": "fallback_mode"`.
* Both states return `HTTP 200` to prevent unnecessary infrastructure downtime.

---

## 🔄 Deployment Verification & Rollback Playbook

### Automated Verification
When `cd.yml` runs:
1. It queries `GET ${{ secrets.BACKEND_PRODUCTION_URL }}/health` up to 15 times with 10-second intervals.
2. If the health probe does not succeed within 150 seconds, the workflow fails and alerts the team.
3. It performs an HTTP reachability check on the frontend production URL.

### Rollback Playbook

#### Rolling Back Backend (Render)
1. Navigate to **Render Dashboard ➔ Web Services ➔ mockinterviewhub-backend ➔ Events**.
2. Locate the last known healthy deployment commit.
3. Click the three dots (`...`) next to that deploy and select **Rollback to this deploy**.
4. Render immediately switches traffic back to the previous stable release.

#### Rolling Back Frontend (Vercel)
1. Navigate to **Vercel Dashboard ➔ mockinterviewhub ➔ Deployments**.
2. Locate the previous working production deployment.
3. Click the three dots (`...`) and click **Instant Rollback**.
4. Traffic is redirected to the previous build in under 5 seconds.

#### Rolling Back via Git
```bash
# Revert the latest commit on main and push
git revert HEAD -m 1
git push origin main
```
The CI/CD pipeline will automatically run tests against the reverted commit and redeploy.

---

## 🧪 Local Testing & Verification Commands

Before opening a pull request, run all checks locally:

```bash
# 1. Backend tests with coverage
cd backend
npm ci
npm run test:coverage

# 2. Pytest integration tests (runs in 0.02s)
node server.js &
PID=$!
sleep 2
pytest tests_pytest -v
kill $PID

# 3. Frontend tests with coverage
cd ../frontend
npm ci
npm run test:coverage

# 4. Frontend production build
CI=true npm run build
```
