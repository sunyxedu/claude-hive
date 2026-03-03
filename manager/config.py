"""Environment-based configuration."""

from pathlib import Path

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Project being managed
    project_dir: Path = Path(".")
    project_name: str = "my-project"

    # Server
    host: str = "0.0.0.0"
    port: int = 8420

    # Workers
    max_workers: int = 3
    worker_port_base: int = 5200

    # Claude CLI
    claude_cli: str = "claude"
    claude_model: str = ""  # empty = use default
    plan_mode_default: bool = True  # require plan approval by default

    # Git
    main_branch: str = "main"
    auto_push: bool = False

    # GitHub OAuth
    github_client_id: str = ""
    github_client_secret: str = ""

    # Paths (derived from project_dir)
    @property
    def vibe_dir(self) -> Path:
        return self.project_dir / ".vibe-manager"

    @property
    def db_path(self) -> Path:
        return self.vibe_dir / "vibe.db"

    @property
    def worktrees_dir(self) -> Path:
        return self.vibe_dir / "worktrees"

    model_config = {"env_prefix": "HIVE_"}


settings = Settings()
