"""Port allocation for worker dev servers."""

import asyncio

from manager.config import settings


class PortAllocator:
    """Assigns unique ports to workers from a pool."""

    def __init__(self):
        self._in_use: set[int] = set()
        self._lock = asyncio.Lock()

    async def allocate(self) -> int | None:
        async with self._lock:
            for offset in range(settings.max_workers):
                port = settings.worker_port_base + offset
                if port not in self._in_use:
                    self._in_use.add(port)
                    return port
        return None

    async def release(self, port: int):
        async with self._lock:
            self._in_use.discard(port)

    @property
    def active_count(self) -> int:
        return len(self._in_use)


# Global singleton
port_allocator = PortAllocator()
