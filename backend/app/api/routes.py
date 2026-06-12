from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.email_domain import email_domain
from app.db.session import SessionLocal
from app.models.company import Company
from app.models.user import User
from app.schemas.user import UserAdminRead, UserAdminUpdate, UserCreate, UserRead
from app.api.auth import router as auth_router
from app.api.products import router as products_router
from app.api.configurations import router as configurations_router
from app.api.companies import router as companies_router
from app.api.compatibilities import router as compatibilities_router
from app.api.deps import require_roles
from app.core.security import hash_password

router = APIRouter()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.post("/users", response_model=UserAdminRead)
def create_user(
    user: UserCreate,
    db: Session = Depends(get_db),
    _: dict = Depends(require_roles(1)),
):
    if user.role_id is None or user.company_id is None:
        raise HTTPException(
            status_code=400,
            detail="role_id and company_id are required",
        )
    email_norm = user.email.strip().lower()
    if db.query(User).filter(User.email == email_norm).first():
        raise HTTPException(status_code=409, detail="User with this email already exists")

    company = db.query(Company).filter(Company.id == user.company_id).first()
    if not company:
        raise HTTPException(status_code=400, detail="Invalid company_id")
    dom = email_domain(email_norm)
    if not dom:
        raise HTTPException(status_code=400, detail="Invalid email format")
    if dom != company.domain.lower().strip():
        raise HTTPException(
            status_code=400,
            detail="Email domain must match the selected company domain (" + company.domain + ")",
        )

    db_user = User(
        name=user.name,
        email=email_norm,
        password_hash=hash_password(user.password),
        role_id=user.role_id,
        company_id=user.company_id,
        is_approved=True,
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


@router.get("/users", response_model=list[UserAdminRead])
def list_users(
    company_id: Optional[int] = Query(None, ge=1),
    db: Session = Depends(get_db),
    _: dict = Depends(require_roles(1)),
):
    """List registered users; optional filter by company (for admin / sales handoff visibility)."""
    q = db.query(User).order_by(User.company_id, User.id)
    if company_id is not None:
        q = q.filter(User.company_id == company_id)
    return q.all()


@router.patch("/users/{user_id}", response_model=UserAdminRead)
def update_user(
    user_id: int,
    payload: UserAdminUpdate,
    db: Session = Depends(get_db),
    _: dict = Depends(require_roles(1)),
):
    row = db.query(User).filter(User.id == user_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="User not found")

    data = payload.model_dump(exclude_unset=True)
    if "name" in data and data["name"] is not None:
        name = str(data["name"]).strip()
        if not name:
            raise HTTPException(status_code=400, detail="Name cannot be empty")
        row.name = name
    if "is_approved" in data and data["is_approved"] is not None:
        row.is_approved = bool(data["is_approved"])
    if "admin_comment" in data:
        comment = data["admin_comment"]
        if comment is None:
            row.admin_comment = None
        else:
            text = str(comment).strip()
            row.admin_comment = text or None
    if "role_id" in data and data["role_id"] is not None:
        if row.id == 1 and int(data["role_id"]) != 1:
            raise HTTPException(status_code=400, detail="Cannot change role of the primary admin user")
        row.role_id = int(data["role_id"])

    db.commit()
    db.refresh(row)
    return row


# Подключаем роутеры по модулям
router.include_router(auth_router)
router.include_router(products_router)
router.include_router(configurations_router)
router.include_router(companies_router)
router.include_router(compatibilities_router)
