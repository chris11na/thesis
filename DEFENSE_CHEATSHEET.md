# Defense Cheatsheet (1 page)

## 0) Перед началом (10 сек)

**Сказать:**  
«Система состоит из FastAPI backend, frontend-прототипа, SQLite с миграциями Alembic, RBAC и OAuth token flow (login/refresh/logout).»

## 1) Архитектура (20-30 сек)

**Открыть:** `README.md`  
**Сказать:**  
- backend: REST API + бизнес-логика совместимости;  
- frontend: конфигуратор и role-based UI;  
- DB: сущности пользователей/продуктов/конфигураций;  
- CI: тесты + сборка docker-образов.

**Ожидаемый результат:** комиссия понимает структуру решения.

## 2) Swagger API (20-30 сек)

**Открыть:** `http://localhost:8000/docs`  
**Показать endpoints:**  
- `POST /auth/login`  
- `POST /auth/refresh`  
- `POST /auth/logout`  
- `GET /products`  
- `POST /configurations`  
- `POST /users` (admin only)

**Сказать:**  
«Документация генерируется автоматически и отражает текущую реализацию API.»

## 3) Логин + RBAC на фронте (50-70 сек)

**Открыть:** `http://localhost:8080` (или `frontend/index.html`)  

### 3.1 Admin
**Действие:** login `admin@example.com / admin123`  
**Проверить:**  
- role badge = `Admin`;  
- доступен блок `Create user (admin)`.

### 3.2 User
**Действие:** logout, login `user@example.com / user123`  
**Проверить:**  
- role badge = `User`;  
- admin-блок скрыт.

**Сказать:**  
«RBAC работает и на backend, и на frontend: UI скрывает admin-функции, backend дополнительно валидирует роль токена.»

## 4) Совместимость конфигураций (40-60 сек)

**Действие 1 (успех):** создать конфигурацию с разрешённым item, например `101`.  
**Результат:** success + `configuration_id`.

**Действие 2 (ошибка):** попытаться создать конфигурацию с `103`.  
**Результат:** backend возвращает ошибку несовместимости.

**Сказать:**  
«Правила совместимости централизованы в backend service и блокируют недопустимые комбинации.»

## 5) Токены (30-40 сек)

**Сказать:**  
- login выдаёт `access + refresh`;  
- при `401` frontend делает auto-refresh;  
- logout отзывает refresh-токен.

**(Опционально показать в Swagger/Postman)** `POST /auth/refresh` и `POST /auth/logout`.

## 6) Качество и воспроизводимость (20-30 сек)

**Показать в терминале:** `pytest -q`  
**Сказать:**  
«Есть автоматические тесты на auth/RBAC/compatibility/token flow, плюс CI запускает тесты и сборку контейнеров.»

## Seed аккаунты

- `admin@example.com / admin123`
- `user@example.com / user123`

## URL

- Frontend: `http://localhost:8080`
- Backend: `http://localhost:8000`
- Swagger: `http://localhost:8000/docs`

## Если зададут “что можно улучшить?”

Короткий ответ:

1. Перейти с SQLite на PostgreSQL для production.  
2. Добавить больше integration/e2e тестов.  
3. Расширить наблюдаемость: централизованные логи и метрики.
