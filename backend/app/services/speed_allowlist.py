"""Parse product.module_speeds_json into a list of allowed Gbps speeds."""

import json
from typing import List, Optional


def parse_speed_allowlist_json(raw: Optional[str]) -> Optional[List[int]]:
    if not raw or not raw.strip():
        return None
    try:
        data = json.loads(raw)
        if not isinstance(data, list):
            return None
        return [int(x) for x in data]
    except (ValueError, TypeError, json.JSONDecodeError):
        return None
