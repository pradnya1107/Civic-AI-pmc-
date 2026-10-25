import logging
from fastapi import FastAPI, Depends, HTTPException, status
from .config import AI_SERVICE_HOST, AI_SERVICE_PORT, AI_SERVICE_SECRET
from .schemas import AnalyzeRequest, AnalyzeResponse, ClassifyImageRequest
from .security import verify_ai_service_secret
from .providers import get_provider

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("civicai-ai-service")

app = FastAPI(
    title="CivicAI PMC - AI Service",
    description="Internal AI categorization, priority scoring, and summarization service for Pune Municipal Corporation civic complaints.",
    version="1.0.0",
)

@app.get("/health")
async def health_check():
    provider = get_provider()
    return {
        "status": "healthy",
        "service": "civicai-ai-service",
        "provider": provider.name,
        "version": "1.0.0",
    }

@app.post(
    "/analyze",
    response_model=AnalyzeResponse,
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(verify_ai_service_secret)],
)
async def analyze_complaint(request: AnalyzeRequest) -> AnalyzeResponse:
    text = request.get_full_text()
    if not text:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Complaint text cannot be empty",
        )

    provider = get_provider()
    try:
        result = await provider.analyze(request.complaintId, text)
        return result
    except ValueError as e:
        logger.error(f"Validation or configuration error in AI provider: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid request or configuration: {str(e)}",
        )
    except RuntimeError as e:
        logger.error(f"Provider runtime/upstream error: {e}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="AI Provider communication failure",
        )
    except Exception as e:
        logger.error(f"Unexpected error in AI analysis: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal AI service error",
        )

@app.post("/classify-image", status_code=status.HTTP_200_OK)
async def classify_complaint_image(request: ClassifyImageRequest):
    img_data = request.imageUrl or request.imageBase64
    if not img_data or not img_data.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Either imageUrl or imageBase64 must be provided",
        )
    try:
        from .vgg16_classifier import vgg16_civic_classifier
        result = vgg16_civic_classifier.classify(img_data, image_hint=request.hint or "")
        return {
            "success": True,
            "data": result,
        }
    except Exception as e:
        logger.error(f"VGG16 classification failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Image classification error: {str(e)}",
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("services.ai.main:app", host=AI_SERVICE_HOST, port=AI_SERVICE_PORT, reload=False)
