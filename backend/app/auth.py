import jwt
import logging
from datetime import datetime, timedelta
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from .config import settings
from .database import get_db
from . import models, schemas

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("Auth")

# Try to use bcrypt for password hashing, fall back to hashlib if import fails
try:
    import bcrypt
    HAS_BCRYPT = True
except ImportError:
    import hashlib
    logger.warning("bcrypt not installed. Falling back to SHA-256 with salt.")
    HAS_BCRYPT = False

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/login")

def hash_password(password: str) -> str:
    """
    Hashes a password.
    """
    if HAS_BCRYPT:
        salt = bcrypt.gensalt()
        hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
        return hashed.decode('utf-8')
    else:
        # Simple SHA-256 fallback with static salt
        salt = "civicsense_static_salt_2026"
        hashed = hashlib.sha256((password + salt).encode('utf-8')).hexdigest()
        return f"sha256${hashed}"

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verifies a plain password against the hashed version.
    """
    if HAS_BCRYPT and not hashed_password.startswith("sha256$"):
        try:
            return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))
        except Exception:
            # Fall back if check fails due to format mismatch
            pass
            
    # SHA-256 check
    salt = "civicsense_static_salt_2026"
    expected = hashlib.sha256((plain_password + salt).encode('utf-8')).hexdigest()
    if hashed_password.startswith("sha256$"):
        return hashed_password == f"sha256${expected}"
    else:
        # Fallback to direct comparison or general hash
        return expected == hashed_password

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    Creates a JWT access token.
    """
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> models.User:
    """
    Retrieves the current authenticated user from JWT token.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except jwt.PyJWTError:
        raise credentials_exception
        
    user = db.query(models.User).filter(models.User.email == email).first()
    if user is None:
        raise credentials_exception
    return user

def require_role(allowed_roles: list):
    """
    Dependency generator to check if the current user has one of the allowed roles.
    """
    def dependency(current_user: models.User = Depends(get_current_user)):
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Operation not permitted. Required roles: {allowed_roles}"
            )
        return current_user
    return dependency

# Quick role check helpers
get_authority_user = require_role(["Authority", "Admin"])
get_admin_user = require_role(["Admin"])
