from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.api.deps import require_roles
from app.db.session import SessionLocal
from app.models.equipment_group import EquipmentGroup
from app.models.equipment_subgroup import EquipmentSubgroup
from app.models.product import Product
from app.services.equipment_groups_seed import assign_products_to_subgroups, subgroup_product_counts

router = APIRouter(prefix="/catalog-groups", tags=["catalog-groups"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


class SubgroupCreate(BaseModel):
    code: str
    name: str
    sort_order: int = 0
    is_active: bool = True


class SubgroupUpdate(BaseModel):
    code: str | None = None
    name: str | None = None
    sort_order: int | None = None
    is_active: bool | None = None


class GroupCreate(BaseModel):
    code: str
    name: str
    sort_order: int = 0
    is_active: bool = True
    subgroups: list[SubgroupCreate] = Field(default_factory=list)


class GroupUpdate(BaseModel):
    code: str | None = None
    name: str | None = None
    sort_order: int | None = None
    is_active: bool | None = None


def _serialize_subgroup(sub: EquipmentSubgroup, counts: dict[int, int]) -> dict:
    return {
        "id": sub.id,
        "group_id": sub.group_id,
        "code": sub.code,
        "name": sub.name,
        "sort_order": sub.sort_order,
        "is_active": sub.is_active,
        "product_count": counts.get(sub.id, 0),
    }


def _serialize_group(group: EquipmentGroup, counts: dict[int, int]) -> dict:
    subs = [
        _serialize_subgroup(s, counts)
        for s in sorted(group.subgroups, key=lambda x: (x.sort_order, x.id))
    ]
    return {
        "id": group.id,
        "code": group.code,
        "name": group.name,
        "sort_order": group.sort_order,
        "is_active": group.is_active,
        "subgroups": subs,
        "product_count": sum(counts.get(s.id, 0) for s in group.subgroups),
    }


@router.get("")
def list_catalog_groups(
    include_inactive: bool = Query(False),
    db: Session = Depends(get_db),
):
    counts = subgroup_product_counts(db)
    q = (
        db.query(EquipmentGroup)
        .options(joinedload(EquipmentGroup.subgroups))
        .order_by(EquipmentGroup.sort_order, EquipmentGroup.id)
    )
    if not include_inactive:
        q = q.filter(EquipmentGroup.is_active == True)  # noqa: E712
    groups = q.all()
    out = []
    for group in groups:
        serialized = _serialize_group(group, counts)
        if not include_inactive:
            serialized["subgroups"] = [
                s for s in serialized["subgroups"] if s["is_active"]
            ]
        out.append(serialized)
    return out


@router.post("")
def create_catalog_group(
    payload: GroupCreate,
    db: Session = Depends(get_db),
    _: dict = Depends(require_roles(1)),
):
    code = (payload.code or "").strip().lower()
    name = (payload.name or "").strip()
    if not code:
        raise HTTPException(status_code=400, detail="code is required")
    if not name:
        raise HTTPException(status_code=400, detail="name is required")
    if db.query(EquipmentGroup).filter(EquipmentGroup.code == code).first():
        raise HTTPException(status_code=409, detail="Group code already exists")

    group = EquipmentGroup(
        code=code,
        name=name,
        sort_order=payload.sort_order,
        is_active=payload.is_active,
    )
    db.add(group)
    db.flush()

    for sub in payload.subgroups:
        sub_code = (sub.code or "").strip().lower()
        sub_name = (sub.name or "").strip()
        if not sub_code or not sub_name:
            raise HTTPException(status_code=400, detail="subgroup code and name are required")
        db.add(
            EquipmentSubgroup(
                group_id=group.id,
                code=sub_code,
                name=sub_name,
                sort_order=sub.sort_order,
                is_active=sub.is_active,
            )
        )
    db.commit()
    db.refresh(group)
    counts = subgroup_product_counts(db)
    return _serialize_group(group, counts)


@router.patch("/{group_id}")
def update_catalog_group(
    group_id: int,
    payload: GroupUpdate,
    db: Session = Depends(get_db),
    _: dict = Depends(require_roles(1)),
):
    group = db.query(EquipmentGroup).filter(EquipmentGroup.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    data = payload.model_dump(exclude_unset=True)
    if "code" in data and data["code"] is not None:
        code = str(data["code"]).strip().lower()
        if not code:
            raise HTTPException(status_code=400, detail="code cannot be empty")
        exists = (
            db.query(EquipmentGroup)
            .filter(EquipmentGroup.code == code, EquipmentGroup.id != group_id)
            .first()
        )
        if exists:
            raise HTTPException(status_code=409, detail="Group code already exists")
        group.code = code
    if "name" in data and data["name"] is not None:
        name = str(data["name"]).strip()
        if not name:
            raise HTTPException(status_code=400, detail="name cannot be empty")
        group.name = name
    if "sort_order" in data and data["sort_order"] is not None:
        group.sort_order = int(data["sort_order"])
    if "is_active" in data and data["is_active"] is not None:
        group.is_active = bool(data["is_active"])
    db.commit()
    db.refresh(group)
    counts = subgroup_product_counts(db)
    return _serialize_group(group, counts)


@router.delete("/{group_id}")
def delete_catalog_group(
    group_id: int,
    db: Session = Depends(get_db),
    _: dict = Depends(require_roles(1)),
):
    group = db.query(EquipmentGroup).filter(EquipmentGroup.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    used = db.query(Product.id).filter(Product.subgroup_id.in_([s.id for s in group.subgroups])).first()
    if used:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete group with products assigned to its subgroups",
        )
    db.delete(group)
    db.commit()
    return {"status": "ok"}


@router.post("/{group_id}/subgroups")
def create_subgroup(
    group_id: int,
    payload: SubgroupCreate,
    db: Session = Depends(get_db),
    _: dict = Depends(require_roles(1)),
):
    group = db.query(EquipmentGroup).filter(EquipmentGroup.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    code = (payload.code or "").strip().lower()
    name = (payload.name or "").strip()
    if not code:
        raise HTTPException(status_code=400, detail="code is required")
    if not name:
        raise HTTPException(status_code=400, detail="name is required")
    exists = (
        db.query(EquipmentSubgroup)
        .filter(EquipmentSubgroup.group_id == group_id, EquipmentSubgroup.code == code)
        .first()
    )
    if exists:
        raise HTTPException(status_code=409, detail="Subgroup code already exists in this group")
    sub = EquipmentSubgroup(
        group_id=group_id,
        code=code,
        name=name,
        sort_order=payload.sort_order,
        is_active=payload.is_active,
    )
    db.add(sub)
    db.commit()
    db.refresh(sub)
    counts = subgroup_product_counts(db)
    return _serialize_subgroup(sub, counts)


@router.patch("/subgroups/{subgroup_id}")
def update_subgroup(
    subgroup_id: int,
    payload: SubgroupUpdate,
    db: Session = Depends(get_db),
    _: dict = Depends(require_roles(1)),
):
    sub = db.query(EquipmentSubgroup).filter(EquipmentSubgroup.id == subgroup_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Subgroup not found")
    data = payload.model_dump(exclude_unset=True)
    if "code" in data and data["code"] is not None:
        code = str(data["code"]).strip().lower()
        if not code:
            raise HTTPException(status_code=400, detail="code cannot be empty")
        exists = (
            db.query(EquipmentSubgroup)
            .filter(
                EquipmentSubgroup.group_id == sub.group_id,
                EquipmentSubgroup.code == code,
                EquipmentSubgroup.id != subgroup_id,
            )
            .first()
        )
        if exists:
            raise HTTPException(status_code=409, detail="Subgroup code already exists in this group")
        sub.code = code
    if "name" in data and data["name"] is not None:
        name = str(data["name"]).strip()
        if not name:
            raise HTTPException(status_code=400, detail="name cannot be empty")
        sub.name = name
    if "sort_order" in data and data["sort_order"] is not None:
        sub.sort_order = int(data["sort_order"])
    if "is_active" in data and data["is_active"] is not None:
        sub.is_active = bool(data["is_active"])
    db.commit()
    db.refresh(sub)
    counts = subgroup_product_counts(db)
    return _serialize_subgroup(sub, counts)


@router.delete("/subgroups/{subgroup_id}")
def delete_subgroup(
    subgroup_id: int,
    db: Session = Depends(get_db),
    _: dict = Depends(require_roles(1)),
):
    sub = db.query(EquipmentSubgroup).filter(EquipmentSubgroup.id == subgroup_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Subgroup not found")
    used = db.query(Product.id).filter(Product.subgroup_id == subgroup_id).first()
    if used:
        raise HTTPException(status_code=400, detail="Cannot delete subgroup with assigned products")
    db.delete(sub)
    db.commit()
    return {"status": "ok"}


@router.post("/reclassify-products")
def reclassify_products(
    force: bool = Query(False),
    db: Session = Depends(get_db),
    _: dict = Depends(require_roles(1)),
):
    stats = assign_products_to_subgroups(db, force=force)
    db.commit()
    return stats
