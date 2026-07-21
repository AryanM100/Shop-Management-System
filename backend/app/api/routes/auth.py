from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi import Response
from fastapi.security import OAuth2PasswordRequestForm
from fastapi import Request
from sqlmodel import Session, select
import logging

from app.api.deps import get_current_user
from app.core import security
from app.core.database import get_session
from app.models.user import User, UserRole
from app.schemas.token import Token
from app.schemas.user import UserCreate, UserResponse
from app.core.limiter import limiter

router = APIRouter(prefix="/auth", tags=["auth"])
logger = logging.getLogger(__name__)


@router.post("/register", response_model=UserResponse)
@limiter.limit("5/minute")
def register(
    request: Request,
    *,
    session: Annotated[Session, Depends(get_session)],
    user_in: UserCreate,
) -> UserResponse:
    statement = select(User).where(User.email == user_in.email)
    user = session.exec(statement).first()
    if user:
        logger.warning(f"Registration attempt with existing email: {user_in.email}")
        raise HTTPException(
            status_code=400,
            detail="The user with this email already exists in the system.",
        )
    user_create = User(
        email=user_in.email,
        hashed_password=security.get_password_hash(user_in.password),
        full_name=user_in.full_name,
        role=UserRole.CUSTOMER,
    )
    session.add(user_create)
    session.commit()
    session.refresh(user_create)
    logger.info(f"New user registered with email: {user_in.email}")
    return user_create


@router.post("/login", response_model=Token)
@limiter.limit("5/minute")
def login(
    request: Request,
    response: Response,
    session: Annotated[Session, Depends(get_session)],
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
) -> Token:
    statement = select(User).where(User.email == form_data.username)
    user = session.exec(statement).first()
    if not user or not security.verify_password(form_data.password, user.hashed_password):
        logger.warning(f"Failed login attempt for email: {form_data.username}")
        raise HTTPException(
            status_code=400,
            detail="Incorrect email or password",
        )
    
    access_token = security.create_access_token(
        subject=user.id, role=user.role.value
    )

    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        samesite="lax",
        secure=False,
        max_age=60 * 60,
    )

    return Token(
        access_token=access_token,
        token_type="bearer",
    )

@router.post("/logout")
def logout(response: Response) -> dict[str, str]:
    response.delete_cookie(key="access_token")
    return {"detail": "Logged out successfully"}

@router.get("/me", response_model=UserResponse)
def get_me(
    current_user: Annotated[User, Depends(get_current_user)],
) -> UserResponse:
    return current_user
