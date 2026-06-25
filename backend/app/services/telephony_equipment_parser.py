"""Parse telephony products into structured spec values for catalog filters."""

from __future__ import annotations

import re
from typing import Any

VCM_TYPE_CODE = "VCM"
VP_TYPE_CODE = "VP"

TELEPHONY_EQUIPMENT_SPEC_PARAMETERS: list[dict[str, Any]] = [
    {"code": "telephony_item_type", "name": "Тип телефонии (VCM / VP)", "sort_order": 10},
]

_EXPANSION_MODULE_RE = re.compile(r"^модуль\s+расширения", re.IGNORECASE)
_CERTIFICATE_RE = re.compile(r"^сертификат", re.IGNORECASE)
_IP_PHONE_RE = re.compile(r"^ip-телефон", re.IGNORECASE)
_COMM_MANAGER_RE = re.compile(r"вектор\s+communication\s+manager", re.IGNORECASE)


def parse_telephony_equipment_product(
    *,
    name: str,
    description: str,
    type_code: str = "",
) -> dict[str, str]:
    """Classify telephony equipment as CM, module, certificate, or IP phone."""
    text = (description or "").strip()
    category = (type_code or "").strip().upper()
    if not text and not (name or "").strip() and not category:
        return {}

    if category == VP_TYPE_CODE or _IP_PHONE_RE.match(text):
        return {"telephony_item_type": "ip_phone"}
    if _EXPANSION_MODULE_RE.match(text):
        return {"telephony_item_type": "expansion_module"}
    if _CERTIFICATE_RE.match(text):
        return {"telephony_item_type": "certificate"}
    if _COMM_MANAGER_RE.search(text) or category == VCM_TYPE_CODE:
        return {"telephony_item_type": "communication_manager"}
    return {}
