from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlmodel import Session

from app.core.config import settings
from app.core.database import get_session
from app.schemas.health import HealthResponse
from app.api.routes import auth, orders, products, webhooks

app = FastAPI(title="Shop API")

# Add CORS middleware for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api")
app.include_router(products.router, prefix="/api")
app.include_router(orders.router, prefix="/api")
app.include_router(webhooks.router, prefix="/api")


@app.get("/api/health", response_model=HealthResponse)
def health_check(session: Session = Depends(get_session)) -> HealthResponse:
    try:
        session.execute(text("SELECT 1"))
        db_status = "connected"
    except Exception:
        db_status = "disconnected"
    return HealthResponse(status="healthy", database=db_status)
