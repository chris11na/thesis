from typing import Optional

from pydantic import BaseModel, EmailStr, Field


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
    is_approved: bool = False

    model_config = {"from_attributes": True}


class UserAdminRead(UserRead):
    admin_comment: Optional[str] = None


class UserAdminUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=200)
    is_approved: Optional[bool] = None
    admin_comment: Optional[str] = Field(default=None, max_length=4000)
    role_id: Optional[int] = Field(default=None, ge=1)
