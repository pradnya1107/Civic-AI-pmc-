import re
from typing import Tuple
from .base import BaseAIProvider
from ..schemas import AnalyzeResponse

class LocalStubProvider(BaseAIProvider):
    @property
    def name(self) -> str:
        return "local_stub"

    async def analyze(self, complaint_id: str, text: str) -> AnalyzeResponse:
        cleaned_text = text.strip()
        lower_text = cleaned_text.lower()

        category, cat_confidence = self._classify_category(lower_text)
        priority, prio_confidence = self._classify_priority(lower_text)
        summary = self._generate_summary(cleaned_text, category, priority)
        confidence = round((cat_confidence + prio_confidence) / 2.0, 2)

        return AnalyzeResponse(
            category=category,
            priority=priority,
            summary=summary,
            confidence=min(max(confidence, 0.50), 0.98),
            modelVersion="stub-v1.0.0",
        )

    def _classify_category(self, text: str) -> Tuple[str, float]:
        rules = [
            (
                "Water Supply",
                ["water", "leak", "pipe", "pipeline", "tap", "drinking water", "water contamination", "tanker", "low pressure"],
                0.94,
            ),
            (
                "Roads & Infrastructure",
                ["pothole", "road", "tar", "asphalt", "flyover", "bridge", "divider", "footpath", "speed breaker", "pavement"],
                0.93,
            ),
            (
                "Waste Management",
                ["garbage", "trash", "waste", "dustbin", "dumping", "litter", "debris", "debris dumping", "sweeper", "cleaning"],
                0.92,
            ),
            (
                "Drainage",
                ["drain", "drainage", "gutter", "sewage", "sewer", "waterlogging", "clogged drain", "manhole", "overflowing drain"],
                0.93,
            ),
            (
                "Street Lighting",
                ["street light", "streetlight", "dark street", "lamp", "lamp post", "light pole", "street lamp"],
                0.92,
            ),
            (
                "Electricity",
                ["electricity", "power outage", "electric wire", "short circuit", "sparking", "transformer", "voltage", "current"],
                0.91,
            ),
            (
                "Public Health",
                ["mosquito", "dengue", "malaria", "health", "hospital", "dead animal", "carcass", "sanitation", "infection", "clinic"],
                0.91,
            ),
            (
                "Building & Construction",
                ["illegal construction", "unauthorized construction", "building violation", "encroachment", "demolition", "builder"],
                0.90,
            ),
            (
                "Parks & Gardens",
                ["park", "garden", "tree", "fallen tree", "tree branch", "grass", "lawn", "children play area"],
                0.90,
            ),
        ]

        for category, keywords, conf in rules:
            for kw in keywords:
                if re.search(r"\b" + re.escape(kw) + r"\b", text):
                    return category, conf

        return "General Administration", 0.70

    def _classify_priority(self, text: str) -> Tuple[str, float]:
        critical_keywords = [
            "danger", "fatal", "emergency", "burst pipe", "open manhole", "live wire",
            "sparking wire", "collapse", "severe accident", "accident", "death", "hazard", "life threatening"
        ]
        for kw in critical_keywords:
            if re.search(r"\b" + re.escape(kw) + r"\b", text):
                return "CRITICAL", 0.95

        high_keywords = [
            "urgent", "overflowing", "contamination", "waterlogging", "major", "hospital",
            "school", "deep pothole", "dengue", "epidemic", "stagnant water", "blockage", "heavy leak"
        ]
        for kw in high_keywords:
            if re.search(r"\b" + re.escape(kw) + r"\b", text):
                return "HIGH", 0.88

        low_keywords = [
            "minor", "request", "suggestion", "paint", "cosmetic", "faded", "cleaning inquiry"
        ]
        for kw in low_keywords:
            if re.search(r"\b" + re.escape(kw) + r"\b", text):
                return "LOW", 0.85

        return "MEDIUM", 0.80

    def _generate_summary(self, text: str, category: str, priority: str) -> str:
        # First sentence or first ~160 chars
        sentences = [s.strip() for s in re.split(r"[.!?\n]+", text) if s.strip()]
        lead = sentences[0] if sentences else text[:120].strip()
        if len(lead) > 160:
            lead = lead[:157] + "..."

        return f"Issue regarding {category} (Priority: {priority}): {lead}"
