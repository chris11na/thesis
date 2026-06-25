"""Parse V-Sense management products into structured spec values for catalog filters."""

from __future__ import annotations

import re
from typing import Any

VS_TYPE_CODE = "VS"

VS_MANAGEMENT_SPEC_PARAMETERS: list[dict[str, Any]] = [
    {"code": "vs_item_type", "name": "Тип V-Sense (VS)", "sort_order": 10},
]

_CERTIFICATE_RE = re.compile(r"^сертификат\s+на\s+право\s+подключения", re.IGNORECASE)
_SYSTEM_RE = re.compile(r"^система\s+управления", re.IGNORECASE)


def parse_vs_management_product(*, name: str, description: str) -> dict[str, str]:
    """Classify VS rows as management platform or device connection certificate."""
    article = (name or "").strip().upper()
    text = (description or "").strip()
    if not text and not article:
        return {}

    if _CERTIFICATE_RE.match(text) or re.match(r"^VS-\d+$", article):
        return {"vs_item_type": "connection_certificate"}
    if _SYSTEM_RE.match(text) or article in {"VS-V", "VS-H"}:
        return {"vs_item_type": "management_system"}
    return {}
