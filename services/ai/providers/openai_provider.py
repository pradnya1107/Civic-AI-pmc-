import json
import logging
from typing import Optional
import httpx
from .base import BaseAIProvider
from ..config import OPENAI_API_KEY, OPENAI_MODEL, VALID_CATEGORIES, VALID_PRIORITIES
from ..schemas import AnalyzeResponse

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = f"""You are the Civic AI classification assistant for Pune Municipal Corporation (PMC).
Given a citizen's complaint text, you must analyze and return a strictly valid JSON object with the following fields:
- "category": must be one of {json.dumps(VALID_CATEGORIES)}
- "priority": must be one of {json.dumps(VALID_PRIORITIES)}
- "summary": a clear, objective plain-language summary of the issue (1 to 2 sentences)
- "confidence": a float between 0.0 and 1.0 representing your classification confidence

Only return the JSON object, with no markdown formatting or extraneous text.
"""

class OpenAIProvider(BaseAIProvider):
    def __init__(self, api_key: Optional[str] = None, model: Optional[str] = None):
        self.api_key = api_key or OPENAI_API_KEY
        self.model = model or OPENAI_MODEL

        if not self.api_key:
            raise ValueError("OPENAI_API_KEY is required to initialize OpenAIProvider")

    @property
    def name(self) -> str:
        return f"openai_{self.model}"

    async def analyze(self, complaint_id: str, text: str) -> AnalyzeResponse:
        url = "https://api.openai.com/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": f"Complaint ID: {complaint_id}\nComplaint Text: {text}"},
            ],
            "response_format": {"type": "json_object"},
            "temperature": 0.2,
        }

        async with httpx.AsyncClient(timeout=10.0) as client:
            try:
                response = await client.post(url, json=payload, headers=headers)
                response.raise_for_status()
            except httpx.HTTPStatusError as e:
                logger.error(f"OpenAI API error: {e.response.status_code} - {e.response.text}")
                raise RuntimeError(f"OpenAI API responded with status {e.response.status_code}") from e
            except httpx.RequestError as e:
                logger.error(f"OpenAI network error: {str(e)}")
                raise RuntimeError(f"Failed to communicate with OpenAI API: {str(e)}") from e

        data = response.json()
        raw_content = data["choices"][0]["message"]["content"]
        parsed = json.loads(raw_content)

        category = parsed.get("category", "General Administration")
        if category not in VALID_CATEGORIES:
            category = "General Administration"

        priority = parsed.get("priority", "MEDIUM")
        if priority not in VALID_PRIORITIES:
            priority = "MEDIUM"

        summary = parsed.get("summary", text[:120].strip())
        confidence = float(parsed.get("confidence", 0.85))
        confidence = min(max(confidence, 0.0), 1.0)

        return AnalyzeResponse(
            category=category,
            priority=priority,
            summary=summary,
            confidence=round(confidence, 2),
            modelVersion=f"openai-{self.model}",
        )
