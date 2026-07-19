import asyncio
import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import text
from sqlmodel import Session, SQLModel, create_engine
from sqlmodel.pool import StaticPool

from app.core.security import get_password_hash
from app.main import app
from app.models.product import Product
from app.models.user import User, UserRole

import os

# Use a file-based SQLite database for testing, so different threads get different connections.
# This ensures that SELECT FOR UPDATE and transaction isolation work correctly under concurrent load.
sqlite_url = "sqlite:///./test.db"

engine = create_engine(
    sqlite_url, 
    connect_args={"check_same_thread": False, "timeout": 15}
)

def setup_db():
    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        # Create a shop owner
        owner = User(
            email="owner@test.com",
            hashed_password=get_password_hash("password"),
            full_name="Owner",
            role=UserRole.SHOP_OWNER
        )
        # Create two customers
        customer1 = User(
            email="cust1@test.com",
            hashed_password=get_password_hash("password"),
            full_name="Cust 1",
            role=UserRole.CUSTOMER
        )
        customer2 = User(
            email="cust2@test.com",
            hashed_password=get_password_hash("password"),
            full_name="Cust 2",
            role=UserRole.CUSTOMER
        )
        
        # Create a product with ONLY 1 in stock
        product = Product(
            name="Limited Item",
            description="Only one exists",
            price=10.0,
            stock_quantity=1
        )
        
        session.add(owner)
        session.add(customer1)
        session.add(customer2)
        session.add(product)
        session.commit()

def teardown_db():
    SQLModel.metadata.drop_all(engine)

@pytest.fixture(autouse=True)
def manage_db():
    setup_db()
    
    # We override the DB dependency for the app
    from app.core.database import get_session
    def get_test_session():
        with Session(engine) as session:
            yield session
            
    app.dependency_overrides[get_session] = get_test_session
    yield
    app.dependency_overrides.clear()
    teardown_db()

@pytest.mark.asyncio
async def test_concurrent_order_placement():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Login to get tokens
        resp_c1 = await client.post(
            "/auth/login", 
            data={"username": "cust1@test.com", "password": "password"}
        )
        token1 = resp_c1.json()["access_token"]
        
        resp_c2 = await client.post(
            "/auth/login", 
            data={"username": "cust2@test.com", "password": "password"}
        )
        token2 = resp_c2.json()["access_token"]
        
        # 2. Both try to buy the product with id 1 at the EXACT SAME TIME
        order_payload = {
            "items": [
                {"product_id": 1, "quantity": 1}
            ]
        }
        
        # We fire the requests concurrently
        results = await asyncio.gather(
            client.post(
                "/orders/", 
                json=order_payload, 
                headers={"Authorization": f"Bearer {token1}"}
            ),
            client.post(
                "/orders/", 
                json=order_payload, 
                headers={"Authorization": f"Bearer {token2}"}
            )
        )
        
        # 3. Exactly one should succeed, exactly one should fail
        status_codes = [res.status_code for res in results]
        assert 200 in status_codes, f"One request should have succeeded, got {status_codes}"
        assert 400 in status_codes, f"One request should have failed, got {status_codes}"
        
        # 4. Check final stock in DB
        with Session(engine) as session:
            final_product = session.get(Product, 1)
            assert final_product.stock_quantity == 0, "Stock should be exactly 0, never negative"
