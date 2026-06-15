"""Parse switch product descriptions into structured spec values for catalog filters."""

from __future__ import annotations

import re
from typing import Any

SWITCH_TYPE_CODES = frozenset({"VA", "VC", "VI"})

SWITCH_SPEC_PARAMETERS: list[dict[str, Any]] = [
    {"code": "switch_layer", "name": "Уровень", "sort_order": 10},
    {"code": "rj45_ports", "name": "Портов RJ45", "sort_order": 20},
    {"code": "copper_speed", "name": "Скорость медных портов", "sort_order": 30},
    {"code": "poe_plus", "name": "PoE+", "sort_order": 40},
    {"code": "optic_ports", "name": "Портов SFP/SFP+", "sort_order": 50},
    {"code": "optic_speed", "name": "Скорость оптических", "sort_order": 60},
    {"code": "combo_ports", "name": "Combo-портов", "sort_order": 70},
]

_SEGMENT_SPLIT = re.compile(r",\s*")
_LAYER_RE = re.compile(r"уровня\s*(\d+)", re.IGNORECASE)
_PORT_COUNT_RE = re.compile(r"(\d+)\s+порт", re.IGNORECASE)
_COMBO_RE = re.compile(r"(\d+)\s+(?:Combo-порт|комбо\s+порт)", re.IGNORECASE)


def _is_copper_segment(segment: str) -> bool:
    seg = segment.lower()
    if "basex" in seg:
        return False
    return "baset" in seg or "base-t" in seg or "rj45" in seg


def _is_optic_segment(segment: str) -> bool:
    seg = segment.lower()
    if "combo" in seg or "qsfp" in seg:
        return False
    return "sfp" in seg


def _copper_speed(text: str) -> str | None:
    if re.search(r"10/100/1000", text, re.IGNORECASE):
        return "10/100/1000"
    if re.search(r"100/1000", text, re.IGNORECASE):
        return "100/1000"
    return None


def _optic_speed(text: str) -> str | None:
    if re.search(r"1\s*/\s*10|1gb\s*/\s*10gb|1/10", text, re.IGNORECASE):
        return "1/10g"
    if re.search(r"10\s*ge\s+sfp\+|10gb(?!\s*/\s*40)|10ge\s+sfp", text, re.IGNORECASE):
        return "10g"
    if re.search(r"1\s*ge\s+sfp|1g\s+sfp", text, re.IGNORECASE):
        return "1g"
    return None


def parse_switch_description(description: str) -> dict[str, str]:
    """Extract normalized switch spec values from a Russian price-list description."""
    text = (description or "").strip()
    if not text:
        return {}

    result: dict[str, str] = {}
    segments = _SEGMENT_SPLIT.split(text)

    layer_match = _LAYER_RE.search(text)
    if layer_match:
        result["switch_layer"] = layer_match.group(1)

    copper_speed = _copper_speed(text)
    if copper_speed:
        result["copper_speed"] = copper_speed

    rj45_total = 0
    optic_total = 0
    for segment in segments:
        port_match = _PORT_COUNT_RE.search(segment)
        if not port_match:
            continue
        count = int(port_match.group(1))
        if _is_copper_segment(segment):
            rj45_total += count
        elif _is_optic_segment(segment):
            optic_total += count

    if rj45_total > 0:
        result["rj45_ports"] = str(rj45_total)
    if optic_total > 0:
        result["optic_ports"] = str(optic_total)

    result["poe_plus"] = "да" if re.search(r"poe\+", text, re.IGNORECASE) else "нет"

    combo_total = sum(int(m.group(1)) for m in _COMBO_RE.finditer(text))
    result["combo_ports"] = str(combo_total)

    optic_speed = _optic_speed(text)
    if optic_speed:
        result["optic_speed"] = optic_speed

    return result
