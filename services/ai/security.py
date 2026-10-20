import secrets
from typing import Optional
from fastapi import Header, HTTPException, status
from .config import AI_SERVICE_SECRET

async def verify_ai_service_secret(
    x_ai_service_secret: Optional[str] = Header(None, alias="X-AI-Service-Secret"),
    authorization: Optional[str] = Header(None, alias="Authorization"),
) -> None:
    token: Optional[str] = None
    if x_ai_service_secret:
        token = x_ai_service_secret.strip()
    elif authorization and authorization.lower().startswith("bearer "):
        token = authorization[7:].strip()

    if not token or not AI_SERVICE_SECRET:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unauthorized: Missing AI service authentication secret",
        )

    # Constant-time comparison to prevent timing attacks
    if not secrets.compare_digest(token, AI_SERVICE_SECRET):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unauthorized: Invalid AI service secret",
        )
