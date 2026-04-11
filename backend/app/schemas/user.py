from typing import Optional

from pydantic import BaseModel, EmailStr


class UserBase(BaseModel):
    name: str
    email: str


class UserCreate(UserBase):
    password: str
    role_id: Optional[int] = None
    company_id: Optional[int] = None


class UserRead(UserBase):
    id: int
    role_id: Optional[int] = None
    company_id: Optional[int] = None

    model_config = {"from_attributes": True}
