import json
import logging
from datetime import datetime, timezone
from urllib.parse import quote

from authlib.integrations.starlette_client import OAuth
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import HTMLResponse, RedirectResponse
from pydantic import BaseModel, Field
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.core.config import settings
from app.core.email_domain import email_domain
from app.core.jwt import create_access_token, create_refresh_token, decode_access_token
from app.core.security import hash_password, verify_password
from app.db.session import SessionLocal
from app.models.company import Company
from app.models.refresh_token import RefreshToken
from app.models.role import Role
from app.models.user import User


router = APIRouter(prefix="/auth", tags=["auth"])
oauth = OAuth()
logger = logging.getLogger(__name__)

_OAUTH_CALLBACK_PATHS = {
    "google_callback": "/auth/google/callback",
    "microsoft_callback": "/auth/microsoft/callback",
    "yandex_callback": "/auth/yandex/callback",
}


def _oauth_redirect_uri(request: Request, route_name: str) -> str:
    """
    Google/Microsoft require redirect_uri to match the registered URL exactly (https on prod).
    Behind Render, request.url_for may see http unless proxy headers are trusted; PUBLIC_BASE_URL fixes that.
    """
    base = (settings.public_base_url or "").strip().rstrip("/")
    if base:
        suffix = _OAUTH_CALLBACK_PATHS.get(route_name)
        if not suffix:
            raise ValueError(f"Unknown OAuth route name: {route_name}")
        return base + suffix
    return str(request.url_for(route_name))

if settings.google_client_id and settings.google_client_secret:
    oauth.register(
        name="google",
        client_id=settings.google_client_id,
        client_secret=settings.google_client_secret,
        server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
        client_kwargs={"scope": "openid email profile"},
    )

if settings.microsoft_client_id and settings.microsoft_client_secret:
    oauth.register(
        name="microsoft",
        client_id=settings.microsoft_client_id,
        client_secret=settings.microsoft_client_secret,
        server_metadata_url="https://login.microsoftonline.com/common/v2.0/.well-known/openid-configuration",
        client_kwargs={"scope": "openid email profile"},
    )

if settings.yandex_client_id and settings.yandex_client_secret:
    oauth.register(
        name="yandex",
        client_id=settings.yandex_client_id,
        client_secret=settings.yandex_client_secret,
        access_token_url="https://oauth.yandex.ru/token",
        authorize_url="https://oauth.yandex.ru/authorize",
        api_base_url="https://login.yandex.ru/",
        client_kwargs={"scope": "login:email login:info"},
        token_endpoint_auth_method="client_secret_post",
    )


class LoginRequest(BaseModel):
    email: str
    password: str


class RefreshRequest(BaseModel):
    refresh_token: str


class RegisterRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    email: str
    password: str = Field(..., min_length=6, max_length=128)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _frontend_base() -> str:
    return (settings.frontend_url or "http://127.0.0.1:5500").rstrip("/")


def _oauth_bridge_response(payload: dict) -> HTMLResponse:
    """
    Finish OAuth in the browser: store JWT pair in localStorage (same keys as login.html)
    and redirect to the SPA. Callback must be opened as top-level navigation (not XHR).
    """
    at = payload.get("access_token")
    rt = payload.get("refresh_token")
    index_url = f"{_frontend_base()}/index.html"
    login_url = f"{_frontend_base()}/login.html"
    data = json.dumps(
        {
            "access_token": at,
            "refresh_token": rt,
            "next": index_url,
            "fallback": login_url,
        },
        ensure_ascii=False,
    )
    html = f"""<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>OAuth</title></head><body>
<script type="application/json" id="oauth-bridge-data">{data}</script>
<script>
(function() {{
  try {{
    var el = document.getElementById("oauth-bridge-data");
    var o = JSON.parse(el.textContent);
    if (o.access_token && o.refresh_token) {{
      localStorage.setItem("access_token", o.access_token);
      localStorage.setItem("refresh_token", o.refresh_token);
      window.location.replace(o.next);
    }} else {{
      window.location.replace(o.fallback + "?oauth_error=1&detail=" + encodeURIComponent("Missing tokens from server"));
    }}
  }} catch (e) {{
    window.location.replace("{login_url}?oauth_error=1&detail=" + encodeURIComponent(e.message || "oauth_bridge"));
  }}
}})();
</script>
<p style="font-family:system-ui,sans-serif;padding:24px;color:#374151">Завершение входа… Если окно не закрылось, <a href="{index_url}">откройте конфигуратор</a>.</p>
</body></html>"""
    return HTMLResponse(content=html, media_type="text/html; charset=utf-8")


def _oauth_error_redirect(detail: str) -> RedirectResponse:
    """Send user back to login page with a readable error (query string)."""
    login_url = f"{_frontend_base()}/login.html"
    q = quote(str(detail)[:500], safe="")
    return RedirectResponse(url=f"{login_url}?oauth_error=1&detail={q}", status_code=302)


def _issue_app_token(user: User, db: Session) -> dict:
    if user.role_id != 1 and not getattr(user, "is_approved", False):
        raise HTTPException(
            status_code=403,
            detail="Account is pending administrator approval",
        )
    access_token = create_access_token(
        data={
            "sub": str(user.id),
            "role_id": user.role_id,
            "company_id": user.company_id,
            "email": user.email,
        },
        expires_minutes=settings.access_token_exp_minutes,
    )
    refresh_token = create_refresh_token(
        data={
            "sub": str(user.id),
            "role_id": user.role_id,
            "company_id": user.company_id,
            "email": user.email,
        },
        expires_minutes=settings.refresh_token_exp_minutes,
    )
    refresh_payload = decode_access_token(refresh_token)
    refresh_jti = refresh_payload.get("jti")
    refresh_exp = refresh_payload.get("exp")
    if not refresh_jti or not refresh_exp:
        raise HTTPException(status_code=500, detail="Failed to issue refresh token")

    db_exp = datetime.fromtimestamp(int(refresh_exp), tz=timezone.utc).replace(tzinfo=None)
    db.add(
        RefreshToken(
            user_id=user.id,
            jti=str(refresh_jti),
            expires_at=db_exp,
            revoked=False,
        )
    )
    db.commit()

    return {
        "status": "ok",
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user_email": user.email,
        "user_id": user.id,
        "role_id": user.role_id,
        "company_id": user.company_id,
    }


def _provision_or_get_user_for_domain(db: Session, email: str, display_name: str | None) -> User:
    local_part, _, domain_part = email.partition("@")
    if not domain_part:
        raise HTTPException(status_code=400, detail="Invalid email from OAuth provider")

    domain = domain_part.lower().strip()
    company = db.query(Company).filter(func.lower(Company.domain) == domain).first()
    if not company:
        raise HTTPException(
            status_code=403,
            detail=f"Registration for domain '{domain}' is not allowed",
        )

    user = db.query(User).filter(func.lower(User.email) == email.lower()).first()
    if user:
        return user

    # Default partner role is "user" (role_id=2 from seed).
    default_role = db.query(Role).filter(Role.name == "user").first()
    role_id = default_role.id if default_role else 2

    user = User(
        name=display_name or local_part,
        email=email.lower(),
        password_hash="oauth_not_used",
        role_id=role_id,
        company_id=company.id,
        is_approved=False,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def _extract_oauth_identity(provider: str, token: dict) -> tuple[str, str]:
    userinfo = token.get("userinfo") or {}

    if provider == "yandex":
        email = userinfo.get("default_email") or userinfo.get("email")
        if not email:
            raise HTTPException(status_code=400, detail="Yandex did not return email")
        name = (
            userinfo.get("real_name")
            or userinfo.get("display_name")
            or userinfo.get("login")
            or email.split("@")[0]
        )
        return str(email).lower(), str(name)

    # Google and Microsoft may use slightly different email fields.
    email = (
        userinfo.get("email")
        or userinfo.get("preferred_username")
        or userinfo.get("upn")
    )
    if not email:
        raise HTTPException(status_code=400, detail="OAuth provider did not return email")

    name = userinfo.get("name") or email.split("@")[0]
    return str(email), str(name)


async def _fetch_yandex_userinfo(client, token: dict) -> dict:
    resp = await client.get("info", params={"format": "json"}, token=token)
    resp.raise_for_status()
    return resp.json()


@router.post("/login")
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    email_norm = (payload.email or "").strip().lower()
    if not email_norm or "@" not in email_norm:
        raise HTTPException(status_code=400, detail="Invalid email")
    user = (
        db.query(User)
        .options(joinedload(User.company))
        .filter(func.lower(func.trim(User.email)) == email_norm)
        .first()
    )
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    # Admins may sign in regardless of domain; other roles must match company domain.
    if user.role_id != 1:
        dom = email_domain(user.email)
        if not dom or not user.company:
            raise HTTPException(
                status_code=403,
                detail="Account is missing a valid organization; contact administrator",
            )
        if dom != user.company.domain.lower().strip():
            raise HTTPException(
                status_code=403,
                detail="Email domain does not match registered organization",
            )
        if not getattr(user, "is_approved", False):
            raise HTTPException(
                status_code=403,
                detail="Account is pending administrator approval",
            )

    return _issue_app_token(user, db)


@router.post("/register")
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    """
    Self-service signup: email domain must match a Company.domain added by an admin.
    New users get role "user".
    """
    email_norm = (payload.email or "").strip().lower()
    if not email_norm or "@" not in email_norm:
        raise HTTPException(status_code=400, detail="Invalid email")
    name = (payload.name or "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="Name is required")

    dom = email_domain(email_norm)
    if not dom:
        raise HTTPException(status_code=400, detail="Invalid email")

    company = (
        db.query(Company)
        .filter(func.lower(func.trim(Company.domain)) == dom)
        .first()
    )
    if not company:
        raise HTTPException(
            status_code=403,
            detail="No organization is registered for this email domain. Ask your administrator to add your company.",
        )

    exists = (
        db.query(User)
        .filter(func.lower(func.trim(User.email)) == email_norm)
        .first()
    )
    if exists:
        raise HTTPException(
            status_code=409,
            detail="User with this email already exists",
        )

    user_role = db.query(Role).filter(Role.name == "user").first()
    role_id = user_role.id if user_role else 2

    user = User(
        name=name,
        email=email_norm,
        password_hash=hash_password(payload.password),
        role_id=role_id,
        company_id=company.id,
        is_approved=False,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return {
        "status": "pending",
        "message": "Registration submitted. An administrator must approve your account before you can sign in.",
        "user_id": user.id,
        "email": user.email,
        "is_approved": False,
    }


@router.post("/refresh")
def refresh_tokens(payload: RefreshRequest, db: Session = Depends(get_db)):
    try:
        token_data = decode_access_token(payload.refresh_token)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    if token_data.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid token type")

    jti = token_data.get("jti")
    sub = token_data.get("sub")
    if not jti or not sub:
        raise HTTPException(status_code=401, detail="Malformed refresh token")

    stored = db.query(RefreshToken).filter(RefreshToken.jti == str(jti)).first()
    if not stored or stored.revoked:
        raise HTTPException(status_code=401, detail="Refresh token revoked or not found")

    now_utc_naive = datetime.now(timezone.utc).replace(tzinfo=None)
    if stored.expires_at <= now_utc_naive:
        stored.revoked = True
        db.commit()
        raise HTTPException(status_code=401, detail="Refresh token expired")

    user = db.query(User).filter(User.id == int(sub)).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    stored.revoked = True
    db.commit()
    return _issue_app_token(user, db)


@router.post("/logout")
def logout(payload: RefreshRequest, db: Session = Depends(get_db)):
    try:
        token_data = decode_access_token(payload.refresh_token)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    if token_data.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid token type")

    jti = token_data.get("jti")
    if not jti:
        raise HTTPException(status_code=401, detail="Malformed refresh token")

    stored = db.query(RefreshToken).filter(RefreshToken.jti == str(jti)).first()
    if stored and not stored.revoked:
        stored.revoked = True
        db.commit()

    return {"status": "ok", "message": "Logged out"}


@router.get("/oauth/providers")
def oauth_providers():
    """Which social login buttons the frontend should show."""
    return {
        "google": bool(settings.google_client_id and settings.google_client_secret),
        "microsoft": bool(
            settings.microsoft_client_id and settings.microsoft_client_secret
        ),
        "yandex": bool(settings.yandex_client_id and settings.yandex_client_secret),
    }


@router.get("/google/login")
async def google_login(request: Request):
    client = oauth.create_client("google")
    if not client:
        return _oauth_error_redirect("Google OAuth is not configured (set GOOGLE_CLIENT_ID/SECRET in .env).")
    redirect_uri = _oauth_redirect_uri(request, "google_callback")
    return await client.authorize_redirect(request, redirect_uri)


@router.get("/google/callback")
async def google_callback(request: Request, db: Session = Depends(get_db)):
    client = oauth.create_client("google")
    if not client:
        return _oauth_error_redirect("Google OAuth is not configured.")

    try:
        token = await client.authorize_access_token(request)
    except Exception as e:
        logger.warning("Google OAuth token exchange failed: %s", e)
        return _oauth_error_redirect(
            "Google sign-in failed. Check Authorized redirect URI in Google Cloud "
            "(must match this server's /auth/google/callback URL exactly)."
        )

    try:
        email, name = _extract_oauth_identity("google", token)
        user = _provision_or_get_user_for_domain(db, email=email, display_name=name)
        payload = _issue_app_token(user, db)
    except HTTPException as he:
        d = he.detail
        if not isinstance(d, str):
            d = str(d)
        return _oauth_error_redirect(d)

    return _oauth_bridge_response(payload)


@router.get("/microsoft/login")
async def microsoft_login(request: Request):
    client = oauth.create_client("microsoft")
    if not client:
        return _oauth_error_redirect(
            "Microsoft OAuth is not configured (set MICROSOFT_CLIENT_ID/SECRET in .env)."
        )
    redirect_uri = _oauth_redirect_uri(request, "microsoft_callback")
    return await client.authorize_redirect(request, redirect_uri)


@router.get("/microsoft/callback")
async def microsoft_callback(request: Request, db: Session = Depends(get_db)):
    client = oauth.create_client("microsoft")
    if not client:
        return _oauth_error_redirect("Microsoft OAuth is not configured.")

    try:
        token = await client.authorize_access_token(request)
    except Exception as e:
        logger.warning("Microsoft OAuth token exchange failed: %s", e)
        return _oauth_error_redirect(
            "Microsoft sign-in failed. Check redirect URI in Azure App Registration."
        )

    try:
        email, name = _extract_oauth_identity("microsoft", token)
        user = _provision_or_get_user_for_domain(db, email=email, display_name=name)
        payload = _issue_app_token(user, db)
    except HTTPException as he:
        d = he.detail
        if not isinstance(d, str):
            d = str(d)
        return _oauth_error_redirect(d)

    return _oauth_bridge_response(payload)


@router.get("/yandex/login")
async def yandex_login(request: Request):
    client = oauth.create_client("yandex")
    if not client:
        return _oauth_error_redirect(
            "Yandex OAuth is not configured (set YANDEX_CLIENT_ID/SECRET in .env)."
        )
    redirect_uri = _oauth_redirect_uri(request, "yandex_callback")
    return await client.authorize_redirect(request, redirect_uri)


@router.get("/yandex/callback")
async def yandex_callback(request: Request, db: Session = Depends(get_db)):
    client = oauth.create_client("yandex")
    if not client:
        return _oauth_error_redirect("Yandex OAuth is not configured.")

    try:
        token = await client.authorize_access_token(request)
        token["userinfo"] = await _fetch_yandex_userinfo(client, token)
    except Exception as e:
        logger.warning("Yandex OAuth failed: %s", e)
        return _oauth_error_redirect(
            "Yandex sign-in failed. Check Redirect URI in Yandex OAuth "
            "(must match this server's /auth/yandex/callback URL exactly)."
        )

    try:
        email, name = _extract_oauth_identity("yandex", token)
        user = _provision_or_get_user_for_domain(db, email=email, display_name=name)
        payload = _issue_app_token(user, db)
    except HTTPException as he:
        d = he.detail
        if not isinstance(d, str):
            d = str(d)
        return _oauth_error_redirect(d)

    return _oauth_bridge_response(payload)

