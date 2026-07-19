from decimal import Decimal
from typing import TYPE_CHECKING, Optional

import sqlalchemy as sa
from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from app.models.order import Order
    from app.models.product import Product


class OrderItem(SQLModel, table=True):
    __tablename__ = "order_items"
    __table_args__ = (
        sa.CheckConstraint("quantity > 0", name="ck_order_items_quantity_positive"),
        sa.CheckConstraint(
            "unit_price_at_purchase > 0", name="ck_order_items_unit_price_positive"
        ),
    )

    id: int | None = Field(default=None, primary_key=True)
    order_id: int = Field(foreign_key="orders.id")
    product_id: int = Field(foreign_key="products.id")
    quantity: int

    # Stores the product price at the time of purchase. This is a deliberate
    # denormalization so that historical orders are not affected by future
    # price changes to the product.
    unit_price_at_purchase: Decimal = Field(
        sa_column=sa.Column(sa.Numeric(10, 2), nullable=False)
    )

    order: Optional["Order"] = Relationship(back_populates="items")
    product: Optional["Product"] = Relationship(back_populates="order_items")
