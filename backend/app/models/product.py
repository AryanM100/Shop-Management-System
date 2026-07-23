from datetime import datetime, timezone
from decimal import Decimal
from typing import TYPE_CHECKING

import sqlalchemy as sa
from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from app.models.order_item import OrderItem


class Product(SQLModel, table=True):
    __tablename__ = "products"
    __table_args__ = (
        sa.CheckConstraint("price > 0", name="ck_products_price_positive"),
        sa.CheckConstraint("stock_quantity >= 0", name="ck_products_stock_non_negative"),
    )

    id: int | None = Field(default=None, primary_key=True)
    name: str
    description: str
    price: Decimal = Field(sa_column=sa.Column(sa.Numeric(10, 2), nullable=False))
    stock_quantity: int = Field(default=0)
    image_url: str | None = Field(default=None)
    is_active: bool = Field(default=True)

    created_at: datetime = Field(
    default_factory=lambda: datetime.now(timezone.utc),
    sa_column=sa.Column(sa.DateTime(timezone=True)))

    updated_at: datetime = Field(
    default_factory=lambda: datetime.now(timezone.utc),
    sa_column=sa.Column(sa.DateTime(timezone=True)))

    order_items: list["OrderItem"] = Relationship(back_populates="product")
