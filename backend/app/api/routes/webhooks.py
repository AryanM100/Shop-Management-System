from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, Request, Header
from sqlmodel import Session
import stripe

from app.core.config import settings
from app.core.database import get_session
from app.models.order import Order, OrderStatus

router = APIRouter(prefix="/webhooks", tags=["webhooks"])


@router.post("/stripe")
async def stripe_webhook(
    request: Request,
    stripe_signature: Annotated[str, Header()],
    session: Annotated[Session, Depends(get_session)],
):
    payload = await request.body()
    
    try:
        event = stripe.Webhook.construct_event(
            payload, stripe_signature, settings.STRIPE_WEBHOOK_SECRET
        )
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid signature")

    if event["type"] == "payment_intent.succeeded":
        payment_intent = event["data"]["object"]
        order_id = payment_intent.get("metadata", {}).get("order_id")
        
        if order_id:
            order = session.get(Order, int(order_id))
            if order and order.status == OrderStatus.PENDING:
                order.status = OrderStatus.CONFIRMED
                session.add(order)
                session.commit()

    return {"status": "success"}
