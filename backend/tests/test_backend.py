import os
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Setup test database
from app.database import Base, get_db
from app.main import app
from app.config import settings

from sqlalchemy.pool import StaticPool

TEST_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(
    TEST_DATABASE_URL, 
    connect_args={"check_same_thread": False},
    poolclass=StaticPool
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Override get_db dependency
def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

@pytest.fixture(scope="module", autouse=True)
def setup_database():
    # Create tables
    Base.metadata.create_all(bind=engine)
    
    # Seed test users
    from app.crud import create_user
    from app.schemas import UserCreate
    db = TestingSessionLocal()
    try:
        create_user(db, UserCreate(name="Test Citizen", email="testcitizen@civicsense.ai", password="password123", role="Citizen"))
        create_user(db, UserCreate(name="Test Officer", email="testofficer@civicsense.ai", password="password123", role="Authority"))
    finally:
        db.close()
        
    yield
    
    # Tear down
    Base.metadata.drop_all(bind=engine)
    engine.dispose()

client = TestClient(app)

def auth_header(email="testcitizen@civicsense.ai", password="password123"):
    response = client.post("/api/login", json={"email": email, "password": password})
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

def test_login_success():
    response = client.post(
        "/api/login",
        json={"email": "testcitizen@civicsense.ai", "password": "password123"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["role"] == "Citizen"
    assert data["email"] == "testcitizen@civicsense.ai"

def test_login_failure():
    response = client.post(
        "/api/login",
        json={"email": "testcitizen@civicsense.ai", "password": "wrongpassword"}
    )
    assert response.status_code == 401
    assert response.json()["detail"] == "Incorrect email or password"


def test_login_includes_cors_headers_for_local_frontend():
    response = client.post(
        "/api/login",
        json={"email": "testcitizen@civicsense.ai", "password": "password123"},
        headers={"Origin": "http://127.0.0.1:5173"},
    )
    assert response.status_code == 200
    assert response.headers.get("access-control-allow-origin") == "http://127.0.0.1:5173"

def test_get_violations():
    response = client.get("/api/violations", headers=auth_header())
    assert response.status_code == 200
    assert isinstance(response.json(), list)

def test_get_dashboard():
    response = client.get("/api/dashboard", headers=auth_header())
    assert response.status_code == 200
    data = response.json()
    assert "total_violations" in data
    assert "illegal_parking" in data
    assert "recent_reports" in data

def test_get_analytics():
    response = client.get("/api/analytics", headers=auth_header())
    assert response.status_code == 200
    data = response.json()
    assert "violation_trends" in data
    assert "status_distribution" in data

def test_auth_protected_routes():
    # Try updating a violation status without auth header
    response = client.put(
        "/api/violations/1",
        json={"review_status": "Approved"}
    )
    assert response.status_code == 401 # Unauthorized
