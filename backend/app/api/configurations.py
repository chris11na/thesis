from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.services.compatibility_service import is_configuration_compatible
from app.models.configuration import Configuration
from app.models.configuration_item import ConfigurationItem
from app.models.product import Product
from app.models.module import Module
from app.models.license import License
from app.models.user import User
from app.api.deps import get_current_user_claims

router = APIRouter(prefix="/configurations", tags=["configurations"])


class ConfigurationCreateRequest(BaseModel):
    user_id: int
    items: list[int]  # ids продуктов/модулей/лицензий в упрощённом виде


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.post("")
def create_configuration(
    payload: ConfigurationCreateRequest,
    db: Session = Depends(get_db),
    claims: dict = Depends(get_current_user_claims),
):
    # Basic validation (no auth yet, but DB constraints still apply)
    if payload.user_id <= 0:
        raise HTTPException(status_code=400, detail="user_id must be a positive integer")

    selected_item_ids = list(dict.fromkeys(payload.items))  # preserve order, remove duplicates
    if not selected_item_ids:
        raise HTTPException(status_code=400, detail="items must contain at least one id")

    token_user_id = int(claims.get("sub"))
    token_role_id = claims.get("role_id")
    if token_role_id != 1 and token_user_id != payload.user_id:
        raise HTTPException(
            status_code=403,
            detail="RBAC: cannot create configuration for other users",
        )

    user = db.query(User).filter(User.id == payload.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Minimal validation: accept ids from products/modules/licenses.
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

    # Step 1. Check compatibility through a single service
    is_ok, reason = is_configuration_compatible(db, selected_item_ids=selected_item_ids)
    if not is_ok:
        # Incompatible configurations are blocked at backend level
        raise HTTPException(status_code=400, detail=reason or "Incompatible configuration")

    # Step 2. Persist configuration + configuration items
    config = Configuration(user_id=payload.user_id)
    db.add(config)
    db.flush()  # obtain config.id

    for product_id in selected_item_ids:
        # Fill the correct foreign key based on what entity this id belongs to.
        # Note: ids are plain integers, so if an id exists in multiple tables (unlikely),
        # priority is: product -> module -> license.
        if product_id in product_ids:
            db.add(
                ConfigurationItem(
                    configuration_id=config.id,
                    product_id=product_id,
                    module_id=None,
                    license_id=None,
                    quantity=1,
                )
            )
        elif product_id in module_ids:
            db.add(
                ConfigurationItem(
                    configuration_id=config.id,
                    product_id=None,
                    module_id=product_id,
                    license_id=None,
                    quantity=1,
                )
            )
        elif product_id in license_ids:
            db.add(
                ConfigurationItem(
                    configuration_id=config.id,
                    product_id=None,
                    module_id=None,
                    license_id=product_id,
                    quantity=1,
                )
            )

    db.commit()
    db.refresh(config)

    return {
        "status": "ok",
        "configuration_id": config.id,
        "user_id": payload.user_id,
        "items": selected_item_ids,
    }

