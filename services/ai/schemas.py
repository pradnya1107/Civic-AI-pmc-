from typing import Optional, Literal
from pydantic import BaseModel, Field, model_validator
from .config import VALID_PRIORITIES, VALID_CATEGORIES

PriorityType = Literal["LOW", "MEDIUM", "HIGH", "CRITICAL"]

class AnalyzeRequest(BaseModel):
    complaintId: str = Field(..., description="Unique identifier for the complaint")
    complaintText: Optional[str] = Field(None, description="Complaint text body")
    text: Optional[str] = Field(None, description="Alternative field for complaint text")
    title: Optional[str] = Field(None, description="Complaint title")
    description: Optional[str] = Field(None, description="Complaint description")

    @model_validator(mode="after")
    def validate_content(self) -> "AnalyzeRequest":
        raw_text = self.get_full_text()
        if not raw_text or not raw_text.strip():
            raise ValueError("Complaint text or description must be provided and cannot be empty")
        return self

    def get_full_text(self) -> str:
        parts = []
        if self.complaintText and self.complaintText.strip():
            parts.append(self.complaintText.strip())
        elif self.text and self.text.strip():
            parts.append(self.text.strip())
        else:
            if self.title and self.title.strip():
                parts.append(self.title.strip())
            if self.description and self.description.strip():
                parts.append(self.description.strip())
        return " - ".join(parts) if parts else ""

class AnalyzeResponse(BaseModel):
    category: str = Field(..., description="Suggested municipal department or category")
    priority: PriorityType = Field(..., description="Suggested complaint priority")
    summary: str = Field(..., min_length=5, max_length=1000, description="Plain-language summary of the complaint")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Confidence score between 0.0 and 1.0")
    modelVersion: str = Field(..., description="Identifier of the AI model or provider version")
