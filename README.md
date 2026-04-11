# Thesis Product Configurator

## Local run (without Docker)

Backend:

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Frontend:

- Open `frontend/index.html` in browser.
- Configure API base in file if backend host/port differs.

## Docker run (backend + frontend)

```bash
docker compose up --build
```

- Frontend: `http://localhost:8080`
- Backend API: `http://localhost:8000`
- Swagger: `http://localhost:8000/docs`

## CI

<!-- Replace OWNER/REPO with your GitHub repository path -->
![Backend CI](https://github.com/OWNER/REPO/actions/workflows/backend-ci.yml/badge.svg)

GitHub Actions workflow:

- installs backend dependencies
- applies Alembic migrations
- runs backend tests
- builds backend and frontend Docker images
- runs on `push`, `pull_request`, and manual trigger (`workflow_dispatch`)
- separate frontend e2e workflow runs Playwright tests (`.github/workflows/frontend-e2e.yml`)

## Testing

Detailed manual + automated testing scenarios:

- `TESTING.md`
- Frontend Playwright e2e scaffold is in `frontend/tests/e2e`

## Demo Script (3-5 min)

Use this order during defense:

1. **Architecture (30-40 sec)**
   - show backend (`FastAPI`), frontend (`static UI`), DB (`SQLite + Alembic`), CI (`GitHub Actions`).
2. **Backend docs (20-30 sec)**
   - open `http://localhost:8000/docs`, show key endpoints:
     - `POST /auth/login`
     - `POST /auth/refresh`
     - `POST /auth/logout`
     - `GET /products`
     - `POST /configurations`
     - `POST /users` (admin only)
3. **Frontend login + RBAC (60-90 sec)**
   - login as `admin@example.com / admin123`;
   - show role badge = `Admin`;
   - show admin-only block `Create user`;
   - logout/login as `user@example.com / user123` and show admin block disappears.
4. **Configuration + compatibility (40-60 sec)**
   - create valid configuration (e.g. item `101`) -> success;
   - try forbidden configuration with item `103` -> backend rejects with compatibility error.
5. **Token flow (30-40 sec)**
   - explain `access + refresh`;
   - show logout revokes refresh token;
   - mention frontend auto-refresh logic on `401`.
6. **Quality gates (30-40 sec)**
   - show `pytest -q` passes;
   - show CI workflow and green status.

## Defense Notes

- Seed users:
  - `admin@example.com / admin123`
  - `user@example.com / user123`
- Main URLs:
  - Frontend: `http://localhost:8080`
  - Backend: `http://localhost:8000`
  - Swagger: `http://localhost:8000/docs`
- One-page defense prompt:
  - `DEFENSE_CHEATSHEET.md`
