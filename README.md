# Thesis Product Configurator

Концепция **оборудование → опции → правила** и как это отражено в БД/API: [backend/docs/DOMAIN_RULES.md](backend/docs/DOMAIN_RULES.md).

### Архитектура данных (продукт и опции)

- **Module** и **License** — отдельные сущности со связью **многие-к-одному** с `Product` (`product_id`). Это осознанный выбор вместо одной абстрактной таблицы `Option` и связи M:N: у модулей и лицензий разные обязательные поля (скорость, form factor vs `units_per_pack`), проще валидация и SQL-запросы, понятнее предметная область (трансиверы и пакеты лицензий).
- **`rules_json`** на продукте — **исполняемый** декларативный слой: при разборе API применяет правила типов `filter` (скорости модулей), `limit` (макс. число модулей), `license` (встроенные AP). Первое подходящее правило в массиве **перекрывает** значение соответствующей колонки (`module_speeds_json`, `max_module_slots`, `built_in_license_units`) для рантайма конфигуратора и валидации `POST /configurations`. Ответ `GET /products/{id}/configuration-options` содержит уже **эффективные** значения и поле `rules_runtime_sources`, откуда взялось каждое ограничение (`rules_json` или `column`).

## Frontend layout

Static UI is split by concern (prototype decomposition):

| Path | Role |
|------|------|
| `index.html` | Markup and shell (~780 lines) |
| `css/index.css` | Styles |
| `js/core.js` | Shared constants, DOM refs, i18n, catalog state |
| `js/api.js` | Auth tokens and `apiFetch` |
| `js/configurator.js` | User catalog, selection state, configuration submit |
| `js/admin.js` | Admin panel (companies, users, catalog editor) |
| `js/index.js` | Bootstrap: `init()`, event wiring |
| `api-config.js` | API origin resolver (local vs Render) |
| `login.html` | Auth page (still self-contained) |

Regenerate modules from a monolith backup with `python scripts/split_index_modules.py` (expects `js/index.monolith.js` or run once from the current bundle).

## Local run (without Docker)

Backend:

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Frontend:

- **Simplest:** open `frontend/login.html` in the browser (double‑click), then you reach `index.html` after login.
- **On a port (recommended):** from the `frontend` folder run a static server, then open the URL in the browser:
  - Windows: double‑click `frontend/start-server.bat`, or in a terminal:
    ```bash
    cd frontend
    python -m http.server 8080
    ```
  - Then open **http://localhost:8080/login.html** (backend must still run on port **8000**, see `API_BASE` in `login.html` / `index.html` if you change it).
- With Docker, the root URL serves `login.html` first.

## Docker run (backend + frontend)

Copy `backend/.env.example` to `backend/.env` and fill OAuth keys / `RESEND_API_KEY` if needed. Compose loads that file into the backend container (`env_file`); `FRONTEND_URL` is overridden to `http://127.0.0.1:8080` for the nginx frontend.

```bash
docker compose up --build
```

- Frontend: `http://localhost:8080`
- Backend API: `http://localhost:8000`
- Swagger: `http://localhost:8000/docs`

## CI

![Backend CI](https://github.com/chris11na/thesis/actions/workflows/backend-ci.yml/badge.svg)
![Frontend E2E](https://github.com/chris11na/thesis/actions/workflows/frontend-e2e.yml/badge.svg)

GitHub Actions workflow:

- installs backend dependencies
- applies Alembic migrations
- runs backend tests
- builds backend and frontend Docker images
- runs on `push`, `pull_request`, and manual trigger (`workflow_dispatch`)
- separate frontend e2e workflow runs Playwright tests (`.github/workflows/frontend-e2e.yml`)

## Testing

Detailed manual + automated testing scenarios:

- `diploma/TESTING.md` (English; local copy under `diploma/`, not tracked in git)
- Frontend Playwright e2e in `frontend/tests/e2e` (**27 scenarios** in 15 spec files; shared helpers in `helpers.js`)

| E2E spec | Scenarios |
|----------|-----------|
| `auth-rbac.spec.js` | redirect, admin/user RBAC |
| `auth-errors.spec.js` | wrong password, unknown email domain |
| `logout.spec.js` | logout + token cleanup |
| `register-approve.spec.js` | registration → admin approve → login |
| `oauth.spec.js` | providers API, Microsoft link, OAuth error query |
| `configuration-flow.spec.js` | happy-path submit + export dialog |
| `configuration-errors.spec.js` | missing project / empty cart |
| `export-download.spec.js` | XLSX + CSV download |
| `catalog-search.spec.js` | user product search |
| `wifi-licenses.spec.js` | AP target + license pack suggestion |
| `service-tier.spec.js` | VPS / VPSN support tier on pill |
| `admin-panel.spec.js` | companies list, catalog search, create user |
| `admin-crud.spec.js` | company create/edit/delete, product create/edit |
| `admin-submissions.spec.js` | sales submissions list + search |
| `i18n.spec.js` | RU/EN toggle on login and index |

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
   - show admin panel (organizations, users by company, catalog);
   - logout/login as `user@example.com / user123` and show admin panel disappears.
4. **Configuration (40-60 sec)**
   - login as **user** (`user@example.com / user123`);
   - catalog: Wi‑Fi → Оборудование → **VNC-2000** → target AP → submit with project name → export XLSX.
   - note: **admin** cannot create configurations (admin panel only).
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
- One-page defense prompt: create `DEFENSE_CHEATSHEET.md` locally (in `.gitignore`, not committed). You can reuse structure from `diploma/TESTING.md` or the demo script above.
