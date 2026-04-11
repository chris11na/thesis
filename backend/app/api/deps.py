from typing import Any

from fastapi import Depends, Header, HTTPException

from app.core.jwt import decode_access_token


def _parse_bearer_token(authorization: str | None) -> str:
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing Authorization header")
    try:
        scheme, token = authorization.split(" ", 1)
    except ValueError as exc:
        raise HTTPException(status_code=401, detail="Invalid Authorization header") from exc
    if scheme.lower() != "bearer" or not token:
        raise HTTPException(status_code=401, detail="Invalid Authorization header")
    return token


def get_current_user_claims(authorization: str | None = Header(default=None)) -> dict[str, Any]:
    token = _parse_bearer_token(authorization)
    try:
        return decode_access_token(token)
    except Exception as exc:
        raise HTTPException(status_code=401, detail="Invalid access token") from exc


def require_roles(*allowed_role_ids: int):
    def _checker(claims: dict[str, Any] = Depends(get_current_user_claims)) -> dict[str, Any]:
        role_id = claims.get("role_id")
        if role_id not in allowed_role_ids:
            raise HTTPException(status_code=403, detail="RBAC: insufficient role permissions")
        return claims

    return _checker
