# Testing Guide

Этот файл нужен для защиты: быстрый сценарий проверки backend/frontend, RBAC, compatibility и OAuth token flow.

## 1) Быстрый smoke-check

1. Поднять backend:

```bash
cd backend
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload
```

2. Открыть Swagger:

- `http://127.0.0.1:8000/docs`

3. Открыть frontend:

- `frontend/login.html` → после входа `index.html` (Docker: `http://localhost:8080/` открывает страницу входа)

## 2) Автотесты

Запуск:

```bash
cd backend
pytest -q
```

Ожидается: все тесты `passed`.

Примечание:
- в текущей среде frontend e2e (Cypress/Jest/Playwright JS) не подключены, т.к. отсутствует `node/npm`;
- добавлены frontend contract tests в `backend/tests/test_frontend_contract.py` (`login.html` + `index.html`).

### Playwright e2e (готовый каркас)

Файлы уже добавлены:
- `frontend/package.json`
- `frontend/playwright.config.js`
- `frontend/tests/e2e/auth-rbac.spec.js`
- `frontend/tests/e2e/configuration-flow.spec.js`

Когда `node/npm` будут доступны:

```bash
cd frontend
npm install
npx playwright install
npm run test:e2e
```

CI:
- e2e в GitHub Actions: `.github/workflows/frontend-e2e.yml`
- workflow поднимает backend, запускает Playwright и сохраняет артефакты (report/test-results/logs).

## 3) Manual API checks (curl)

### 3.1 Login (admin)

```bash
curl -X POST "http://127.0.0.1:8000/auth/login" ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"admin@example.com\",\"password\":\"admin123\"}"
```

Проверить в ответе:
- `access_token`
- `refresh_token`
- `role_id = 1`

### 3.2 Refresh token

```bash
curl -X POST "http://127.0.0.1:8000/auth/refresh" ^
  -H "Content-Type: application/json" ^
  -d "{\"refresh_token\":\"<REFRESH_TOKEN>\"}"
```

Проверить:
- приходит новая пара токенов;
- старый refresh больше не работает (rotation).

### 3.3 Logout + revoke

```bash
curl -X POST "http://127.0.0.1:8000/auth/logout" ^
  -H "Content-Type: application/json" ^
  -d "{\"refresh_token\":\"<REFRESH_TOKEN>\"}"
```

После этого refresh с этим токеном должен вернуть `401`.

### 3.4 Products

```bash
curl "http://127.0.0.1:8000/products"
```

Проверить: возвращается массив продуктов.

### 3.5 Create configuration (authorized)

```bash
curl -X POST "http://127.0.0.1:8000/configurations" ^
  -H "Authorization: Bearer <ACCESS_TOKEN>" ^
  -H "Content-Type: application/json" ^
  -d "{\"user_id\":1,\"items\":[501]}"
```

Проверить: `status=ok`, есть `configuration_id`.

## 4) RBAC checks

Seed users:
- admin: `admin@example.com / admin123` (`role_id=1`)
- user: `user@example.com / user123` (`role_id=2`)

### 4.1 user не может создавать пользователя

`POST /users` с токеном `user` должен вернуть `403`.

### 4.2 admin может создавать пользователя

`POST /users` с токеном `admin` должен вернуть `200`.

### 4.3 user не может создавать конфигурацию за другого user_id

`POST /configurations` с токеном user и чужим `user_id` должен вернуть `403`.

## 5) Frontend checks

1. Login в UI (admin/user).
2. Проверить role badge: `Admin/User/Guest/Anonymous`.
3. Проверить:
   - без login кнопка `Create configuration` disabled;
   - admin-only блок создания пользователя виден только admin;
   - при logout токены очищаются.
4. Проверить авто-refresh:
   - при `401` frontend пытается сделать `POST /auth/refresh` и повторяет запрос.

## 6) Postman

Импортировать:

- `backend/ProductConfigurator.postman_collection.json`

Переменная:

- `baseUrl = http://127.0.0.1:8000`

## 7) Шаблон отчёта об ошибках (для диплома)

Используй такой формат:

1. **Сценарий:** что проверяли.
2. **Ожидаемое поведение:** что должно быть.
3. **Фактическое поведение:** что получили.
4. **Причина:** кратко почему возникло.
5. **Исправление:** что изменили в коде.
6. **Результат после фикса:** как подтверждено (curl/pytest/UI).
