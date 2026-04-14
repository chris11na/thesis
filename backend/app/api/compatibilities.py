from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, model_validator
from sqlalchemy.orm import Session

from app.api.deps import require_roles
from app.db.session import SessionLocal
from app.models.compatibility_rule import CompatibilityRule
from app.models.module import Module
from app.models.product import Product
from app.models.product_incompatible_pair import ProductIncompatiblePair


router = APIRouter(prefix="/compatibilities", tags=["compatibilities"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


class CompatibilityRuleRead(BaseModel):
    id: int
    product_id: int
    module_id: int | None
    rule_type: str

    model_config = {"from_attributes": True}


class CompatibilityRuleCreate(BaseModel):
    product_id: int
    module_id: int | None = None
    rule_type: str = "forbidden"


class ProductPairRead(BaseModel):
    id: int
    product_smaller_id: int
    product_larger_id: int

    model_config = {"from_attributes": True}


class ProductPairCreate(BaseModel):
    product_id_a: int
    product_id_b: int

    @model_validator(mode="after")
    def distinct(self):
        if self.product_id_a == self.product_id_b:
            raise ValueError("Choose two different products")
        return self


def _ordered_pair(a: int, b: int) -> tuple[int, int]:
    return (a, b) if a < b else (b, a)


# ---- Row rules (product-level and optional module) ----


@router.get("/rules", response_model=list[CompatibilityRuleRead])
def list_rules(
    db: Session = Depends(get_db),
    _: dict = Depends(require_roles(1)),
):
    return db.query(CompatibilityRule).order_by(CompatibilityRule.id).all()


@router.post("/rules", response_model=CompatibilityRuleRead)
def create_rule(
    payload: CompatibilityRuleCreate,
    db: Session = Depends(get_db),
    _: dict = Depends(require_roles(1)),
):
    if payload.rule_type != "forbidden":
        raise HTTPException(status_code=400, detail="Only rule_type=forbidden is supported")
    product = db.query(Product).filter(Product.id == payload.product_id).first()
    if not product:
        raise HTTPException(status_code=400, detail="Unknown product_id")
    if payload.module_id is not None:
        mod = db.query(Module).filter(Module.id == payload.module_id).first()
        if not mod:
            raise HTTPException(status_code=400, detail="Unknown module_id")
    row = CompatibilityRule(
        product_id=payload.product_id,
        module_id=payload.module_id,
        rule_type=payload.rule_type,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.delete("/rules/{rule_id}")
def delete_rule(
    rule_id: int,
    db: Session = Depends(get_db),
    _: dict = Depends(require_roles(1)),
):
    row = db.query(CompatibilityRule).filter(CompatibilityRule.id == rule_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Rule not found")
    db.delete(row)
    db.commit()
    return {"status": "ok"}


# ---- Product–product forbidden pairs ----


@router.get("/product-pairs", response_model=list[ProductPairRead])
def list_product_pairs(
    db: Session = Depends(get_db),
    _: dict = Depends(require_roles(1)),
):
    return (
        db.query(ProductIncompatiblePair)
        .order_by(ProductIncompatiblePair.id)
        .all()
    )


@router.post("/product-pairs", response_model=ProductPairRead)
def create_product_pair(
    payload: ProductPairCreate,
    db: Session = Depends(get_db),
    _: dict = Depends(require_roles(1)),
):
    lo, hi = _ordered_pair(payload.product_id_a, payload.product_id_b)
    p_lo = db.query(Product).filter(Product.id == lo).first()
    p_hi = db.query(Product).filter(Product.id == hi).first()
    if not p_lo or not p_hi:
        raise HTTPException(status_code=400, detail="Unknown product id")
    exists = (
        db.query(ProductIncompatiblePair)
        .filter(
            ProductIncompatiblePair.product_smaller_id == lo,
            ProductIncompatiblePair.product_larger_id == hi,
        )
        .first()
    )
    if exists:
        raise HTTPException(status_code=409, detail="This pair already exists")
    row = ProductIncompatiblePair(
        product_smaller_id=lo,
        product_larger_id=hi,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.delete("/product-pairs/{pair_id}")
def delete_product_pair(
    pair_id: int,
    db: Session = Depends(get_db),
    _: dict = Depends(require_roles(1)),
):
    row = (
        db.query(ProductIncompatiblePair)
        .filter(ProductIncompatiblePair.id == pair_id)
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="Pair not found")
    db.delete(row)
    db.commit()
    return {"status": "ok"}
