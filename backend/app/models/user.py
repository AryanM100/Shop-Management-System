import enum
from datetime import datetime, timezone
from typing import TYPE_CHECKING

import sqlalchemy as sa
from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from app.models.order import Order


class UserRole(str, enum.Enum):
    CUSTOMER = "customer"
    SHOP_OWNER = "shop_owner"


class User(SQLModel, table=True):
    __tablename__ = "users"
    __table_args__ = (
        sa.CheckConstraint("email IS NOT NULL or phone_number IS NOT NULL", name="ck_users_email_or_phone_required"),)

    id: int | None = Field(default=None, primary_key=True)
    email: str | None = Field(default=None, unique=True, index=True)
    phone_number: str | None = Field(default=None, unique=True, index=True)
    hashed_password: str
    full_name: str
    role: UserRole = Field(sa_column=sa.Column(sa.Enum(UserRole), nullable=False))
    
    created_at: datetime = Field(
    default_factory=lambda: datetime.now(timezone.utc),
    sa_column=sa.Column(sa.DateTime(timezone=True)))

    orders: list["Order"] = Relationship(back_populates="user")
