from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.models.user import User
from app.schemas.user import UserCreate, UserRead
from app.api.auth import router as auth_router
from app.api.products import router as products_router
from app.api.configurations import router as configurations_router
from app.api.deps import require_roles
from app.core.security import hash_password

router = APIRouter()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.post("/users", response_model=UserRead)
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
    if db.query(User).filter(User.email == user.email).first():
        raise HTTPException(status_code=409, detail="User with this email already exists")

    db_user = User(
        name=user.name,
        email=user.email,
        password_hash=hash_password(user.password),
        role_id=user.role_id,
        company_id=user.company_id,
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


# Подключаем роутеры по модулям
router.include_router(auth_router)
router.include_router(products_router)
router.include_router(configurations_router)
