"""Parse V-Sense firewall products into structured spec values for catalog filters."""

from __future__ import annotations

import re
from typing import Any

VFW_TYPE_CODE = "VFW"

VFW_EQUIPMENT_SPEC_PARAMETERS: list[dict[str, Any]] = [
    {"code": "vfw_item_type", "name": "Тип", "sort_order": 10},
]

_CERTIFICATE_RE = re.compile(r"^сертификат", re.IGNORECASE)
_FIREWALL_RE = re.compile(r"^межсетевой\s+экран", re.IGNORECASE)


def parse_vfw_equipment_product(*, name: str, description: str) -> dict[str, str]:
    """Classify VFW rows as firewall hardware or certificate."""
    text = (description or "").strip()
    if not text and not (name or "").strip():
        return {}

    if _CERTIFICATE_RE.match(text):
        return {"vfw_item_type": "certificate"}
    if _FIREWALL_RE.match(text):
        return {"vfw_item_type": "firewall"}
    return {}
