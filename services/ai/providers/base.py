from abc import ABC, abstractmethod
from ..schemas import AnalyzeResponse

class BaseAIProvider(ABC):
    @property
    @abstractmethod
    def name(self) -> str:
        """Provider name identification."""
        pass

    @abstractmethod
    async def analyze(self, complaint_id: str, text: str) -> AnalyzeResponse:
        """Analyze complaint text and return structured category, priority, summary, confidence, and modelVersion."""
        pass
