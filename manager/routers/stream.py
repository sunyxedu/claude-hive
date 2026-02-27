"""SSE streaming endpoints."""

from fastapi import APIRouter

router = APIRouter(prefix="/stream", tags=["stream"])
