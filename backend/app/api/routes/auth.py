from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi import Response
from fastapi.security import OAuth2PasswordRequestForm
from fastapi import Request
from sqlmodel import Session, select
from datetime import datetime, timezone, timedelta
import logging
import uuid
from jose import JWTError
from pydantic import ValidationError

from app.api.deps import get_current_user
from app.core import security
from app.core.database import get_session
from app.models.user import User, UserRole
from app.schemas.token import Token
from app.schemas.user import UserCreate, UserResponse
from app.core.limiter import limiter
from app.models.refresh_token import RefreshToken
from app.core.config import settings

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

    if user_in.email:
        statement = select(User).where(User.email == user_in.email)
        user = session.exec(statement).first()
        if user:
            logger.warning(f"Registration attempt with existing email: {user_in.email}")
            raise HTTPException(status_code=400, detail="The user with this email already exists in the system.")

    elif user_in.phone_number:
        statement = select(User).where(User.phone_number == user_in.phone_number)
        user = session.exec(statement).first()
        if user:
            logger.warning(f"Registration attempt with existing phone number: {user_in.phone_number}")
            raise HTTPException(status_code=400, detail="The user with this phone number already exists in the system.")

    user_create = User(
        email=user_in.email,
        phone_number=user_in.phone_number,
        hashed_password=security.get_password_hash(user_in.password),
        full_name=user_in.full_name,
        role=UserRole.CUSTOMER,
    )
    session.add(user_create)
    session.commit()
    session.refresh(user_create)
    logger.info(f"New user registered with email / phone number: {user_in.email} {user_in.phone_number}")
    return user_create


@router.post("/login", response_model=Token)
@limiter.limit("5/minute")
def login(
    request: Request,
    response: Response,
    session: Annotated[Session, Depends(get_session)],
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
) -> Token:
    statement = select(User).where((User.email == form_data.username) | (User.phone_number == form_data.username))
    user = session.exec(statement).first()
    if not user or not security.verify_password(form_data.password, user.hashed_password):
        logger.warning(f"Failed login attempt for email / phone number: {form_data.username}")
        raise HTTPException(
            status_code=400,
            detail="Incorrect Email / Phone Number or Password",
        )
    
    access_token = security.create_access_token(
        subject=user.id, role=user.role.value
    )

    token_family = str(uuid.uuid4())
    jti = str(uuid.uuid4())
    refresh_token = security.create_refresh_token(subject=user.id, token_family=token_family, jti=jti)

    refresh_token_create = RefreshToken(
        user_id=user.id,
        token_hash=security.hash_token(refresh_token),
        token_family=token_family,
    )

    session.add(refresh_token_create)
    session.commit()
    session.refresh(refresh_token_create)
    logger.info(f"Refresh token issued for user {user.id}")

    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        samesite="lax",
        secure=True,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )

    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        samesite="lax",
        secure=True,
        path="/api/auth/refresh",
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
    )

    return Token(
        access_token=access_token,
        token_type="bearer",
    )


@router.post("/logout")
def logout(request: Request, response: Response, session: Annotated[Session, Depends(get_session)]) -> dict[str, str]:
    refresh_token = request.cookies.get("refresh_token")
    if refresh_token:
        statement = select(RefreshToken).where(RefreshToken.token_hash == security.hash_token(refresh_token))
        rf = session.exec(statement).first()

        if rf:
            rf.is_revoked = True
            session.add(rf)
            session.commit()

    response.delete_cookie(key="access_token")
    response.delete_cookie(key="refresh_token", path="/api/auth/refresh")
    return {"detail": "Logged out successfully"}


@router.get("/me", response_model=UserResponse)
def get_me(
    current_user: Annotated[User, Depends(get_current_user)],
) -> UserResponse:
    return current_user


@router.post("/refresh", response_model=Token)
@limiter.limit("5/minute")
def refresh(request: Request, response: Response, session: Annotated[Session, Depends(get_session)]) -> Token:
    refresh_token = request.cookies.get("refresh_token")
    if refresh_token is None:
        raise HTTPException(status_code=401, detail="Refresh token missing.")

    try:
        payload = security.decode_access_token(refresh_token)
        if payload.get("type") != "refresh":
            logger.warning("Auth failed: Provided token is not a refresh token.")
            raise HTTPException(status_code=401, detail="Invalid token type")

    except (JWTError, ValidationError):
        raise HTTPException(status_code=401, detail="Invalid refresh token")


    statement = select(RefreshToken).where(security.hash_token(refresh_token) == RefreshToken.token_hash).with_for_update()
    rf = session.exec(statement).first()
    if rf is None:
        logger.warning("Refresh token does not exist in the db.")
        raise HTTPException(status_code=401, detail="Refresh token not found")
    
    if rf.is_revoked == True:
        logger.warning(f"SECURITY ALERT: Replay attack detected for family {rf.token_family}!")
        statement = select(RefreshToken).where(rf.token_family == RefreshToken.token_family)
        all_tokens = session.exec(statement).all()
        for token in all_tokens:
            token.is_revoked = True
        session.commit()
        response.delete_cookie(key="access_token")
        response.delete_cookie(key="refresh_token", path="/api/auth/refresh")
        raise HTTPException(status_code=401, detail="Token reuse detected, revoking session")

    now = datetime.now(timezone.utc)
    if rf.expires_at < now:
        rf.is_revoked = True
        session.commit()
        logger.info(f"Refresh token expired for user {rf.user_id}, family {rf.token_family}")
        raise HTTPException(status_code=401, detail="Token expired")

    rf.is_revoked = True
    session.add(rf)

    new_token_family = rf.token_family
    new_jti = str(uuid.uuid4())

    user = session.get(User, rf.user_id)
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    new_access_token = security.create_access_token(subject=user.id, role=user.role.value)
    new_refresh_token = security.create_refresh_token(subject=user.id, token_family=new_token_family, jti=new_jti)
    
    new_rf_db = RefreshToken(user_id=user.id, token_hash=security.hash_token(new_refresh_token), token_family=new_token_family)

    session.add(new_rf_db)
    session.commit()

    response.set_cookie(
        key="access_token",
        value=new_access_token,
        httponly=True,
        samesite="lax",
        secure=True,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )

    response.set_cookie(
        key="refresh_token",
        value=new_refresh_token,
        httponly=True,
        samesite="lax",
        secure=True,
        path="/api/auth/refresh",
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
    )

    return Token(access_token=new_access_token, token_type="bearer")