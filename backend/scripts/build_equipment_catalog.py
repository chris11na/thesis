"""
One-off builder: parse diploma/devices.xlsx -> backend/data/equipment_catalog.json

Run from repo root:
  python backend/scripts/build_equipment_catalog.py
  python backend/scripts/build_equipment_catalog.py --source path/to/devices.xlsx
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from collections import Counter
from datetime import date, datetime
from pathlib import Path
from typing import Any

try:
    import openpyxl
except ImportError as exc:  # pragma: no cover
    raise SystemExit("openpyxl is required: pip install openpyxl") from exc


REPO_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_SOURCE = REPO_ROOT / "diploma" / "devices.xlsx"
DEFAULT_OUTPUT = REPO_ROOT / "backend" / "data" / "equipment_catalog.json"

# Prefix order matters: VPSN before VPS, longer codes before shorter (VNC before VA).
_TYPE_PREFIXES: tuple[tuple[str, str], ...] = (
    ("VPSN", "VPSN"),
    ("VPS", "VPS"),
    ("VNC", "VNC"),
    ("VAP", "VAP"),
    ("VLB", "VLB"),
    ("VFW", "VFW"),
    ("VCM", "VCM"),
    ("VA", "VA"),
    ("VC", "VC"),
    ("VI", "VI"),
    ("VO", "VO"),
    ("VP", "VP"),
)

EQUIPMENT_TYPE_LABELS: dict[str, dict[str, str]] = {
    "VA": {"ru": "Коммутатор доступа", "en": "Access switch"},
    "VC": {"ru": "Коммутатор ядра", "en": "Core switch"},
    "VI": {"ru": "Коммутатор промышленный", "en": "Industrial switch"},
    "VNC": {"ru": "Контроллер Wi-Fi", "en": "Wi-Fi controller"},
    "VAP": {"ru": "Точка доступа Wi-Fi", "en": "Wi-Fi access point"},
    "VO": {"ru": "SFP модули и DAC-кабели", "en": "SFP modules and DAC cables"},
    "VPS": {"ru": "Сервис стандартный", "en": "Standard service"},
    "VPSN": {"ru": "Сервис расширенный", "en": "Extended service"},
    "VLB": {"ru": "Балансировщик приложений", "en": "Application load balancer"},
    "VS": {"ru": "Система управления V-Sense", "en": "V-Sense management system"},
    "VFW": {"ru": "Межсетевой экран", "en": "Firewall"},
    "VSERVER": {"ru": "Сервер", "en": "Server"},
    "VCM": {"ru": "IP-АТС", "en": "IP PBX"},
    "VP": {"ru": "IP-телефон", "en": "IP phone"},
    "OTHER": {"ru": "Прочее", "en": "Other"},
}

# Equipment types that can appear as configurator root lines (not accessories/services).
CONFIGURATOR_ROOT_TYPES: frozenset[str] = frozenset(
    {"VA", "VC", "VI", "VNC", "VAP", "VLB", "VS", "VFW", "VSERVER", "VCM", "VP"}
)

# Parent equipment types eligible for optional VPS/VPSN service attachment.
SERVICE_ELIGIBLE_TYPES: frozenset[str] = frozenset(
    {"VA", "VC", "VI", "VNC", "VAP", "VLB", "VS", "VFW", "VSERVER", "VCM"}
)

_SKIP_SECTION_SUBSTRINGS = (
    "420500",
    "тел.",
    "email:",
    "info@",
)


def detect_type_code(article: str) -> str:
    normalized = article.strip().upper()
    for prefix, code in _TYPE_PREFIXES:
        if normalized.startswith(prefix + "-") or normalized.startswith(prefix):
            return code
    if re.match(r"^VS\d", normalized):
        return "VSERVER"
    if normalized.startswith("VS-"):
        return "VS"
    return "OTHER"


def _is_header_noise(article: str | None, description: str | None) -> bool:
    if article:
        art = article.strip()
        if art in ("Артикул", "Официальный прайс лист"):
            return True
        if art.startswith("Действует"):
            return False
    if description:
        desc = description.strip()
        if desc.startswith("Действует"):
            return False
        if any(part in desc for part in _SKIP_SECTION_SUBSTRINGS):
            return True
        if desc.startswith("ООО ") and "Лаб" in desc:
            return True
    return False


def _json_default(value: Any) -> str:
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    raise TypeError(f"Not JSON serializable: {type(value)!r}")


def parse_price_list_xlsx(source: Path) -> dict[str, Any]:
    if not source.is_file():
        raise FileNotFoundError(f"Source file not found: {source}")

    wb = openpyxl.load_workbook(source, read_only=True, data_only=True)
    ws = wb.active

    sections: list[dict[str, str]] = []
    products: list[dict[str, Any]] = []
    current_section: str | None = None
    price_list_date: str | None = None

    for row in ws.iter_rows(values_only=True):
        article_raw = row[0] if len(row) > 0 else None
        description_raw = row[1] if len(row) > 1 else None

        article = str(article_raw).strip() if article_raw is not None else ""
        description = str(description_raw).strip() if description_raw is not None else ""

        if _is_header_noise(article or None, description or None):
            continue

        if article.startswith("Действует") or description.startswith("Действует"):
            if isinstance(description_raw, datetime):
                price_list_date = description_raw.date().isoformat()
            elif isinstance(article_raw, datetime):
                price_list_date = article_raw.date().isoformat()
            continue

        if article:
            type_code = detect_type_code(article)
            type_meta = EQUIPMENT_TYPE_LABELS.get(type_code, EQUIPMENT_TYPE_LABELS["OTHER"])
            service_tier = None
            if type_code == "VPS":
                service_tier = "standard"
            elif type_code == "VPSN":
                service_tier = "extended"

            base_article = None
            if type_code in ("VPS", "VPSN"):
                base_article = re.sub(r"^VPSN?-?", "", article.strip(), flags=re.IGNORECASE)

            products.append(
                {
                    "article": article,
                    "name": article,
                    "description": description,
                    "type_code": type_code,
                    "type_label_ru": type_meta["ru"],
                    "type_label_en": type_meta["en"],
                    "section_title": current_section,
                    "product_kind": "equipment"
                    if type_code in CONFIGURATOR_ROOT_TYPES
                    else "accessory",
                    "service_tier": service_tier,
                    "service_for_article": base_article if type_code in ("VPS", "VPSN") else None,
                    "configurator_eligible": type_code in CONFIGURATOR_ROOT_TYPES,
                    "service_attachable": type_code in SERVICE_ELIGIBLE_TYPES,
                }
            )
            continue

        if description:
            current_section = description
            sections.append({"title": description})

    wb.close()

    type_counts = Counter(item["type_code"] for item in products)
    return {
        "schema_version": 1,
        "source_file": source.name,
        "generated_from": str(source.relative_to(REPO_ROOT))
        if source.is_relative_to(REPO_ROOT)
        else str(source),
        "price_list_date": price_list_date,
        "equipment_types": {
            code: {
                **labels,
                "configurator_eligible": code in CONFIGURATOR_ROOT_TYPES,
                "service_attachable": code in SERVICE_ELIGIBLE_TYPES,
                "count": type_counts.get(code, 0),
            }
            for code, labels in EQUIPMENT_TYPE_LABELS.items()
            if code != "OTHER" or type_counts.get("OTHER", 0)
        },
        "sections": sections,
        "products": products,
        "stats": {
            "product_count": len(products),
            "section_count": len(sections),
            "by_type_code": dict(sorted(type_counts.items())),
        },
    }


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Build normalized equipment catalog JSON from devices.xlsx")
    parser.add_argument("--source", type=Path, default=DEFAULT_SOURCE, help="Path to devices.xlsx")
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT, help="Output JSON path")
    parser.add_argument("--dry-run", action="store_true", help="Parse only, do not write file")
    args = parser.parse_args(argv)

    catalog = parse_price_list_xlsx(args.source)

    print(f"Parsed {catalog['stats']['product_count']} products in {catalog['stats']['section_count']} sections")
    print("By type:", catalog["stats"]["by_type_code"])

    if args.dry_run:
        return 0

    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(
        json.dumps(catalog, ensure_ascii=False, indent=2, default=_json_default) + "\n",
        encoding="utf-8",
    )
    print(f"Wrote {args.output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
