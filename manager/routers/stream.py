"""SSE streaming endpoints."""

from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from manager.event_bus import bus

router = APIRouter(prefix="/stream", tags=["stream"])


async def _sse_generator(channel: str):
    """Generate SSE events from a channel subscription."""
    yield "event: connected\ndata: {}\n\n"
    async for event in bus.subscribe(channel):
        yield event.to_sse()


@router.get("/board")
async def stream_board():
    """SSE stream of board-level events (task/worker status changes)."""
    return StreamingResponse(
        _sse_generator("board"),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/task/{task_id}")
async def stream_task(task_id: int):
    """SSE stream of events for a specific task (live Claude output)."""
    return StreamingResponse(
        _sse_generator(f"task:{task_id}"),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
