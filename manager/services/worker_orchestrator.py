"""Spawn, monitor, and scale worker coroutines."""

import asyncio
import logging
import os

from manager.config import settings
from manager.database import get_db
from manager.event_bus import bus
from manager.workers.worker_loop import worker_loop

log = logging.getLogger(__name__)


class WorkerOrchestrator:
    def __init__(self):
        self._workers: dict[int, asyncio.Task] = {}
        self._stop_events: dict[int, asyncio.Event] = {}
        self._started = False

    async def start(self, count: int | None = None):
        """Register workers in DB and start worker loops."""
        if self._started:
            return
        self._started = True

        count = count or settings.max_workers
        db = get_db()

        for i in range(count):
            name = f"worker-{i}"
            port = settings.worker_port_base + i

            # Upsert worker row
            cursor = await db.execute(
                "SELECT id FROM workers WHERE name = ?", (name,)
            )
            row = await cursor.fetchone()
            if row:
                worker_id = row["id"]
                await db.execute(
                    "UPDATE workers SET status = 'starting', pid = ?, port_base = ? WHERE id = ?",
                    (os.getpid(), port, worker_id),
                )
            else:
                cursor = await db.execute(
                    """INSERT INTO workers (name, status, pid, port_base)
                       VALUES (?, 'starting', ?, ?) RETURNING id""",
                    (name, os.getpid(), port),
                )
                row = await cursor.fetchone()
                worker_id = row["id"]

            await db.commit()

            stop_event = asyncio.Event()
            self._stop_events[worker_id] = stop_event
            self._workers[worker_id] = asyncio.create_task(
                worker_loop(worker_id, stop_event),
                name=f"worker-{worker_id}",
            )

        log.info("Started %d workers", count)

    async def stop(self):
        """Signal all workers to stop and wait for them."""
        for event in self._stop_events.values():
            event.set()

        if self._workers:
            await asyncio.gather(*self._workers.values(), return_exceptions=True)

        self._workers.clear()
        self._stop_events.clear()
        self._started = False

        # Mark all workers idle
        db = get_db()
        await db.execute("UPDATE workers SET status = 'idle', current_task_id = NULL")
        await db.commit()

        log.info("All workers stopped")

    async def get_workers(self) -> list[dict]:
        db = get_db()
        cursor = await db.execute("SELECT * FROM workers ORDER BY id")
        return [dict(r) for r in await cursor.fetchall()]

    async def get_stats(self) -> dict:
        db = get_db()

        cursor = await db.execute("SELECT COUNT(*) as c FROM tasks")
        total = (await cursor.fetchone())["c"]

        cursor = await db.execute("SELECT COUNT(*) as c FROM tasks WHERE status = 'pending'")
        pending = (await cursor.fetchone())["c"]

        cursor = await db.execute("SELECT COUNT(*) as c FROM tasks WHERE status = 'completed'")
        completed = (await cursor.fetchone())["c"]

        cursor = await db.execute("SELECT COUNT(*) as c FROM tasks WHERE status = 'failed'")
        failed = (await cursor.fetchone())["c"]

        cursor = await db.execute("SELECT COUNT(*) as c FROM workers WHERE status = 'busy'")
        active = (await cursor.fetchone())["c"]

        cursor = await db.execute(
            "SELECT COALESCE(SUM(cost_usd), 0) as c, "
            "COALESCE(SUM(tokens_input), 0) as ti, "
            "COALESCE(SUM(tokens_output), 0) as to_ FROM tasks"
        )
        row = await cursor.fetchone()

        return {
            "total_tasks": total,
            "pending_tasks": pending,
            "completed_tasks": completed,
            "failed_tasks": failed,
            "active_workers": active,
            "total_cost_usd": row["c"],
            "total_tokens_input": row["ti"],
            "total_tokens_output": row["to_"],
        }


# Global singleton
orchestrator = WorkerOrchestrator()
