"""
Executable rules_json layer: merges declarative rules with Product columns.

Priority: the first matching rule in the JSON array wins for each dimension
(speed filter, module slot limit, built-in license AP). If no rule applies,
the corresponding Product column is used (same behavior as before).

Supported rule shapes (minimal set for the thesis prototype):
  {"type": "filter", "field": "speed", "allowed": [1, 10]}
  {"type": "limit", "field": "modules", "max": 8}
  {"type": "license", "included": 16}

Comments in English per project convention.
"""

from __future__ import annotations

import json
from typing import List, Optional, Tuple

from app.models.product import Product
from app.services.speed_allowlist import parse_speed_allowlist_json


def _rules_list(product: Product) -> List[dict]:
    raw = getattr(product, "rules_json", None)
    if not raw or not str(raw).strip():
        return []
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        return []
    if isinstance(data, list):
        return [x for x in data if isinstance(x, dict)]
    if isinstance(data, dict):
        return [data]
    return []


def effective_speed_allowlist(product: Product) -> Tuple[Optional[List[int]], str]:
    """
    Allowed module speeds in Gbps for filtering catalog modules.
    Returns (list or None, "rules_json" | "column" | "none").
    None = no speed filter (all modules allowed).
    """
    for r in _rules_list(product):
        if r.get("type") != "filter" or r.get("field") != "speed":
            continue
        allowed = r.get("allowed")
        if not isinstance(allowed, list) or len(allowed) == 0:
            continue
        try:
            out = [int(x) for x in allowed]
            return (out, "rules_json")
        except (ValueError, TypeError):
            continue
    col = parse_speed_allowlist_json(product.module_speeds_json)
    if col is None:
        return (None, "none")
    return (col, "column")


def effective_max_module_slots(product: Product) -> Tuple[Optional[int], str]:
    """Max total module quantity per equipment line (sum across module types)."""
    for r in _rules_list(product):
        if r.get("type") != "limit" or r.get("field") != "modules":
            continue
        m = r.get("max")
        if m is None:
            continue
        try:
            mi = int(m)
            if mi >= 0:
                return (mi, "rules_json")
        except (ValueError, TypeError):
            continue
    return (product.max_module_slots, "column")


def effective_built_in_license_units(product: Product) -> Tuple[Optional[int], str]:
    """Built-in AP capacity from license rule or product column."""
    for r in _rules_list(product):
        if r.get("type") != "license":
            continue
        if "included" not in r:
            continue
        inc = r.get("included")
        try:
            v = int(inc)
            if v >= 0:
                return (v, "rules_json")
        except (ValueError, TypeError):
            continue
    return (product.built_in_license_units, "column")
