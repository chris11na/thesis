# Backend (FastAPI)

Как в коде устроены **оборудование, опции и правила** (конфигуратор): см. [docs/DOMAIN_RULES.md](docs/DOMAIN_RULES.md). Точка входа в логику проверок: `app.services.rule_engine`.

## Run locally

```bash
pip install -r requirements.txt
alembic upgrade head   # required first time (and after pulling new migrations)
# e.g. 0005 adds products.product_category (optional label, not used in validation logic)
uvicorn app.main:app --reload
```

If `alembic upgrade head` fails with “table already exists”, your DB was created without Alembic tracking. Either delete `app.db` and run `alembic upgrade head` again, or mark the current schema and apply only new revisions, for example:

```bash
alembic stamp 0002_add_refresh_tokens
alembic upgrade head
```

(Use `0001_init_schema` instead of `0002_add_refresh_tokens` only if the `refresh_tokens` table does not exist yet.)

API docs:
- Swagger: `http://127.0.0.1:8000/docs`
- ReDoc: `http://127.0.0.1:8000/redoc`

## Database migrations (Alembic)

```bash
alembic upgrade head
```

Create a new migration:

```bash
alembic revision --autogenerate -m "describe_change"
```

## Test commands

```bash
pytest -q
```

Pytest uses a **separate** SQLite file (`backend/.pytest_isolated.db`), not `app.db`.  
Otherwise automated tests would create many disposable users (`apitest-*`, `reg-*`, …) and they would appear in the admin UI next to real seed accounts.

To reset **development** data to roughly “fresh seed” only: stop the API, delete `app.db`, run `alembic upgrade head`, start the API again (seed runs on startup).  
The first launch after that creates **admin** and, by default, demo user `user@example.com` (for the configurator UI / Playwright). For **admin only**, set `SEED_DEMO_USER=0` in the environment before starting the API (you must create end users yourself or via register).

## cURL examples

Register (domain must match a `Company` in DB, e.g. `@example.com`):

```bash
curl -X POST "http://127.0.0.1:8000/auth/register" ^
  -H "Content-Type: application/json" ^
  -d "{\"name\":\"New User\",\"email\":\"newuser@example.com\",\"password\":\"mypass12\"}"
```

Login:

```bash
curl -X POST "http://127.0.0.1:8000/auth/login" ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"admin@example.com\",\"password\":\"admin123\"}"
```

Refresh:

```bash
curl -X POST "http://127.0.0.1:8000/auth/refresh" ^
  -H "Content-Type: application/json" ^
  -d "{\"refresh_token\":\"<REFRESH_TOKEN>\"}"
```

Logout:

```bash
curl -X POST "http://127.0.0.1:8000/auth/logout" ^
  -H "Content-Type: application/json" ^
  -d "{\"refresh_token\":\"<REFRESH_TOKEN>\"}"
```

Get products:

```bash
curl "http://127.0.0.1:8000/products"
```

Create configuration:

```bash
curl -X POST "http://127.0.0.1:8000/configurations" ^
  -H "Content-Type: application/json" ^
  -d "{\"user_id\":1,\"items\":[501]}"
```

Create user (admin token required):

```bash
curl -X POST "http://127.0.0.1:8000/users" ^
  -H "Authorization: Bearer <ACCESS_TOKEN>" ^
  -H "Content-Type: application/json" ^
  -d "{\"name\":\"User A\",\"email\":\"usera@example.com\",\"password\":\"secret123\",\"role_id\":2,\"company_id\":1}"
```
