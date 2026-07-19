import stripe
import threading
from decimal import Decimal
from typing import Annotated
from pydantic import BaseModel

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select

from app.core.config import settings
from app.api.deps import get_current_user, require_role
from app.core.database import get_session
from app.models.order import Order, OrderStatus
from app.models.order_item import OrderItem
from app.models.product import Product
from app.models.user import User, UserRole
from app.schemas.order import OrderCreate, OrderResponse, OrderStatusUpdate

stripe.api_key = settings.STRIPE_SECRET_KEY

class PaymentIntentResponse(BaseModel):
    client_secret: str

router = APIRouter(prefix="/orders", tags=["orders"])

_sqlite_lock = threading.Lock()

@router.post("/", response_model=OrderResponse)
def create_order(
    *,
    session: Annotated[Session, Depends(get_session)],
    current_user: Annotated[User, Depends(require_role(UserRole.CUSTOMER))],
    order_in: OrderCreate,
) -> Order:
    if not order_in.items:
        raise HTTPException(status_code=400, detail="Order must contain at least one item")

    product_ids = sorted(list(set(item.product_id for item in order_in.items)))

    # We use row-level locking (SELECT FOR UPDATE) to prevent overselling under concurrent requests.
    # By acquiring locks on the requested products, we ensure that stock_quantity checks and updates
    # happen atomically. If any item fails the check, the entire transaction is rolled back.
    
    # Emulate row-level lock for SQLite which ignores SELECT FOR UPDATE
    is_sqlite = session.bind.dialect.name == "sqlite"
    if is_sqlite:
        _sqlite_lock.acquire()

    try:
        statement = select(Product).where(Product.id.in_(product_ids)).with_for_update()
        products = session.exec(statement).all()
        product_map = {p.id: p for p in products}
    
        total_amount = Decimal(0)
        order_items_to_create: list[OrderItem] = []
    
        for item in order_in.items:
            product = product_map.get(item.product_id)
            if not product or not product.is_active:
                raise HTTPException(
                    status_code=400, detail=f"Product {item.product_id} is unavailable"
                )
    
            if product.stock_quantity < item.quantity:
                raise HTTPException(
                    status_code=400, detail=f"Out of stock for product {product.name}"
                )
    
            product.stock_quantity -= item.quantity
            session.add(product)
    
            total_amount += product.price * item.quantity
            order_items_to_create.append(
                OrderItem(
                    product_id=product.id,
                    quantity=item.quantity,
                    unit_price_at_purchase=product.price,
                )
            )
    
        order = Order(
            user_id=current_user.id,
            total_amount=total_amount,
            status=OrderStatus.PENDING,
        )
        session.add(order)
        session.flush()
    
        for oi in order_items_to_create:
            oi.order_id = order.id
            session.add(oi)
    
        session.commit()
        session.refresh(order)
        return order
    finally:
        if is_sqlite:
            _sqlite_lock.release()



@router.get("/", response_model=list[OrderResponse])
def get_my_orders(
    session: Annotated[Session, Depends(get_session)],
    current_user: Annotated[User, Depends(require_role(UserRole.CUSTOMER))],
) -> list[Order]:
    statement = select(Order).where(Order.user_id == current_user.id).order_by(Order.created_at.desc())
    orders = session.exec(statement).all()
    return list(orders)


@router.get("/all", response_model=list[OrderResponse])
def get_all_orders(
    session: Annotated[Session, Depends(get_session)],
    current_user: Annotated[User, Depends(require_role(UserRole.SHOP_OWNER))],
    status: OrderStatus | None = None,
) -> list[Order]:
    statement = select(Order)
    if status:
        statement = statement.where(Order.status == status)
    statement = statement.order_by(Order.created_at.desc())
    orders = session.exec(statement).all()
    return list(orders)


@router.get("/{id}", response_model=OrderResponse)
def get_order(
    id: int,
    session: Annotated[Session, Depends(get_session)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> Order:
    order = session.get(Order, id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    if current_user.role == UserRole.CUSTOMER and order.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")
        
    return order


@router.patch("/{id}/status", response_model=OrderResponse)
def update_order_status(
    id: int,
    status_update: OrderStatusUpdate,
    session: Annotated[Session, Depends(get_session)],
    current_user: Annotated[User, Depends(require_role(UserRole.SHOP_OWNER))],
) -> Order:
    order = session.get(Order, id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    valid_transitions = {
        OrderStatus.PENDING: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
        OrderStatus.CONFIRMED: [OrderStatus.PREPARING, OrderStatus.CANCELLED],
        OrderStatus.PREPARING: [OrderStatus.READY, OrderStatus.CANCELLED],
        OrderStatus.READY: [OrderStatus.COMPLETED, OrderStatus.CANCELLED],
        OrderStatus.COMPLETED: [],
        OrderStatus.CANCELLED: [],
    }

    if status_update.status not in valid_transitions[order.status]:
        allowed = [s.value for s in valid_transitions[order.status]]
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid transition from {order.status.value}. Allowed: {allowed}"
        )

    order.status = status_update.status
    session.add(order)
    session.commit()
    session.refresh(order)
    return order


@router.post("/{id}/create-payment-intent", response_model=PaymentIntentResponse)
def create_payment_intent(
    id: int,
    session: Annotated[Session, Depends(get_session)],
    current_user: Annotated[User, Depends(require_role(UserRole.CUSTOMER))],
) -> PaymentIntentResponse:
    order = session.get(Order, id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
        
    if order.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")
        
    if order.status != OrderStatus.PENDING:
        raise HTTPException(status_code=400, detail="Only pending orders can be paid for")

    amount_in_cents = int(order.total_amount * 100)
    
    try:
        intent = stripe.PaymentIntent.create(
            amount=amount_in_cents,
            currency="usd",
            metadata={"order_id": str(order.id)},
        )
        return PaymentIntentResponse(client_secret=intent.client_secret)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

