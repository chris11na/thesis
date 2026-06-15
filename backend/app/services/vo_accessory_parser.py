"""Parse VO accessory descriptions into structured spec values for catalog filters."""

from __future__ import annotations

import re
from typing import Any

VO_TYPE_CODE = "VO"

VO_ACCESSORY_SPEC_PARAMETERS: list[dict[str, Any]] = [
    {"code": "vo_item_type", "name": "Тип", "sort_order": 10},
]

_CABLE_RE = re.compile(r"^кабель", re.IGNORECASE)
_MODULE_RE = re.compile(r"^модуль", re.IGNORECASE)


def parse_vo_accessory_description(description: str) -> dict[str, str]:
    """Extract normalized VO accessory spec values from a Russian catalog description."""
    text = (description or "").strip()
    if not text:
        return {}

    result: dict[str, str] = {}
    if _CABLE_RE.match(text):
        result["vo_item_type"] = "cable"
    elif _MODULE_RE.match(text):
        result["vo_item_type"] = "module"
    return result
