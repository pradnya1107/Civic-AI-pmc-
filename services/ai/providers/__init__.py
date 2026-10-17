import logging
from typing import Optional
from .base import BaseAIProvider
from .stub import LocalStubProvider
from .openai_provider import OpenAIProvider
from ..config import AI_PROVIDER, OPENAI_API_KEY, OPENAI_MODEL

logger = logging.getLogger(__name__)

def get_provider(provider_type: Optional[str] = None) -> BaseAIProvider:
    selected = (provider_type or AI_PROVIDER).lower()

    if selected == "openai":
        if OPENAI_API_KEY:
            try:
                return OpenAIProvider(api_key=OPENAI_API_KEY, model=OPENAI_MODEL)
            except Exception as e:
                logger.warning(f"Failed to initialize OpenAIProvider: {e}. Falling back to LocalStubProvider.")
        else:
            logger.warning("OPENAI_API_KEY is not configured. Falling back to LocalStubProvider.")

    return LocalStubProvider()
