from datetime import datetime, timedelta, timezone
from typing import Any, Dict
from uuid import uuid4

from jose import jwt, JWTError

from app.core.config import settings


def create_access_token(data: Dict[str, Any], expires_minutes: int) -> str:
    """
    Create signed JWT token.
    Used only for the prototype RBAC checks (token is optional for current frontend).
    """
    now = datetime.now(timezone.utc)
    exp = now + timedelta(minutes=expires_minutes)
    payload = dict(data)
    payload.update({"iat": int(now.timestamp()), "exp": exp, "type": "access"})
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def create_refresh_token(data: Dict[str, Any], expires_minutes: int) -> str:
    now = datetime.now(timezone.utc)
    exp = now + timedelta(minutes=expires_minutes)
    payload = dict(data)
    payload.update(
        {
            "iat": int(now.timestamp()),
            "exp": exp,
            "type": "refresh",
            "jti": uuid4().hex,
        }
    )
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> Dict[str, Any]:
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
        return payload  # type: ignore[return-value]
    except JWTError as e:
        raise e

