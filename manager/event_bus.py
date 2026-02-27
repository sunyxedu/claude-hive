"""In-process pub/sub event bus for SSE streaming."""

import asyncio
import json
from dataclasses import dataclass, field
from typing import AsyncIterator


@dataclass
class Event:
    channel: str
    event_type: str
    data: dict

    def to_sse(self) -> str:
        return f"event: {self.event_type}\ndata: {json.dumps(self.data)}\n\n"


class EventBus:
    """Simple pub/sub: subscribers get an asyncio.Queue per channel."""

    def __init__(self):
        self._subscribers: dict[str, list[asyncio.Queue]] = {}

    async def publish(self, channel: str, event_type: str, data: dict):
        event = Event(channel=channel, event_type=event_type, data=data)
        for queue in self._subscribers.get(channel, []):
            try:
                queue.put_nowait(event)
            except asyncio.QueueFull:
                pass  # drop if subscriber is too slow

    async def subscribe(self, channel: str) -> AsyncIterator[Event]:
        queue: asyncio.Queue[Event] = asyncio.Queue(maxsize=256)
        self._subscribers.setdefault(channel, []).append(queue)
        try:
            while True:
                event = await queue.get()
                yield event
        finally:
            self._subscribers[channel].remove(queue)


# Global singleton
bus = EventBus()
