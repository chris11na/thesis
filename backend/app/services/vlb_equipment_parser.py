"""Parse VLB load balancer products into structured spec values for catalog filters."""

from __future__ import annotations

import re
from typing import Any

VLB_TYPE_CODE = "VLB"

VLB_EQUIPMENT_SPEC_PARAMETERS: list[dict[str, Any]] = [
    {"code": "vlb_device_type", "name": "Тип балансировщика (VLB)", "sort_order": 10},
]

_INTERFACE_MODULE_RE = re.compile(r"^интерфейсный\s+модуль", re.IGNORECASE)
_VIRTUAL_SERVER_RE = re.compile(r"^виртуальный\s+сервер", re.IGNORECASE)
_TRAFFIC_SERVER_RE = re.compile(r"^сервер\s+балансировки", re.IGNORECASE)


def parse_vlb_equipment_product(*, name: str, description: str) -> dict[str, str]:
    """Classify VLB rows as interface module, hardware server, or virtual server."""
    article = (name or "").strip().upper()
    text = (description or "").strip()

    if _INTERFACE_MODULE_RE.match(text) or (
        article.startswith("VLB-") and not article.startswith("VLB0")
    ):
        return {"vlb_device_type": "interface_module"}
    if _VIRTUAL_SERVER_RE.match(text) or article.endswith("-V") or article.startswith(
        "VLB10-"
    ):
        return {"vlb_device_type": "virtual_server"}
    if _TRAFFIC_SERVER_RE.match(text) or re.match(r"^VLB\d{2}-", article):
        return {"vlb_device_type": "traffic_server"}
    return {}
