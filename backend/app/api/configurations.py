from datetime import datetime, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response
from pydantic import BaseModel, Field
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.api.deps import get_current_user_claims, require_roles
from app.core.datetime_utils import format_utc_as_moscow_iso, utc_now_naive
from app.db.session import SessionLocal
from app.models.company import Company
from app.models.configuration import Configuration
from app.models.configuration_item import ConfigurationItem
from app.models.license import License
from app.models.module import Module
from app.models.product import Product
from app.models.user import User
from app.services.config_email import email_handoff_result
from app.services.compatibility_service import (
    is_configuration_compatible,
    is_configuration_compatible_typed,
)
from app.services.config_validation import (
    AddonLineData,
    EquipmentLineData,
    validate_structured_lines,
)
from app.services.specification_export import (
    build_specification_from_configuration,
    specification_to_csv_bytes,
    specification_to_xlsx_bytes,
)

router = APIRouter(prefix="/configurations", tags=["configurations"])


class ConfigurationAddonIn(BaseModel):
    module_id: Optional[int] = None
    license_id: Optional[int] = None
    service_product_id: Optional[int] = Field(default=None, ge=1)
    quantity: int = Field(default=1, ge=1)


class ConfigurationLineIn(BaseModel):
    equipment_product_id: int = Field(ge=1)
    quantity: int = Field(default=1, ge=1)
    target_ap_count: Optional[int] = Field(default=None, ge=1)
    addons: List[ConfigurationAddonIn] = Field(default_factory=list)


class ConfigurationCreateRequest(BaseModel):
    user_id: int
    # Legacy: flat ids (products/modules/licenses), quantity 1 each
    items: Optional[List[int]] = None
    # Structured: root equipment + addons with quantities
    lines: Optional[List[ConfigurationLineIn]] = None
    # Optional project questionnaire for sales handoff.
    project_name: Optional[str] = None
    project_contact_name: Optional[str] = None
    project_contact_email: Optional[str] = None
    project_notes: Optional[str] = None
    # Account email from the client (must match the authenticated user when set).
    submitter_email: Optional[str] = None


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _addon_to_data(a: ConfigurationAddonIn) -> AddonLineData:
    return AddonLineData(
        module_id=a.module_id,
        license_id=a.license_id,
        quantity=a.quantity,
        service_product_id=a.service_product_id,
    )


def _lines_to_data(lines: List[ConfigurationLineIn]) -> List[EquipmentLineData]:
    out: List[EquipmentLineData] = []
    for ln in lines:
        addons: List[AddonLineData] = []
        for a in ln.addons:
            has_m = a.module_id is not None
            has_l = a.license_id is not None
            has_s = a.service_product_id is not None
            if sum((has_m, has_l, has_s)) != 1:
                raise HTTPException(
                    status_code=400,
                    detail="Each addon must have exactly one of module_id, license_id, or service_product_id",
                )
            addons.append(_addon_to_data(a))
        out.append(
            EquipmentLineData(
                equipment_product_id=ln.equipment_product_id,
                target_ap_count=ln.target_ap_count,
                addons=addons,
                quantity=ln.quantity,
            )
        )
    return out


def _build_specification(db: Session, line_data: List[EquipmentLineData]) -> List[dict]:
    rows: List[dict] = []
    for line in line_data:
        p = db.query(Product).filter(Product.id == line.equipment_product_id).first()
        name = p.name if p else f"product#{line.equipment_product_id}"
        rows.append(
            {
                "kind": "equipment",
                "product_id": line.equipment_product_id,
                "name": name,
                "quantity": line.quantity,
                "target_ap_count": line.target_ap_count,
            }
        )
        for ad in line.addons:
            if ad.module_id is not None:
                m = db.query(Module).filter(Module.id == ad.module_id).first()
                rows.append(
                    {
                        "kind": "module",
                        "module_id": ad.module_id,
                        "name": m.name if m else f"module#{ad.module_id}",
                        "parent_product_id": line.equipment_product_id,
                        "quantity": ad.quantity,
                    }
                )
            elif ad.license_id is not None:
                lic = db.query(License).filter(License.id == ad.license_id).first()
                rows.append(
                    {
                        "kind": "license",
                        "license_id": ad.license_id,
                        "name": lic.name if lic else f"license#{ad.license_id}",
                        "parent_product_id": line.equipment_product_id,
                        "quantity": ad.quantity,
                        "units_per_pack": lic.units_per_pack if lic else None,
                    }
                )
            elif ad.service_product_id is not None:
                svc = db.query(Product).filter(Product.id == ad.service_product_id).first()
                rows.append(
                    {
                        "kind": "service",
                        "product_id": ad.service_product_id,
                        "name": svc.name if svc else f"service#{ad.service_product_id}",
                        "parent_product_id": line.equipment_product_id,
                        "quantity": ad.quantity,
                    }
                )
    return rows


def _clean_optional_text(value: Optional[str], max_len: int) -> Optional[str]:
    if value is None:
        return None
    text = str(value).strip()
    if not text:
        return None
    return text[:max_len]


def _normalized_project_payload(
    payload: ConfigurationCreateRequest,
    account_email: str,
) -> dict:
    project_name = _clean_optional_text(payload.project_name, 200)
    project_contact_name = _clean_optional_text(payload.project_contact_name, 200)
    project_contact_email = _clean_optional_text(payload.project_contact_email, 255)
    project_notes = _clean_optional_text(payload.project_notes, 4000)

    account_norm = (account_email or "").strip().lower()
    if "@" not in account_norm:
        raise HTTPException(status_code=500, detail="User account email is missing")

    if payload.submitter_email is not None:
        sub = _clean_optional_text(payload.submitter_email, 255)
        if sub and sub.lower() != account_norm:
            raise HTTPException(
                status_code=400,
                detail="submitter_email must match the authenticated user's email",
            )

    if project_contact_email and "@" not in project_contact_email:
        raise HTTPException(status_code=400, detail="project_contact_email must be a valid email")

    # Persist effective contact email for sales (explicit project contact or account email).
    stored_contact_email = project_contact_email or account_norm

    submitted_to_sales = bool(project_name)
    submitted_at = utc_now_naive() if submitted_to_sales else None

    return {
        "project_name": project_name,
        "project_contact_name": project_contact_name,
        "project_contact_email": stored_contact_email,
        "project_notes": project_notes,
        "submitted_to_sales": submitted_to_sales,
        "submitted_at": submitted_at,
    }


def _email_handoff_for_configuration(
    db: Session,
    config: Configuration,
    user: User,
) -> dict:
    if not config.submitted_to_sales:
        return {"email_sent": False}
    specification = build_specification_from_configuration(db, config.id)
    xlsx_bytes = specification_to_xlsx_bytes(conf=config, specification=specification)
    return email_handoff_result(conf=config, xlsx_bytes=xlsx_bytes, user=user)


@router.post("")
def create_configuration(
    payload: ConfigurationCreateRequest,
    db: Session = Depends(get_db),
    claims: dict = Depends(get_current_user_claims),
):
    if payload.user_id <= 0:
        raise HTTPException(status_code=400, detail="user_id must be a positive integer")

    token_user_id = int(claims.get("sub"))
    token_role_id = claims.get("role_id")
    if token_role_id == 1:
        raise HTTPException(
            status_code=403,
            detail="RBAC: administrators manage the catalog only; configuration creation is for end users",
        )
    if token_user_id != payload.user_id:
        raise HTTPException(
            status_code=403,
            detail="RBAC: cannot create configuration for other users",
        )

    user = db.query(User).filter(User.id == payload.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    has_items = bool(payload.items)
    has_lines = bool(payload.lines)
    if has_items and has_lines:
        raise HTTPException(
            status_code=400,
            detail="Provide either items (legacy) or lines (structured), not both",
        )
    if not has_items and not has_lines:
        raise HTTPException(
            status_code=400,
            detail="items or lines must be non-empty",
        )

    project = _normalized_project_payload(payload, account_email=user.email)

    if has_items:
        return _create_legacy(
            db,
            payload.user_id,
            payload.items or [],
            project=project,
            company_id=user.company_id,
            user=user,
        )

    line_data = _lines_to_data(payload.lines or [])
    ok, reason = validate_structured_lines(db, line_data)
    if not ok:
        raise HTTPException(status_code=400, detail=reason or "Invalid configuration")

    root_product_ids: List[int] = []
    module_ids: List[int] = []
    for line in line_data:
        root_product_ids.append(line.equipment_product_id)
        for addon in line.addons:
            if addon.module_id is not None:
                module_ids.append(addon.module_id)
    is_ok, compat_reason = is_configuration_compatible_typed(
        db, root_product_ids=root_product_ids, module_ids=module_ids
    )
    if not is_ok:
        raise HTTPException(status_code=400, detail=compat_reason or "Incompatible configuration")

    config = Configuration(
        user_id=payload.user_id,
        company_id=user.company_id,
        project_name=project["project_name"],
        project_contact_name=project["project_contact_name"],
        project_contact_email=project["project_contact_email"],
        project_notes=project["project_notes"],
        submitted_to_sales=project["submitted_to_sales"],
        submitted_at=project["submitted_at"],
    )
    db.add(config)
    db.flush()

    for line in line_data:
        db.add(
            ConfigurationItem(
                configuration_id=config.id,
                product_id=line.equipment_product_id,
                module_id=None,
                license_id=None,
                parent_product_id=None,
                quantity=line.quantity,
            )
        )
        for addon in line.addons:
            if addon.module_id is not None:
                db.add(
                    ConfigurationItem(
                        configuration_id=config.id,
                        product_id=None,
                        module_id=addon.module_id,
                        license_id=None,
                        parent_product_id=line.equipment_product_id,
                        quantity=addon.quantity,
                    )
                )
            elif addon.license_id is not None:
                db.add(
                    ConfigurationItem(
                        configuration_id=config.id,
                        product_id=None,
                        module_id=None,
                        license_id=addon.license_id,
                        parent_product_id=line.equipment_product_id,
                        quantity=addon.quantity,
                    )
                )
            elif addon.service_product_id is not None:
                db.add(
                    ConfigurationItem(
                        configuration_id=config.id,
                        product_id=addon.service_product_id,
                        module_id=None,
                        license_id=None,
                        parent_product_id=line.equipment_product_id,
                        quantity=addon.quantity,
                    )
                )

    db.commit()
    db.refresh(config)
    spec = _build_specification(db, line_data)
    email_meta = _email_handoff_for_configuration(db, config, user)

    return {
        "status": "ok",
        "configuration_id": config.id,
        "user_id": payload.user_id,
        "submitted_to_sales": bool(config.submitted_to_sales),
        "submitted_at": format_utc_as_moscow_iso(config.submitted_at),
        **email_meta,
        "project": {
            "project_name": config.project_name,
            "project_contact_name": config.project_contact_name,
            "project_contact_email": config.project_contact_email,
            "project_notes": config.project_notes,
        },
        "lines": [
            {
                "equipment_product_id": ln.equipment_product_id,
                "target_ap_count": ln.target_ap_count,
                "addons": [
                    {
                        "module_id": a.module_id,
                        "license_id": a.license_id,
                        "service_product_id": a.service_product_id,
                        "quantity": a.quantity,
                    }
                    for a in ln.addons
                ],
            }
            for ln in line_data
        ],
        "specification": spec,
    }


def _create_legacy(
    db: Session,
    user_id: int,
    selected_item_ids: List[int],
    project: dict,
    company_id: Optional[int],
    user: User,
) -> dict:
    selected_item_ids = list(dict.fromkeys(selected_item_ids))
    if not selected_item_ids:
        raise HTTPException(status_code=400, detail="items must contain at least one id")

    products = db.query(Product).filter(Product.id.in_(selected_item_ids)).all()
    modules = db.query(Module).filter(Module.id.in_(selected_item_ids)).all()
    licenses = db.query(License).filter(License.id.in_(selected_item_ids)).all()

    product_ids = {p.id for p in products}
    module_ids = {m.id for m in modules}
    license_ids = {l.id for l in licenses}
    known_ids = product_ids | module_ids | license_ids

    unknown = [i for i in selected_item_ids if i not in known_ids]
    if unknown:
        raise HTTPException(status_code=400, detail=f"Unknown item ids: {unknown}")

    is_ok, reason = is_configuration_compatible(db, selected_item_ids=selected_item_ids)
    if not is_ok:
        raise HTTPException(status_code=400, detail=reason or "Incompatible configuration")

    config = Configuration(
        user_id=user_id,
        company_id=company_id,
        project_name=project["project_name"],
        project_contact_name=project["project_contact_name"],
        project_contact_email=project["project_contact_email"],
        project_notes=project["project_notes"],
        submitted_to_sales=project["submitted_to_sales"],
        submitted_at=project["submitted_at"],
    )
    db.add(config)
    db.flush()

    for item_id in selected_item_ids:
        if item_id in product_ids:
            db.add(
                ConfigurationItem(
                    configuration_id=config.id,
                    product_id=item_id,
                    module_id=None,
                    license_id=None,
                    parent_product_id=None,
                    quantity=1,
                )
            )
        elif item_id in module_ids:
            db.add(
                ConfigurationItem(
                    configuration_id=config.id,
                    product_id=None,
                    module_id=item_id,
                    license_id=None,
                    parent_product_id=None,
                    quantity=1,
                )
            )
        elif item_id in license_ids:
            db.add(
                ConfigurationItem(
                    configuration_id=config.id,
                    product_id=None,
                    module_id=None,
                    license_id=item_id,
                    parent_product_id=None,
                    quantity=1,
                )
            )

    db.commit()
    db.refresh(config)
    email_meta = _email_handoff_for_configuration(db, config, user)

    return {
        "status": "ok",
        "configuration_id": config.id,
        "user_id": user_id,
        "items": selected_item_ids,
        "submitted_to_sales": bool(config.submitted_to_sales),
        "submitted_at": format_utc_as_moscow_iso(config.submitted_at),
        **email_meta,
        "project": {
            "project_name": config.project_name,
            "project_contact_name": config.project_contact_name,
            "project_contact_email": config.project_contact_email,
            "project_notes": config.project_notes,
        },
    }


@router.get("/me/recent")
def list_my_recent_configurations(
    limit: int = Query(3, ge=1, le=10),
    db: Session = Depends(get_db),
    claims: dict = Depends(get_current_user_claims),
):
    """
    Last configurations created by the authenticated user (for UI history).
    Admins use the catalog only and do not have this list.
    """
    token_user_id = int(claims.get("sub"))
    token_role_id = claims.get("role_id")
    if token_role_id == 1:
        raise HTTPException(
            status_code=403,
            detail="RBAC: administrators do not have personal configuration history here",
        )

    cap = min(limit, 3)
    rows = (
        db.query(Configuration)
        .filter(Configuration.user_id == token_user_id)
        .order_by(Configuration.created_at.desc())
        .limit(cap)
        .all()
    )

    out: list[dict] = []
    for conf in rows:
        items_count = (
            db.query(ConfigurationItem)
            .filter(ConfigurationItem.configuration_id == conf.id)
            .count()
        )
        out.append(
            {
                "id": conf.id,
                "created_at": format_utc_as_moscow_iso(conf.created_at),
                "project_name": conf.project_name,
                "submitted_to_sales": bool(conf.submitted_to_sales),
                "submitted_at": format_utc_as_moscow_iso(conf.submitted_at),
                "items_count": items_count,
            }
        )
    return out


def _get_configuration_for_export(
    db: Session,
    configuration_id: int,
    claims: dict,
) -> Configuration:
    conf = db.query(Configuration).filter(Configuration.id == configuration_id).first()
    if not conf:
        raise HTTPException(status_code=404, detail="Configuration not found")
    token_user_id = int(claims.get("sub"))
    token_role_id = claims.get("role_id")
    if token_role_id != 1 and conf.user_id != token_user_id:
        raise HTTPException(
            status_code=403,
            detail="RBAC: cannot export another user's configuration",
        )
    return conf


def _export_filename(configuration_id: int, ext: str) -> str:
    return f"configuration-{configuration_id}-spec.{ext}"


@router.get("/{configuration_id}/specification.xlsx")
def export_configuration_specification_xlsx(
    configuration_id: int,
    db: Session = Depends(get_db),
    claims: dict = Depends(get_current_user_claims),
):
    conf = _get_configuration_for_export(db, configuration_id, claims)
    specification = build_specification_from_configuration(db, configuration_id)
    content = specification_to_xlsx_bytes(conf=conf, specification=specification)
    return Response(
        content=content,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": f'attachment; filename="{_export_filename(configuration_id, "xlsx")}"'
        },
    )


@router.get("/{configuration_id}/specification.csv")
def export_configuration_specification_csv(
    configuration_id: int,
    db: Session = Depends(get_db),
    claims: dict = Depends(get_current_user_claims),
):
    conf = _get_configuration_for_export(db, configuration_id, claims)
    specification = build_specification_from_configuration(db, configuration_id)
    content = specification_to_csv_bytes(conf=conf, specification=specification)
    return Response(
        content=content,
        media_type="text/csv; charset=utf-8",
        headers={
            "Content-Disposition": f'attachment; filename="{_export_filename(configuration_id, "csv")}"'
        },
    )


@router.get("/submissions")
def list_sales_submissions(
    company_id: Optional[int] = Query(None, ge=1),
    user_id: Optional[int] = Query(None, ge=1),
    since_days: Optional[int] = Query(
        None,
        ge=1,
        le=365,
        description="Only submissions within the last N days",
    ),
    q: str | None = Query(
        None,
        description="Search by project, user, company, contact, notes, or configuration id",
    ),
    db: Session = Depends(get_db),
    _: dict = Depends(require_roles(1)),
):
    query = (
        db.query(Configuration, User, Company)
        .join(User, User.id == Configuration.user_id)
        .join(Company, Company.id == User.company_id)
        .filter(Configuration.submitted_to_sales == True)  # noqa: E712
    )
    if company_id is not None:
        query = query.filter(Company.id == company_id)
    if user_id is not None:
        query = query.filter(User.id == user_id)
    if since_days is not None:
        cutoff = utc_now_naive() - timedelta(days=since_days)
        query = query.filter(Configuration.submitted_at >= cutoff)

    search = (q or "").strip().lower()
    if search:
        like = f"%{search}%"
        conds = [
            func.lower(func.coalesce(Configuration.project_name, "")).like(like),
            func.lower(func.coalesce(Configuration.project_contact_name, "")).like(like),
            func.lower(func.coalesce(Configuration.project_contact_email, "")).like(like),
            func.lower(func.coalesce(Configuration.project_notes, "")).like(like),
            func.lower(User.name).like(like),
            func.lower(User.email).like(like),
            func.lower(Company.name).like(like),
            func.lower(func.coalesce(Company.domain, "")).like(like),
        ]
        if search.isdigit():
            conds.append(Configuration.id == int(search))
        query = query.filter(or_(*conds))

    rows = (
        query.order_by(Configuration.submitted_at.desc(), Configuration.id.desc()).all()
    )

    out = []
    for conf, user, company in rows:
        items_count = (
            db.query(ConfigurationItem)
            .filter(ConfigurationItem.configuration_id == conf.id)
            .count()
        )
        out.append(
            {
                "configuration_id": conf.id,
                "submitted_at": format_utc_as_moscow_iso(conf.submitted_at),
                "created_at": format_utc_as_moscow_iso(conf.created_at),
                "user": {
                    "id": user.id,
                    "name": user.name,
                    "email": user.email,
                },
                "company": {
                    "id": company.id,
                    "name": company.name,
                    "domain": company.domain,
                },
                "project": {
                    "project_name": conf.project_name,
                    "project_contact_name": conf.project_contact_name,
                    "project_contact_email": conf.project_contact_email,
                    "project_notes": conf.project_notes,
                },
                "items_count": items_count,
            }
        )

    return out


@router.delete("/{configuration_id}")
def delete_configuration(
    configuration_id: int,
    db: Session = Depends(get_db),
    _: dict = Depends(require_roles(1)),
):
    """Admin-only: remove a stored configuration and its line items."""
    conf = db.query(Configuration).filter(Configuration.id == configuration_id).first()
    if not conf:
        raise HTTPException(status_code=404, detail="Configuration not found")

    db.query(ConfigurationItem).filter(
        ConfigurationItem.configuration_id == configuration_id
    ).delete(synchronize_session=False)
    db.delete(conf)
    db.commit()
    return {"ok": True, "deleted_configuration_id": configuration_id}
