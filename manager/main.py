"""FastAPI application entry point."""

import uvicorn
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from manager.config import settings
from manager.database import init_db, close_db
from manager.services.worker_orchestrator import orchestrator
from manager.services.project_service import ensure_default_project


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await init_db(settings.db_path)
    await ensure_default_project(
        settings.project_dir, settings.project_name, settings.main_branch,
    )
    await orchestrator.start()
    yield
    # Shutdown
    await orchestrator.stop()
    await close_db()


app = FastAPI(
    title="Claude Hive",
    description="Orchestrate multiple Claude Code instances in parallel",
    version="0.1.0",
    lifespan=lifespan,
)

# Routers (imported here to avoid circular imports)
from manager.routers import tasks, workers, stream, system, projects, auth  # noqa: E402

app.include_router(auth.router, prefix="/api")
app.include_router(projects.router, prefix="/api")
app.include_router(tasks.router, prefix="/api")
app.include_router(workers.router, prefix="/api")
app.include_router(stream.router, prefix="/api")
app.include_router(system.router, prefix="/api")

# Serve static files (UI)
static_dir = Path(__file__).parent.parent / "static"
if static_dir.exists():
    app.mount("/", StaticFiles(directory=str(static_dir), html=True), name="static")


def cli():
    uvicorn.run(
        "manager.main:app",
        host=settings.host,
        port=settings.port,
        reload=True,
    )


if __name__ == "__main__":
    cli()
