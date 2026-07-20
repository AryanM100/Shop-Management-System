from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, Request, Header
from sqlmodel import Session
import razorpay

from app.core.config import settings
from app.core.database import get_session
from app.models.order import Order, OrderStatus

router = APIRouter(prefix="/webhooks", tags=["webhooks"])

razorpay_client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))


@router.post("/razorpay")
async def razorpay_webhook(
    request: Request,
    x_razorpay_signature: Annotated[str, Header()],
    session: Annotated[Session, Depends(get_session)],
):
    payload = await request.body()

    try:
        razorpay_client.utility.verify_webhook_signature(
            payload.decode("utf-8"),
            x_razorpay_signature,
            settings.RAZORPAY_WEBHOOK_SECRET,
        )
    except razorpay.errors.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid signature")

    event = await request.json()

    if event.get("event") == "payment.captured":
        payment = event["payload"]["payment"]["entity"]
        order_id = payment.get("notes", {}).get("order_id")
        if order_id:
            order = session.get(Order, int(order_id))
            if order and order.status == OrderStatus.PENDING:
                order.status = OrderStatus.CONFIRMED
                session.add(order)
                session.commit()

    return {"status": "success"}