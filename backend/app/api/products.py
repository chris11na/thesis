import json

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.api.deps import require_roles
from app.db.session import SessionLocal
from app.models.compatibility_rule import CompatibilityRule
from app.models.configuration_item import ConfigurationItem
from app.models.license import License
from app.models.module import Module
from app.models.product import Product
from app.models.product_incompatible_pair import ProductIncompatiblePair
from app.services.config_validation import suggest_license_packs
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


@router.get("")
def list_products(db: Session = Depends(get_db)):
    products = db.query(Product).order_by(Product.id).all()
    out = []
    for p in products:
        row = {
            "id": p.id,
            "name": p.name,
            "description": p.description,
            "technical_specs": p.technical_specs,
            "product_kind": getattr(p, "product_kind", None) or "equipment",
            "product_category": getattr(p, "product_category", None),
            "built_in_license_units": getattr(p, "built_in_license_units", None),
            "module_speeds_json": getattr(p, "module_speeds_json", None),
            "max_module_slots": getattr(p, "max_module_slots", None),
            "rules_json": getattr(p, "rules_json", None),
        }
        mod_n = db.query(Module).filter(Module.product_id == p.id).count()
        lic_n = db.query(License).filter(License.product_id == p.id).count()
        row["addon_options_count"] = mod_n + lic_n
        out.append(row)
    return out


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
    )
    db.add(row)
    db.commit()
    db.refresh(row)
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

    db.commit()
    db.refresh(row)
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

