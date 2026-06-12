"""Build specification spreadsheets (XLSX / CSV) for sales handoff."""

from __future__ import annotations

import csv
import io
from typing import Any

from openpyxl import Workbook
from openpyxl.styles import Font
from sqlalchemy.orm import Session

from app.models.configuration import Configuration
from app.models.configuration_item import ConfigurationItem
from app.models.license import License
from app.models.module import Module
from app.models.product import Product

_KIND_LABELS = {
    "equipment": "Equipment",
    "module": "Module",
    "license": "License pack",
    "service": "Service",
}


def build_specification_from_configuration(db: Session, configuration_id: int) -> list[dict]:
    """Rebuild specification rows from persisted configuration items."""
    items = (
        db.query(ConfigurationItem)
        .filter(ConfigurationItem.configuration_id == configuration_id)
        .order_by(ConfigurationItem.id)
        .all()
    )
    rows: list[dict] = []
    for it in items:
        if it.product_id is not None and it.parent_product_id is None:
            p = db.query(Product).filter(Product.id == it.product_id).first()
            rows.append(
                {
                    "kind": "equipment",
                    "product_id": it.product_id,
                    "name": p.name if p else f"product#{it.product_id}",
                    "quantity": it.quantity,
                    "target_ap_count": None,
                }
            )
        elif it.module_id is not None:
            m = db.query(Module).filter(Module.id == it.module_id).first()
            rows.append(
                {
                    "kind": "module",
                    "module_id": it.module_id,
                    "name": m.name if m else f"module#{it.module_id}",
                    "parent_product_id": it.parent_product_id,
                    "quantity": it.quantity,
                }
            )
        elif it.license_id is not None:
            lic = db.query(License).filter(License.id == it.license_id).first()
            rows.append(
                {
                    "kind": "license",
                    "license_id": it.license_id,
                    "name": lic.name if lic else f"license#{it.license_id}",
                    "parent_product_id": it.parent_product_id,
                    "quantity": it.quantity,
                    "units_per_pack": lic.units_per_pack if lic else None,
                }
            )
        elif it.product_id is not None and it.parent_product_id is not None:
            p = db.query(Product).filter(Product.id == it.product_id).first()
            rows.append(
                {
                    "kind": "service",
                    "product_id": it.product_id,
                    "name": p.name if p else f"service#{it.product_id}",
                    "parent_product_id": it.parent_product_id,
                    "quantity": it.quantity,
                }
            )


def _project_meta(conf: Configuration) -> list[tuple[str, str]]:
    return [
        ("Configuration ID", str(conf.id)),
        ("Project", conf.project_name or ""),
        ("Contact", conf.project_contact_name or ""),
        ("Contact email", conf.project_contact_email or ""),
        ("Notes", conf.project_notes or ""),
        (
            "Submitted at",
            conf.submitted_at.isoformat() if conf.submitted_at else "",
        ),
    ]


def _spec_table_header() -> list[str]:
    return [
        "Type",
        "Name",
        "Quantity",
        "Parent equipment ID",
        "Target AP",
        "Units per pack",
        "Product ID",
        "Module ID",
        "License ID",
    ]


def _spec_row_cells(row: dict) -> list[Any]:
    kind = str(row.get("kind") or "")
    return [
        _KIND_LABELS.get(kind, kind),
        row.get("name") or "",
        row.get("quantity") if row.get("quantity") is not None else "",
        row.get("parent_product_id") if row.get("parent_product_id") is not None else "",
        row.get("target_ap_count") if row.get("target_ap_count") is not None else "",
        row.get("units_per_pack") if row.get("units_per_pack") is not None else "",
        row.get("product_id") if row.get("product_id") is not None else "",
        row.get("module_id") if row.get("module_id") is not None else "",
        row.get("license_id") if row.get("license_id") is not None else "",
    ]


def specification_to_xlsx_bytes(
    *,
    conf: Configuration,
    specification: list[dict],
) -> bytes:
    wb = Workbook()
    ws = wb.active
    ws.title = "Specification"
    bold = Font(bold=True)

    ws["A1"] = "Configuration specification"
    ws["A1"].font = bold
    r = 3
    for label, value in _project_meta(conf):
        ws.cell(row=r, column=1, value=label).font = bold
        ws.cell(row=r, column=2, value=value)
        r += 1

    r += 1
    header_row = r
    for col, title in enumerate(_spec_table_header(), start=1):
        cell = ws.cell(row=header_row, column=col, value=title)
        cell.font = bold
    r += 1
    for spec_row in specification:
        for col, value in enumerate(_spec_row_cells(spec_row), start=1):
            ws.cell(row=r, column=col, value=value)
        r += 1

    for col in range(1, len(_spec_table_header()) + 1):
        letter = ws.cell(row=1, column=col).column_letter
        ws.column_dimensions[letter].width = 18

    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()


def specification_to_csv_bytes(
    *,
    conf: Configuration,
    specification: list[dict],
) -> bytes:
    buf = io.StringIO()
    writer = csv.writer(buf, lineterminator="\n")
    for label, value in _project_meta(conf):
        writer.writerow([label, value])
    writer.writerow([])
    writer.writerow(_spec_table_header())
    for spec_row in specification:
        writer.writerow(_spec_row_cells(spec_row))
    return buf.getvalue().encode("utf-8-sig")
