"""Parse Wi-Fi controller/AP products into structured spec values for catalog filters."""

from __future__ import annotations

import re
from typing import Any

WIFI_EQUIPMENT_TYPE_CODES = frozenset({"VNC", "VAP"})

WIFI_EQUIPMENT_SPEC_PARAMETERS: list[dict[str, Any]] = [
    {"code": "wifi_device_type", "name": "Тип", "sort_order": 10},
]

_CONNECTION_CERT_RE = re.compile(r"сертификат\s+на\s+подключение", re.IGNORECASE)


def parse_wifi_equipment_product(
    *,
    name: str,
    description: str,
    product_category: str | None,
    section_title: str = "",
) -> dict[str, str]:
    """Classify wifi equipment subgroup rows as controller, AP, or AP license cert."""
    article = (name or "").strip().upper()
    desc = (description or "").strip()
    category = (product_category or "").upper()
    section = (section_title or "").lower()

    if article.startswith("VNC-L-") or _CONNECTION_CERT_RE.search(desc):
        return {"wifi_device_type": "connection_certificate"}
    if category == "VNC":
        return {"wifi_device_type": "controller"}
    if category == "VAP" and "аксессуар" not in section:
        return {"wifi_device_type": "access_point"}
    return {}
