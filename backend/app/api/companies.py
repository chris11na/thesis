from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, field_validator
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.api.deps import require_roles
from app.core.email_domain import email_domain, normalize_domain
from app.db.session import SessionLocal
from app.models.company import Company
from app.models.user import User


router = APIRouter(prefix="/companies", tags=["companies"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


class CompanyCreate(BaseModel):
    name: str
    domain: str

    @field_validator("domain")
    @classmethod
    def domain_ok(cls, v: str) -> str:
        d = normalize_domain(v)
        if not d or "." not in d:
            raise ValueError("domain must look like example.com")
        return d


class CompanyUpdate(BaseModel):
    name: str | None = None
    domain: str | None = None

    @field_validator("domain")
    @classmethod
    def domain_ok(cls, v: str | None) -> str | None:
        if v is None:
            return None
        d = normalize_domain(v)
        if not d or "." not in d:
            raise ValueError("domain must look like example.com")
        return d


class CompanyRead(BaseModel):
    id: int
    name: str
    domain: str

    model_config = {"from_attributes": True}


@router.get("", response_model=list[CompanyRead])
def list_companies(
    q: str | None = Query(None, description="Search by company name or email domain"),
    db: Session = Depends(get_db),
    _: dict = Depends(require_roles(1)),
):
    query = db.query(Company).order_by(Company.id)
    search = (q or "").strip().lower()
    if search:
        like = f"%{search}%"
        query = query.filter(
            or_(
                func.lower(Company.name).like(like),
                func.lower(Company.domain).like(like),
            )
        )
    return query.all()


@router.post("", response_model=CompanyRead)
def create_company(
    payload: CompanyCreate,
    db: Session = Depends(get_db),
    _: dict = Depends(require_roles(1)),
):
    domain = normalize_domain(payload.domain)
    exists = (
        db.query(Company)
        .filter(func.lower(Company.domain) == domain)
        .first()
    )
    if exists:
        raise HTTPException(status_code=409, detail="Company with this domain already exists")
    row = Company(name=payload.name.strip(), domain=domain)
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.patch("/{company_id}", response_model=CompanyRead)
def update_company(
    company_id: int,
    payload: CompanyUpdate,
    db: Session = Depends(get_db),
    _: dict = Depends(require_roles(1)),
):
    row = db.query(Company).filter(Company.id == company_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Company not found")
    if payload.name is not None:
        row.name = payload.name.strip()
    if payload.domain is not None:
        domain = normalize_domain(payload.domain)
        clash = (
            db.query(Company)
            .filter(func.lower(Company.domain) == domain, Company.id != company_id)
            .first()
        )
        if clash:
            raise HTTPException(status_code=409, detail="Another company uses this domain")
        row.domain = domain
    db.commit()
    db.refresh(row)
    return row


@router.delete("/{company_id}")
def delete_company(
    company_id: int,
    db: Session = Depends(get_db),
    _: dict = Depends(require_roles(1)),
):
    row = db.query(Company).filter(Company.id == company_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Company not found")
    n_users = db.query(User).filter(User.company_id == company_id).count()
    if n_users:
        raise HTTPException(
            status_code=409,
            detail=f"Cannot delete company: {n_users} user(s) still assigned",
        )
    db.delete(row)
    db.commit()
    return {"status": "ok"}
