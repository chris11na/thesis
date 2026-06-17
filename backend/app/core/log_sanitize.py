"""Redact secrets before writing request/response payloads to logs."""

from __future__ import annotations

from typing import Any

_SENSITIVE_KEYS = frozenset(
    {
        "password",
        "password_hash",
        "refresh_token",
        "access_token",
        "token",
        "client_secret",
        "smtp_password",
        "authorization",
    }
)

_REDACTED = "***"


def sanitize_for_log(value: Any) -> Any:
    if isinstance(value, dict):
        out: dict[Any, Any] = {}
        for key, item in value.items():
            if isinstance(key, str) and key.lower() in _SENSITIVE_KEYS:
                out[key] = _REDACTED
            else:
                out[key] = sanitize_for_log(item)
        return out
    if isinstance(value, list):
        return [sanitize_for_log(item) for item in value]
    return value
