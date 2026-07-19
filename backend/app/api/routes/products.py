from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select

from app.api.deps import get_current_user, require_role
from app.core.database import get_session
from app.models.product import Product
from app.models.user import User, UserRole
from app.schemas.product import ProductCreate, ProductResponse, ProductUpdate

router = APIRouter(prefix="/products", tags=["products"])


@router.get("/", response_model=list[ProductResponse])
def read_products(
    session: Annotated[Session, Depends(get_session)],
    offset: int = 0,
    limit: Annotated[int, Query(le=100)] = 100,
) -> list[Product]:
    statement = select(Product).where(Product.is_active == True).offset(offset).limit(limit)
    products = session.exec(statement).all()
    return list(products)


@router.get("/{id}", response_model=ProductResponse)
def read_product(
    id: int,
    session: Annotated[Session, Depends(get_session)],
) -> Product:
    product = session.get(Product, id)
    if not product or not product.is_active:
        raise HTTPException(status_code=404, detail="Product not found")
    return product


@router.post("/", response_model=ProductResponse)
def create_product(
    *,
    session: Annotated[Session, Depends(get_session)],
    current_user: Annotated[User, Depends(require_role(UserRole.SHOP_OWNER))],
    product_in: ProductCreate,
) -> Product:
    product = Product(**product_in.model_dump())
    session.add(product)
    session.commit()
    session.refresh(product)
    return product


@router.patch("/{id}", response_model=ProductResponse)
def update_product(
    id: int,
    product_in: ProductUpdate,
    session: Annotated[Session, Depends(get_session)],
    current_user: Annotated[User, Depends(require_role(UserRole.SHOP_OWNER))],
) -> Product:
    product = session.get(Product, id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    update_data = product_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(product, field, value)
        
    session.add(product)
    session.commit()
    session.refresh(product)
    return product


@router.delete("/{id}")
def delete_product(
    id: int,
    session: Annotated[Session, Depends(get_session)],
    current_user: Annotated[User, Depends(require_role(UserRole.SHOP_OWNER))],
) -> dict[str, bool]:
    product = session.get(Product, id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    product.is_active = False
    session.add(product)
    session.commit()
    return {"success": True}
