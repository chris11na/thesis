import json

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.api.deps import require_roles
from app.db.session import SessionLocal
from app.models.compatibility_rule import CompatibilityRule
from app.models.configuration_item import ConfigurationItem
from app.models.license import License
from app.models.module import Module
from app.models.product import Product
from app.models.product_spec_value import ProductSpecValue
from app.models.spec_parameter import SpecParameter
from app.models.product_incompatible_pair import ProductIncompatiblePair
from app.models.equipment_subgroup import EquipmentSubgroup
from app.models.equipment_group import EquipmentGroup
from app.services.config_validation import suggest_license_packs
from app.services.service_catalog import (
    find_accessory_products_for_equipment,
    suggested_accessory_quantity,
    find_service_products_for_equipment,
    is_service_attachable,
    parse_catalog_meta,
    parse_support_duration,
)
from app.services.product_rules_runtime import (
    effective_built_in_license_units,
    effective_max_module_slots,
    effective_speed_allowlist,
)


router = APIRouter(prefix="/products", tags=["products"])


def _parse_rules_json_field(raw: str | None) -> str | None:
    """Strip; empty -> None; else must be valid JSON (object or array)."""
    if raw is None:
        return None
    s = str(raw).strip()
    if not s:
        return None
    try:
        json.loads(s)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="rules_json must be valid JSON")
    return s


class ModuleCreate(BaseModel):
    name: str
    speed_gbps: int | None = None
    form_factor: str | None = None
    max_quantity: int | None = None


class ModuleUpdate(BaseModel):
    name: str | None = None
    speed_gbps: int | None = None
    form_factor: str | None = None
    max_quantity: int | None = None


class LicenseCreate(BaseModel):
    name: str
    units_per_pack: int = 1


class LicenseUpdate(BaseModel):
    name: str | None = None
    units_per_pack: int | None = None


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


class ProductCreate(BaseModel):
    name: str
    description: str = ""
    technical_specs: str = ""
    product_kind: str = "equipment"
    product_category: str | None = None
    built_in_license_units: int | None = None
    module_speeds_json: str | None = None
    max_module_slots: int | None = None
    rules_json: str | None = None
    technical_spec_values: list[dict] | None = None
    subgroup_id: int | None = None


class ProductUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    technical_specs: str | None = None
    product_kind: str | None = None
    product_category: str | None = None
    built_in_license_units: int | None = None
    module_speeds_json: str | None = None
    max_module_slots: int | None = None
    rules_json: str | None = None
    technical_spec_values: list[dict] | None = None
    subgroup_id: int | None = None


class SpecParameterCreate(BaseModel):
    code: str
    name: str
    sort_order: int = 0
    is_active: bool = True


class SpecParameterUpdate(BaseModel):
    code: str | None = None
    name: str | None = None
    sort_order: int | None = None
    is_active: bool | None = None


def _normalize_spec_values_payload(values: list[dict] | None) -> list[dict]:
    if values is None:
        return []
    out: list[dict] = []
    seen_param_ids: set[int] = set()
    for row in values:
        if not isinstance(row, dict):
            raise HTTPException(
                status_code=400, detail="technical_spec_values rows must be objects"
            )
        pid_raw = row.get("parameter_id")
        val_raw = row.get("value")
        if pid_raw is None:
            raise HTTPException(status_code=400, detail="parameter_id is required")
        try:
            pid = int(pid_raw)
        except Exception:
            raise HTTPException(status_code=400, detail="parameter_id must be integer")
        if pid in seen_param_ids:
            raise HTTPException(
                status_code=400, detail="parameter_id must be unique per product"
            )
        seen_param_ids.add(pid)
        val = "" if val_raw is None else str(val_raw).strip()
        if not val:
            continue
        out.append({"parameter_id": pid, "value": val, "value_search": val.lower()[:512]})
    return out


def _load_product_spec_values(db: Session, product_ids: list[int]) -> dict[int, list[dict]]:
    out: dict[int, list[dict]] = {pid: [] for pid in product_ids}
    if not product_ids:
        return out
    rows = (
        db.query(ProductSpecValue, SpecParameter)
        .join(SpecParameter, SpecParameter.id == ProductSpecValue.parameter_id)
        .filter(ProductSpecValue.product_id.in_(product_ids))
        .order_by(SpecParameter.sort_order, SpecParameter.id, ProductSpecValue.id)
        .all()
    )
    for spec_val, param in rows:
        out.setdefault(spec_val.product_id, []).append(
            {
                "parameter_id": param.id,
                "parameter_code": param.code,
                "parameter_name": param.name,
                "value": spec_val.value,
            }
        )
    return out


def _set_product_spec_values(db: Session, product_id: int, values: list[dict]) -> None:
    db.query(ProductSpecValue).filter(ProductSpecValue.product_id == product_id).delete(
        synchronize_session=False
    )
    if not values:
        return
    allowed_ids = {
        pid
        for (pid,) in db.query(SpecParameter.id)
        .filter(SpecParameter.id.in_([x["parameter_id"] for x in values]))
        .all()
    }
    for row in values:
        if row["parameter_id"] not in allowed_ids:
            raise HTTPException(
                status_code=400,
                detail=f"Spec parameter id={row['parameter_id']} does not exist",
            )
        db.add(
            ProductSpecValue(
                product_id=product_id,
                parameter_id=row["parameter_id"],
                value=row["value"],
                value_search=row["value_search"],
            )
        )


def _validate_subgroup_id(db: Session, subgroup_id: int | None) -> None:
    if subgroup_id is None:
        return
    exists = db.query(EquipmentSubgroup.id).filter(EquipmentSubgroup.id == subgroup_id).first()
    if not exists:
        raise HTTPException(status_code=400, detail="subgroup_id does not exist")


def _load_subgroup_brief(db: Session, subgroup_ids: list[int]) -> dict[int, dict]:
    out: dict[int, dict] = {}
    if not subgroup_ids:
        return out
    rows = (
        db.query(EquipmentSubgroup, EquipmentGroup)
        .join(EquipmentGroup, EquipmentGroup.id == EquipmentSubgroup.group_id)
        .filter(EquipmentSubgroup.id.in_(subgroup_ids))
        .all()
    )
    for sub, group in rows:
        out[sub.id] = {
            "subgroup_id": sub.id,
            "subgroup_code": sub.code,
            "subgroup_name": sub.name,
            "group_id": group.id,
            "group_code": group.code,
            "group_name": group.name,
        }
    return out


@router.get("/spec-parameters")
def list_spec_parameters(
    include_inactive: bool = Query(False),
    db: Session = Depends(get_db),
):
    q = db.query(SpecParameter)
    if not include_inactive:
        q = q.filter(SpecParameter.is_active == True)  # noqa: E712
    rows = q.order_by(SpecParameter.sort_order, SpecParameter.id).all()
    return [
        {
            "id": x.id,
            "code": x.code,
            "name": x.name,
            "sort_order": x.sort_order,
            "is_active": x.is_active,
        }
        for x in rows
    ]


@router.post("/spec-parameters")
def create_spec_parameter(
    payload: SpecParameterCreate,
    db: Session = Depends(get_db),
    _: dict = Depends(require_roles(1)),
):
    code = (payload.code or "").strip().lower()
    name = (payload.name or "").strip()
    if not code:
        raise HTTPException(status_code=400, detail="code is required")
    if not name:
        raise HTTPException(status_code=400, detail="name is required")
    exists = db.query(SpecParameter).filter(SpecParameter.code == code).first()
    if exists:
        raise HTTPException(status_code=409, detail="Spec parameter code already exists")
    row = SpecParameter(
        code=code,
        name=name,
        sort_order=payload.sort_order,
        is_active=payload.is_active,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return {
        "id": row.id,
        "code": row.code,
        "name": row.name,
        "sort_order": row.sort_order,
        "is_active": row.is_active,
    }


@router.patch("/spec-parameters/{parameter_id}")
def update_spec_parameter(
    parameter_id: int,
    payload: SpecParameterUpdate,
    db: Session = Depends(get_db),
    _: dict = Depends(require_roles(1)),
):
    row = db.query(SpecParameter).filter(SpecParameter.id == parameter_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Spec parameter not found")
    data = payload.model_dump(exclude_unset=True)
    if "code" in data and data["code"] is not None:
        code = str(data["code"]).strip().lower()
        if not code:
            raise HTTPException(status_code=400, detail="code cannot be empty")
        exists = (
            db.query(SpecParameter)
            .filter(SpecParameter.code == code, SpecParameter.id != parameter_id)
            .first()
        )
        if exists:
            raise HTTPException(status_code=409, detail="Spec parameter code already exists")
        row.code = code
    if "name" in data and data["name"] is not None:
        name = str(data["name"]).strip()
        if not name:
            raise HTTPException(status_code=400, detail="name cannot be empty")
        row.name = name
    if "sort_order" in data and data["sort_order"] is not None:
        row.sort_order = int(data["sort_order"])
    if "is_active" in data and data["is_active"] is not None:
        row.is_active = bool(data["is_active"])
    db.commit()
    db.refresh(row)
    return {
        "id": row.id,
        "code": row.code,
        "name": row.name,
        "sort_order": row.sort_order,
        "is_active": row.is_active,
    }


@router.delete("/spec-parameters/{parameter_id}")
def delete_spec_parameter(
    parameter_id: int,
    db: Session = Depends(get_db),
    _: dict = Depends(require_roles(1)),
):
    row = db.query(SpecParameter).filter(SpecParameter.id == parameter_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Spec parameter not found")
    used = (
        db.query(ProductSpecValue.id)
        .filter(ProductSpecValue.parameter_id == parameter_id)
        .first()
    )
    if used:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete spec parameter that is used in products",
        )
    db.delete(row)
    db.commit()
    return {"status": "ok"}


def _apply_exact_spec_filter(query, db: Session, code: str, value: str):
    normalized = (value or "").strip().lower()
    if not normalized:
        return query
    matching_ids = (
        db.query(ProductSpecValue.product_id)
        .join(SpecParameter, SpecParameter.id == ProductSpecValue.parameter_id)
        .filter(SpecParameter.code == code)
        .filter(ProductSpecValue.value_search == normalized)
    )
    return query.filter(Product.id.in_(matching_ids))


@router.get("")
def list_products(
    q: str | None = Query(None, description="Search by name, description, specs"),
    product_kind: str | None = Query(None),
    product_category: str | None = Query(None, description="Equipment type code, e.g. VA"),
    subgroup_id: int | None = Query(None, ge=1),
    group_id: int | None = Query(None, ge=1),
    spec_parameter_code: str | None = Query(None),
    spec_value: str | None = Query(None),
    switch_layer: str | None = Query(None),
    rj45_ports: str | None = Query(None),
    copper_speed: str | None = Query(None),
    poe_plus: str | None = Query(None),
    optic_ports: str | None = Query(None),
    optic_speed: str | None = Query(None),
    combo_ports: str | None = Query(None),
    vo_item_type: str | None = Query(None, description="VO accessory type: cable or module"),
    vlb_device_type: str | None = Query(None),
    vs_item_type: str | None = Query(None),
    vfw_item_type: str | None = Query(None),
    telephony_item_type: str | None = Query(None),
    wifi_device_type: str | None = Query(None),
    wifi_accessory_kind: str | None = Query(None),
    support_tier: str | None = Query(None),
    configurator_only: bool = Query(False),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=500),
    db: Session = Depends(get_db),
):
    query = db.query(Product)

    kind = (product_kind or "").strip().lower()
    if kind:
        query = query.filter(func.lower(Product.product_kind) == kind)

    category = (product_category or "").strip().upper()
    if category:
        query = query.filter(func.upper(Product.product_category) == category)

    if subgroup_id is not None:
        query = query.filter(Product.subgroup_id == subgroup_id)

    if group_id is not None:
        query = query.join(
            EquipmentSubgroup, EquipmentSubgroup.id == Product.subgroup_id
        ).filter(EquipmentSubgroup.group_id == group_id)

    if configurator_only:
        query = query.filter(func.lower(Product.product_kind) == "equipment")

    code = (spec_parameter_code or "").strip().lower()
    value = (spec_value or "").strip().lower()
    if code and value:
        query = query.join(ProductSpecValue, ProductSpecValue.product_id == Product.id).join(
            SpecParameter, SpecParameter.id == ProductSpecValue.parameter_id
        )
        query = query.filter(
            SpecParameter.code == code,
            ProductSpecValue.value_search.contains(value),
        )

    switch_filters = {
        "switch_layer": switch_layer,
        "rj45_ports": rj45_ports,
        "copper_speed": copper_speed,
        "poe_plus": poe_plus,
        "optic_ports": optic_ports,
        "optic_speed": optic_speed,
        "combo_ports": combo_ports,
    }
    for spec_code, spec_val in switch_filters.items():
        if (spec_val or "").strip():
            query = _apply_exact_spec_filter(query, db, spec_code, spec_val)

    if (vo_item_type or "").strip():
        query = _apply_exact_spec_filter(query, db, "vo_item_type", vo_item_type)

    wifi_filters = {
        "wifi_device_type": wifi_device_type,
        "wifi_accessory_kind": wifi_accessory_kind,
        "support_tier": support_tier,
    }
    for spec_code, spec_val in wifi_filters.items():
        if (spec_val or "").strip():
            query = _apply_exact_spec_filter(query, db, spec_code, spec_val)

    if (vlb_device_type or "").strip():
        query = _apply_exact_spec_filter(query, db, "vlb_device_type", vlb_device_type)

    if (vs_item_type or "").strip():
        query = _apply_exact_spec_filter(query, db, "vs_item_type", vs_item_type)

    if (vfw_item_type or "").strip():
        query = _apply_exact_spec_filter(query, db, "vfw_item_type", vfw_item_type)

    if (telephony_item_type or "").strip():
        query = _apply_exact_spec_filter(query, db, "telephony_item_type", telephony_item_type)

    search = (q or "").strip().lower()
    if search:
        like = f"%{search}%"
        search_filters = [
            func.lower(Product.name).like(like),
            func.lower(Product.description).like(like),
            func.lower(Product.technical_specs).like(like),
            func.lower(func.coalesce(Product.product_category, "")).like(like),
        ]
        if search.isdigit():
            search_filters.append(Product.id == int(search))
        query = query.filter(or_(*search_filters))

    if code and value:
        query = query.distinct()

    total = query.count()
    rows = (
        query.order_by(Product.name, Product.id)
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    specs_by_product = _load_product_spec_values(db, [p.id for p in rows])
    subgroup_brief = _load_subgroup_brief(
        db, [p.subgroup_id for p in rows if p.subgroup_id is not None]
    )
    items = []
    for p in rows:
        row = {
            "id": p.id,
            "name": p.name,
            "description": p.description,
            "technical_specs": p.technical_specs,
            "product_kind": getattr(p, "product_kind", None) or "equipment",
            "product_category": getattr(p, "product_category", None),
            "subgroup_id": getattr(p, "subgroup_id", None),
            "built_in_license_units": getattr(p, "built_in_license_units", None),
            "module_speeds_json": getattr(p, "module_speeds_json", None),
            "max_module_slots": getattr(p, "max_module_slots", None),
            "rules_json": getattr(p, "rules_json", None),
            "technical_spec_values": specs_by_product.get(p.id, []),
            "service_attachable": is_service_attachable(p),
        }
        mod_n = db.query(Module).filter(Module.product_id == p.id).count()
        lic_n = db.query(License).filter(License.product_id == p.id).count()
        row["addon_options_count"] = mod_n + lic_n
        if p.subgroup_id and p.subgroup_id in subgroup_brief:
            row.update(subgroup_brief[p.subgroup_id])
        items.append(row)

    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "pages": max(1, (total + page_size - 1) // page_size) if total else 1,
    }


@router.get("/equipment-types")
def list_equipment_types(db: Session = Depends(get_db)):
    rows = (
        db.query(Product.product_category, func.count(Product.id))
        .filter(Product.product_category.isnot(None))
        .group_by(Product.product_category)
        .order_by(Product.product_category)
        .all()
    )
    labels = {
        "VA": "Коммутатор доступа",
        "VC": "Коммутатор ядра",
        "VI": "Коммутатор промышленный",
        "VNC": "Контроллер Wi-Fi",
        "VAP": "Точка доступа Wi-Fi",
        "VO": "SFP модули и DAC-кабели",
        "VPS": "Сервис стандартный",
        "VPSN": "Сервис расширенный",
        "VLB": "Балансировщик приложений",
        "VS": "Система управления V-Sense",
        "VFW": "Межсетевой экран",
        "VSERVER": "Сервер",
        "VCM": "IP-АТС",
        "VP": "IP-телефон",
    }
    return [
        {
            "code": code,
            "label_ru": labels.get(code, code),
            "count": count,
        }
        for code, count in rows
        if code
    ]


@router.get("/{product_id}/service-options")
def get_service_options(product_id: int, db: Session = Depends(get_db)):
    p = db.query(Product).filter(Product.id == product_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Product not found")
    attachable = is_service_attachable(p)
    services = find_service_products_for_equipment(db, p) if attachable else {
        "standard": None,
        "extended": None,
    }

    def _svc_row(prod: Product | None) -> dict | None:
        if prod is None:
            return None
        return {
            "product_id": prod.id,
            "article": prod.name,
            "description": prod.description,
            "support_duration": parse_support_duration(prod.description),
            "service_tier": parse_catalog_meta(prod).get("service_tier")
            if parse_catalog_meta(prod)
            else None,
        }

    return {
        "product_id": p.id,
        "attachable": attachable,
        "default_tier": "standard" if services.get("standard") else "none",
        "standard": _svc_row(services.get("standard")),
        "extended": _svc_row(services.get("extended")),
    }


@router.get("/{product_id}/compatible-addons")
def get_compatible_addons(product_id: int, db: Session = Depends(get_db)):
    """Bundled compatible options for equipment picker UI."""
    opts = get_configuration_options(product_id, db)
    svc = get_service_options(product_id, db)
    p = db.query(Product).filter(Product.id == product_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Product not found")
    accessories = find_accessory_products_for_equipment(db, p)
    return {
        **opts,
        "support": svc,
        "accessories": [
            {
                "product_id": row.id,
                "name": row.name,
                "description": row.description,
                "product_category": row.product_category,
                "suggested_quantity": suggested_accessory_quantity(p, row),
            }
            for row in accessories
        ],
    }


@router.get("/{product_id}/configuration-options")
def get_configuration_options(product_id: int, db: Session = Depends(get_db)):
    p = db.query(Product).filter(Product.id == product_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Product not found")

    allow, allow_src = effective_speed_allowlist(p)
    max_slots_eff, max_src = effective_max_module_slots(p)
    built_eff, built_src = effective_built_in_license_units(p)
    modules_q = db.query(Module).filter(Module.product_id == product_id)
    modules = modules_q.order_by(Module.id).all()
    filtered = []
    for m in modules:
        if allow is None:
            filtered.append(m)
            continue
        if m.speed_gbps is None or m.speed_gbps in allow:
            filtered.append(m)

    licenses = (
        db.query(License).filter(License.product_id == product_id).order_by(License.id).all()
    )

    return {
        "product_id": p.id,
        "name": p.name,
        "product_kind": getattr(p, "product_kind", None) or "equipment",
        "built_in_license_units": built_eff,
        "max_module_slots": max_slots_eff,
        "rules_json": getattr(p, "rules_json", None),
        "technical_spec_values": _load_product_spec_values(db, [p.id]).get(p.id, []),
        "service_attachable": is_service_attachable(p),
        "module_speeds_supported": allow,
        "rules_runtime_sources": {
            "speed_allowlist": allow_src,
            "max_module_slots": max_src,
            "built_in_license_units": built_src,
        },
        "modules": [
            {
                "id": m.id,
                "name": m.name,
                "speed_gbps": m.speed_gbps,
                "form_factor": m.form_factor,
                "max_quantity": m.max_quantity,
            }
            for m in filtered
        ],
        "licenses": [
            {
                "id": lic.id,
                "name": lic.name,
                "units_per_pack": getattr(lic, "units_per_pack", 1),
            }
            for lic in licenses
        ],
    }


def _module_to_dict(m: Module) -> dict:
    return {
        "id": m.id,
        "name": m.name,
        "product_id": m.product_id,
        "speed_gbps": m.speed_gbps,
        "form_factor": m.form_factor,
        "max_quantity": m.max_quantity,
    }


def _license_to_dict(lic: License) -> dict:
    return {
        "id": lic.id,
        "name": lic.name,
        "product_id": lic.product_id,
        "units_per_pack": getattr(lic, "units_per_pack", 1),
    }


@router.get("/{product_id}/catalog-editor")
def get_product_catalog_editor(
    product_id: int,
    db: Session = Depends(get_db),
    _: dict = Depends(require_roles(1)),
):
    """
    Full module/license list for this product (no speed filter). Admin UI only.
    """
    p = db.query(Product).filter(Product.id == product_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Product not found")
    modules = (
        db.query(Module).filter(Module.product_id == product_id).order_by(Module.id).all()
    )
    licenses = (
        db.query(License).filter(License.product_id == product_id).order_by(License.id).all()
    )
    return {
        "product_id": product_id,
        "rules_json": getattr(p, "rules_json", None),
        "modules": [_module_to_dict(m) for m in modules],
        "licenses": [_license_to_dict(lic) for lic in licenses],
    }


@router.post("/{product_id}/modules")
def create_product_module(
    product_id: int,
    payload: ModuleCreate,
    db: Session = Depends(get_db),
    _: dict = Depends(require_roles(1)),
):
    p = db.query(Product).filter(Product.id == product_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Product not found")
    name = (payload.name or "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="Module name is required")
    ff = payload.form_factor
    if ff is not None and isinstance(ff, str):
        ff = ff.strip() or None
    mq = payload.max_quantity
    if mq is not None and mq < 0:
        raise HTTPException(status_code=400, detail="max_quantity must be >= 0")
    sg = payload.speed_gbps
    if sg is not None and sg < 0:
        raise HTTPException(status_code=400, detail="speed_gbps must be >= 0")
    row = Module(
        name=name,
        product_id=product_id,
        speed_gbps=sg,
        form_factor=ff,
        max_quantity=mq,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return _module_to_dict(row)


@router.post("/{product_id}/licenses")
def create_product_license(
    product_id: int,
    payload: LicenseCreate,
    db: Session = Depends(get_db),
    _: dict = Depends(require_roles(1)),
):
    p = db.query(Product).filter(Product.id == product_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Product not found")
    name = (payload.name or "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="License name is required")
    upp = payload.units_per_pack
    if upp < 1:
        raise HTTPException(status_code=400, detail="units_per_pack must be >= 1")
    row = License(name=name, product_id=product_id, units_per_pack=upp)
    db.add(row)
    db.commit()
    db.refresh(row)
    return _license_to_dict(row)


@router.get("/{product_id}/license-pack-suggestion")
def get_license_pack_suggestion(
    product_id: int,
    target_ap_count: int = Query(..., ge=1),
    db: Session = Depends(get_db),
):
    data, err = suggest_license_packs(db, product_id, target_ap_count)
    if err:
        raise HTTPException(status_code=400, detail=err)
    return data


@router.post("")
def create_product(
    payload: ProductCreate,
    db: Session = Depends(get_db),
    _: dict = Depends(require_roles(1)),
):
    pk = (payload.product_kind or "equipment").strip()
    if pk != "equipment":
        raise HTTPException(
            status_code=400,
            detail="product_kind must be 'equipment'",
        )
    msj = payload.module_speeds_json
    if msj is not None and isinstance(msj, str) and not msj.strip():
        msj = None
    elif isinstance(msj, str):
        msj = msj.strip()

    cat = payload.product_category
    if cat is not None and isinstance(cat, str):
        cat = cat.strip() or None

    rj = _parse_rules_json_field(payload.rules_json)
    _validate_subgroup_id(db, payload.subgroup_id)

    row = Product(
        name=payload.name.strip(),
        description=(payload.description or "").strip(),
        technical_specs=(payload.technical_specs or "").strip() or "—",
        product_kind=pk,
        product_category=cat,
        built_in_license_units=payload.built_in_license_units,
        module_speeds_json=msj,
        max_module_slots=payload.max_module_slots,
        rules_json=rj,
        subgroup_id=payload.subgroup_id,
    )
    db.add(row)
    db.flush()
    _set_product_spec_values(
        db,
        row.id,
        _normalize_spec_values_payload(payload.technical_spec_values),
    )
    db.commit()
    db.refresh(row)
    spec_values = _load_product_spec_values(db, [row.id]).get(row.id, [])
    return {
        "id": row.id,
        "name": row.name,
        "description": row.description,
        "technical_specs": row.technical_specs,
        "product_kind": getattr(row, "product_kind", None) or "equipment",
        "product_category": getattr(row, "product_category", None),
        "built_in_license_units": getattr(row, "built_in_license_units", None),
        "module_speeds_json": getattr(row, "module_speeds_json", None),
        "max_module_slots": getattr(row, "max_module_slots", None),
        "rules_json": getattr(row, "rules_json", None),
        "technical_spec_values": spec_values,
    }


@router.patch("/{product_id}")
def update_product(
    product_id: int,
    payload: ProductUpdate,
    db: Session = Depends(get_db),
    _: dict = Depends(require_roles(1)),
):
    row = db.query(Product).filter(Product.id == product_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Product not found")

    data = payload.model_dump(exclude_unset=True)

    if "name" in data and data["name"] is not None:
        row.name = str(data["name"]).strip()
    if "description" in data and data["description"] is not None:
        row.description = str(data["description"]).strip()
    if "technical_specs" in data and data["technical_specs"] is not None:
        row.technical_specs = str(data["technical_specs"]).strip() or "—"

    if "product_kind" in data:
        pk = data["product_kind"]
        if pk is not None:
            if pk != "equipment":
                raise HTTPException(
                    status_code=400,
                    detail="product_kind must be 'equipment'",
                )
            row.product_kind = pk

    if "built_in_license_units" in data:
        row.built_in_license_units = data["built_in_license_units"]

    if "module_speeds_json" in data:
        raw = data["module_speeds_json"]
        if raw is None or (isinstance(raw, str) and not raw.strip()):
            row.module_speeds_json = None
        else:
            row.module_speeds_json = str(raw).strip()

    if "max_module_slots" in data:
        row.max_module_slots = data["max_module_slots"]

    if "product_category" in data:
        rawc = data["product_category"]
        if rawc is None:
            row.product_category = None
        else:
            s = str(rawc).strip()
            row.product_category = s or None

    if "rules_json" in data:
        row.rules_json = _parse_rules_json_field(data["rules_json"])
    if "subgroup_id" in data:
        _validate_subgroup_id(db, data["subgroup_id"])
        row.subgroup_id = data["subgroup_id"]
    if "technical_spec_values" in data:
        _set_product_spec_values(
            db,
            row.id,
            _normalize_spec_values_payload(data["technical_spec_values"]),
        )

    db.commit()
    db.refresh(row)
    spec_values = _load_product_spec_values(db, [row.id]).get(row.id, [])
    return {
        "id": row.id,
        "name": row.name,
        "description": row.description,
        "technical_specs": row.technical_specs,
        "product_kind": getattr(row, "product_kind", None) or "equipment",
        "product_category": getattr(row, "product_category", None),
        "built_in_license_units": getattr(row, "built_in_license_units", None),
        "module_speeds_json": getattr(row, "module_speeds_json", None),
        "max_module_slots": getattr(row, "max_module_slots", None),
        "rules_json": getattr(row, "rules_json", None),
        "technical_spec_values": spec_values,
    }


def _admin_delete_product_cascade(db: Session, product_id: int) -> None:
    """
    Remove product and dependent catalog rows; drop configuration line items that
    reference this product, its modules, or its licenses (user configs may lose lines).
    """
    module_ids = [
        mid
        for (mid,) in db.query(Module.id).filter(Module.product_id == product_id).all()
    ]
    license_ids = [
        lid
        for (lid,) in db.query(License.id).filter(License.product_id == product_id).all()
    ]

    conds = [
        ConfigurationItem.product_id == product_id,
        ConfigurationItem.parent_product_id == product_id,
    ]
    if module_ids:
        conds.append(ConfigurationItem.module_id.in_(module_ids))
    if license_ids:
        conds.append(ConfigurationItem.license_id.in_(license_ids))
    db.query(ConfigurationItem).filter(or_(*conds)).delete(synchronize_session=False)

    if module_ids:
        db.query(CompatibilityRule).filter(
            CompatibilityRule.module_id.in_(module_ids)
        ).delete(synchronize_session=False)
    db.query(CompatibilityRule).filter(CompatibilityRule.product_id == product_id).delete(
        synchronize_session=False
    )
    db.query(ProductIncompatiblePair).filter(
        or_(
            ProductIncompatiblePair.product_smaller_id == product_id,
            ProductIncompatiblePair.product_larger_id == product_id,
        )
    ).delete(synchronize_session=False)
    db.query(Module).filter(Module.product_id == product_id).delete(
        synchronize_session=False
    )
    db.query(License).filter(License.product_id == product_id).delete(
        synchronize_session=False
    )
    db.query(ProductSpecValue).filter(ProductSpecValue.product_id == product_id).delete(
        synchronize_session=False
    )
    db.query(Product).filter(Product.id == product_id).delete(synchronize_session=False)


@router.delete("/{product_id}")
def delete_product(
    product_id: int,
    db: Session = Depends(get_db),
    _: dict = Depends(require_roles(1)),
):
    row = db.query(Product).filter(Product.id == product_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Product not found")
    _admin_delete_product_cascade(db, product_id)
    db.commit()
    return {"status": "ok", "cascade": True}


def _admin_delete_module(db: Session, module_id: int) -> None:
    db.query(ConfigurationItem).filter(ConfigurationItem.module_id == module_id).delete(
        synchronize_session=False
    )
    db.query(CompatibilityRule).filter(CompatibilityRule.module_id == module_id).delete(
        synchronize_session=False
    )
    db.query(Module).filter(Module.id == module_id).delete(synchronize_session=False)


def _admin_delete_license(db: Session, license_id: int) -> None:
    db.query(ConfigurationItem).filter(ConfigurationItem.license_id == license_id).delete(
        synchronize_session=False
    )
    db.query(License).filter(License.id == license_id).delete(synchronize_session=False)


@router.patch("/modules/{module_id}")
def update_module(
    module_id: int,
    payload: ModuleUpdate,
    db: Session = Depends(get_db),
    _: dict = Depends(require_roles(1)),
):
    row = db.query(Module).filter(Module.id == module_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Module not found")
    data = payload.model_dump(exclude_unset=True)
    if "name" in data and data["name"] is not None:
        n = str(data["name"]).strip()
        if not n:
            raise HTTPException(status_code=400, detail="Module name cannot be empty")
        row.name = n
    if "speed_gbps" in data:
        sg = data["speed_gbps"]
        if sg is not None and sg < 0:
            raise HTTPException(status_code=400, detail="speed_gbps must be >= 0")
        row.speed_gbps = sg
    if "form_factor" in data:
        ff = data["form_factor"]
        if ff is None:
            row.form_factor = None
        else:
            s = str(ff).strip()
            row.form_factor = s or None
    if "max_quantity" in data:
        mq = data["max_quantity"]
        if mq is not None and mq < 0:
            raise HTTPException(status_code=400, detail="max_quantity must be >= 0")
        row.max_quantity = mq
    db.commit()
    db.refresh(row)
    return _module_to_dict(row)


@router.delete("/modules/{module_id}")
def delete_module(
    module_id: int,
    db: Session = Depends(get_db),
    _: dict = Depends(require_roles(1)),
):
    row = db.query(Module).filter(Module.id == module_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Module not found")
    _admin_delete_module(db, module_id)
    db.commit()
    return {"status": "ok"}


@router.patch("/licenses/{license_id}")
def update_license(
    license_id: int,
    payload: LicenseUpdate,
    db: Session = Depends(get_db),
    _: dict = Depends(require_roles(1)),
):
    row = db.query(License).filter(License.id == license_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="License not found")
    data = payload.model_dump(exclude_unset=True)
    if "name" in data and data["name"] is not None:
        n = str(data["name"]).strip()
        if not n:
            raise HTTPException(status_code=400, detail="License name cannot be empty")
        row.name = n
    if "units_per_pack" in data and data["units_per_pack"] is not None:
        upp = data["units_per_pack"]
        if upp < 1:
            raise HTTPException(status_code=400, detail="units_per_pack must be >= 1")
        row.units_per_pack = upp
    db.commit()
    db.refresh(row)
    return _license_to_dict(row)


@router.delete("/licenses/{license_id}")
def delete_license(
    license_id: int,
    db: Session = Depends(get_db),
    _: dict = Depends(require_roles(1)),
):
    row = db.query(License).filter(License.id == license_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="License not found")
    _admin_delete_license(db, license_id)
    db.commit()
    return {"status": "ok"}

