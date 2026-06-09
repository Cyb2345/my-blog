from fastapi import APIRouter

from app.utils.response import ok

router = APIRouter(tags=["health"])


@router.get("/health")
def health_check():
    return ok({"status": "healthy"}, message="ok")
