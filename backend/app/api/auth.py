from datetime import datetime, timezone

from authlib.integrations.starlette_client import OAuth
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.jwt import create_access_token, create_refresh_token, decode_access_token
from app.core.security import verify_password
from app.db.session import SessionLocal
from app.models.company import Company
from app.models.refresh_token import RefreshToken
from app.models.role import Role
from app.models.user import User


router = APIRouter(prefix="/auth", tags=["auth"])
oauth = OAuth()

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


class LoginRequest(BaseModel):
    email: str
    password: str


class RefreshRequest(BaseModel):
    refresh_token: str


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _issue_app_token(user: User, db: Session) -> dict:
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
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def _extract_oauth_identity(provider: str, token: dict) -> tuple[str, str]:
    userinfo = token.get("userinfo") or {}

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


@router.post("/login")
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    return _issue_app_token(user, db)


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


@router.get("/google/login")
async def google_login(request: Request):
    client = oauth.create_client("google")
    if not client:
        raise HTTPException(status_code=503, detail="Google OAuth is not configured")
    redirect_uri = request.url_for("google_callback")
    return await client.authorize_redirect(request, redirect_uri)


@router.get("/google/callback")
async def google_callback(request: Request, db: Session = Depends(get_db)):
    client = oauth.create_client("google")
    if not client:
        raise HTTPException(status_code=503, detail="Google OAuth is not configured")

    token = await client.authorize_access_token(request)
    email, name = _extract_oauth_identity("google", token)
    user = _provision_or_get_user_for_domain(db, email=email, display_name=name)
    return _issue_app_token(user, db)


@router.get("/microsoft/login")
async def microsoft_login(request: Request):
    client = oauth.create_client("microsoft")
    if not client:
        raise HTTPException(status_code=503, detail="Microsoft OAuth is not configured")
    redirect_uri = request.url_for("microsoft_callback")
    return await client.authorize_redirect(request, redirect_uri)


@router.get("/microsoft/callback")
async def microsoft_callback(request: Request, db: Session = Depends(get_db)):
    client = oauth.create_client("microsoft")
    if not client:
        raise HTTPException(status_code=503, detail="Microsoft OAuth is not configured")

    token = await client.authorize_access_token(request)
    email, name = _extract_oauth_identity("microsoft", token)
    user = _provision_or_get_user_for_domain(db, email=email, display_name=name)
    return _issue_app_token(user, db)

