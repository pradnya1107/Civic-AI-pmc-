import os
from typing import Optional
from dotenv import load_dotenv

load_dotenv()

AI_SERVICE_SECRET = os.getenv("AI_SERVICE_SECRET", "dev-ai-service-secret-change-me")
AI_PROVIDER = os.getenv("AI_PROVIDER", "stub").lower()
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
AI_SERVICE_PORT = int(os.getenv("AI_SERVICE_PORT", "8000"))
AI_SERVICE_HOST = os.getenv("AI_SERVICE_HOST", "0.0.0.0")

VALID_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"]

VALID_CATEGORIES = [
    "Water Supply",
    "Roads & Infrastructure",
    "Waste Management",
    "Electricity",
    "Drainage",
    "Street Lighting",
    "Public Health",
    "Building & Construction",
    "Parks & Gardens",
    "General Administration",
]
