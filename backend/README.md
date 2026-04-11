# Backend (FastAPI)

## Run locally

```bash
pip install -r requirements.txt
uvicorn app.main:app --reload
```

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

## cURL examples

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
  -d "{\"user_id\":1,\"items\":[101]}"
```

Create user (admin token required):

```bash
curl -X POST "http://127.0.0.1:8000/users" ^
  -H "Authorization: Bearer <ACCESS_TOKEN>" ^
  -H "Content-Type: application/json" ^
  -d "{\"name\":\"User A\",\"email\":\"usera@example.com\",\"password\":\"secret123\",\"role_id\":2,\"company_id\":1}"
```
