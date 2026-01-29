import jwt
from datetime import datetime, timedelta
from config import settings

def generate_token(user_id: str, email: str) -> str:
    """Generate JWT token"""
    secret = settings.jwt_secret
    expire_time = settings.jwt_expire
    
    # Parse expiration time
    if expire_time.endswith('d'):
        days = int(expire_time[:-1])
        expires_in = timedelta(days=days)
    elif expire_time.endswith('h'):
        hours = int(expire_time[:-1])
        expires_in = timedelta(hours=hours)
    else:
        expires_in = timedelta(days=7)
    
    payload = {
        "id": user_id,
        "email": email,
        "exp": datetime.utcnow() + expires_in,
        "iat": datetime.utcnow(),
    }
    
    token = jwt.encode(payload, secret, algorithm="HS256")
    return token

def verify_token(token: str) -> dict:
    """Verify JWT token"""
    try:
        secret = settings.jwt_secret
        payload = jwt.decode(token, secret, algorithms=["HS256"])
        return payload
    except jwt.ExpiredSignatureError:
        raise ValueError("Token has expired")
    except jwt.InvalidTokenError:
        raise ValueError("Invalid token")
