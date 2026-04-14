# Thesis Product Configurator

Концепция **оборудование → опции → правила** и как это отражено в БД/API: [backend/docs/DOMAIN_RULES.md](backend/docs/DOMAIN_RULES.md).

### Архитектура данных (продукт и опции)

- **Module** и **License** — отдельные сущности со связью **многие-к-одному** с `Product` (`product_id`). Это осознанный выбор вместо одной абстрактной таблицы `Option` и связи M:N: у модулей и лицензий разные обязательные поля (скорость, form factor vs `units_per_pack`), проще валидация и SQL-запросы, понятнее предметная область (трансиверы и пакеты лицензий).
- **`rules_json`** на продукте — **исполняемый** декларативный слой: при разборе API применяет правила типов `filter` (скорости модулей), `limit` (макс. число модулей), `license` (встроенные AP). Первое подходящее правило в массиве **перекрывает** значение соответствующей колонки (`module_speeds_json`, `max_module_slots`, `built_in_license_units`) для рантайма конфигуратора и валидации `POST /configurations`. Ответ `GET /products/{id}/configuration-options` содержит уже **эффективные** значения и поле `rules_runtime_sources`, откуда взялось каждое ограничение (`rules_json` или `column`).

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
   - show admin panel (organizations, users by company, catalog);
   - logout/login as `user@example.com / user123` and show admin panel disappears.
4. **Configuration (40-60 sec)**
   - login as **user** (`user@example.com / user123`);
   - create valid configuration (e.g. demo controller product `501`) -> success.
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
- One-page defense prompt: создай у себя локально файл `DEFENSE_CHEATSHEET.md` — он в `.gitignore` и **не попадает в коммиты** (можно скопировать структуру из `TESTING.md` / демо-сценария выше).
