"""Parse Wi-Fi AP accessory descriptions into structured spec values."""

from __future__ import annotations

import re
from typing import Any

WIFI_ACCESSORY_SPEC_PARAMETERS: list[dict[str, Any]] = [
    {"code": "wifi_accessory_kind", "name": "Тип", "sort_order": 10},
]

_ENCLOSURE_RE = re.compile(r"корпус", re.IGNORECASE)
_ANTENNA_RE = re.compile(r"антенн", re.IGNORECASE)


def parse_wifi_accessory_product(*, name: str, description: str) -> dict[str, str]:
    """Classify wifi accessories as antenna or enclosure."""
    text = (description or "").strip()
    article = (name or "").strip().upper()
    if not text and not article:
        return {}

    if _ENCLOSURE_RE.search(text) or article.startswith("VAP-BOX-"):
        return {"wifi_accessory_kind": "enclosure"}
    if _ANTENNA_RE.search(text) or article.startswith(("VAP-2458-", "VAP-2450-")):
        return {"wifi_accessory_kind": "antenna"}
    return {}
