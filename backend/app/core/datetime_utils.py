"""UTC storage helpers and Moscow (UTC+3) display formatting."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

MOSCOW_TZ = timezone(timedelta(hours=3))


def utc_now_naive() -> datetime:
    """Naive UTC timestamp for DB columns (existing schema)."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _as_utc_aware(dt: datetime) -> datetime:
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def format_utc_as_moscow(dt: datetime | None, *, with_seconds: bool = True) -> str:
    """Format a UTC-stored naive datetime for users in Moscow (UTC+3)."""
    if dt is None:
        return ""
    local = _as_utc_aware(dt).astimezone(MOSCOW_TZ)
    pattern = "%d.%m.%Y %H:%M:%S" if with_seconds else "%d.%m.%Y %H:%M"
    return local.strftime(pattern)


def format_utc_as_moscow_iso(dt: datetime | None) -> str | None:
    """ISO-8601 with +03:00 offset for API clients."""
    if dt is None:
        return None
    local = _as_utc_aware(dt).astimezone(MOSCOW_TZ)
    return local.isoformat(timespec="seconds")
