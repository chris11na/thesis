import json
import logging
import time

from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.sessions import SessionMiddleware
from app.api.routes import router
from app.db.session import engine, SessionLocal
from app.db.base import Base
from app.models import User
from app.db.seed import seed_initial_data
from app.core.config import settings
from app.admin import setup_admin


# ---- Logging ----
logger = logging.getLogger("product-configurator")
if not logger.handlers:
    handler = logging.StreamHandler()
    formatter = logging.Formatter(
        fmt="%(asctime)s %(levelname)s %(name)s %(message)s"
    )
    handler.setFormatter(formatter)
    logger.addHandler(handler)
logger.setLevel(logging.INFO)


app = FastAPI(
    title="Product Configurator API",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

app.add_middleware(
    SessionMiddleware,
    secret_key=settings.jwt_secret,
    https_only=False,  # prototype; do not enforce in local dev
)

app.add_middleware(
    CORSMiddleware,
    # Prototype-friendly: allow the local dev frontend to call this API.
    # If you later need stricter security, replace "*" with specific origins.
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def log_requests_and_responses(request: Request, call_next):
    start = time.time()

    req_body = None
    content_type = request.headers.get("content-type", "")
    if request.method in ("POST", "PUT", "PATCH") and "application/json" in content_type:
        # Starlette caches the body after reading it.
        raw = await request.body()
        if raw:
            try:
                req_body = json.loads(raw.decode("utf-8"))
            except Exception:
                req_body = raw.decode("utf-8", errors="replace")

    response = await call_next(request)

    # Not all responses have `.body` (e.g. StreamingResponse). We'll log best-effort.
    resp_body = None
    if hasattr(response, "body") and response.body:
        raw_resp = response.body
        # Keep logs small.
        raw_resp = raw_resp[:4000]
        try:
            resp_body = json.loads(raw_resp.decode("utf-8"))
        except Exception:
            resp_body = raw_resp.decode("utf-8", errors="replace")

    duration_ms = int((time.time() - start) * 1000)
    logger.info(
        "request method=%s path=%s status=%s duration_ms=%s req_body=%s resp_body=%s",
        request.method,
        request.url.path,
        response.status_code,
        duration_ms,
        req_body,
        resp_body,
    )
    return response


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    logger.warning(
        "http_error method=%s path=%s status=%s detail=%s",
        request.method,
        request.url.path,
        exc.status_code,
        exc.detail,
    )
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.exception(
        "unhandled_error method=%s path=%s",
        request.method,
        request.url.path,
    )
    return JSONResponse(status_code=500, content={"detail": "Internal Server Error"})

Base.metadata.create_all(bind=engine)

app.include_router(router)


# Mount /admin (SQLAdmin) after app is created and SessionMiddleware is installed.
setup_admin(app)


@app.on_event("startup")
def seed_on_startup() -> None:
    # Seed minimal prototype data (roles/users/products) if DB is empty.
    db = SessionLocal()
    try:
        seed_initial_data(db)
    finally:
        db.close()

@app.get("/")
def root():
    return {"status": "ok"}
