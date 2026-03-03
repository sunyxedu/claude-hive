"""GitHub OAuth and repo operations."""

import asyncio
import secrets
from pathlib import Path

import httpx

from manager.config import settings
from manager.database import get_db

REPOS_DIR = Path(__file__).resolve().parent.parent.parent / "repos"

# In-memory state store (single-user local tool)
_pending_states: dict[str, str] = {}


def get_oauth_url(redirect: str) -> str:
    """Build GitHub authorize URL with CSRF state."""
    state = secrets.token_urlsafe(32)
    _pending_states[state] = redirect
    params = (
        f"client_id={settings.github_client_id}"
        f"&redirect_uri=http://localhost:{settings.port}/api/auth/github/callback"
        f"&scope=repo"
        f"&state={state}"
    )
    return f"https://github.com/login/oauth/authorize?{params}"


def validate_state(state: str) -> str | None:
    """Validate and consume a CSRF state, returning the original redirect URL."""
    return _pending_states.pop(state, None)


async def exchange_code(code: str) -> str:
    """Exchange authorization code for access token."""
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            "https://github.com/login/oauth/access_token",
            json={
                "client_id": settings.github_client_id,
                "client_secret": settings.github_client_secret,
                "code": code,
            },
            headers={"Accept": "application/json"},
        )
        resp.raise_for_status()
        data = resp.json()
        if "error" in data:
            raise ValueError(f"GitHub OAuth error: {data['error_description']}")
        return data["access_token"]


async def get_github_user(token: str) -> dict:
    """Fetch authenticated user info from GitHub."""
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            "https://api.github.com/user",
            headers={
                "Authorization": f"Bearer {token}",
                "Accept": "application/vnd.github+json",
            },
        )
        resp.raise_for_status()
        return resp.json()


async def list_repos(token: str, page: int = 1, per_page: int = 30) -> list[dict]:
    """List authenticated user's repos."""
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            "https://api.github.com/user/repos",
            params={
                "sort": "updated",
                "direction": "desc",
                "per_page": per_page,
                "page": page,
                "affiliation": "owner,collaborator,organization_member",
            },
            headers={
                "Authorization": f"Bearer {token}",
                "Accept": "application/vnd.github+json",
            },
        )
        resp.raise_for_status()
        return resp.json()


async def search_repos(token: str, query: str) -> list[dict]:
    """Search user's repos by name."""
    async with httpx.AsyncClient() as client:
        # Get user login for the query
        user = await get_github_user(token)
        login = user["login"]
        resp = await client.get(
            "https://api.github.com/search/repositories",
            params={"q": f"{query} user:{login}", "per_page": 30, "sort": "updated"},
            headers={
                "Authorization": f"Bearer {token}",
                "Accept": "application/vnd.github+json",
            },
        )
        resp.raise_for_status()
        return resp.json().get("items", [])


async def clone_repo(token: str, full_name: str, branch: str = "") -> Path:
    """Clone a repo into repos/<name> using token auth."""
    REPOS_DIR.mkdir(parents=True, exist_ok=True)
    repo_name = full_name.split("/")[-1]
    target = REPOS_DIR / repo_name

    if target.exists():
        raise FileExistsError(f"Directory already exists: {target}")

    clone_url = f"https://x-access-token:{token}@github.com/{full_name}.git"
    cmd = ["git", "clone", clone_url, str(target)]
    if branch:
        cmd.extend(["-b", branch])

    proc = await asyncio.create_subprocess_exec(
        *cmd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    _, stderr = await proc.communicate()
    if proc.returncode != 0:
        raise RuntimeError(f"git clone failed: {stderr.decode().strip()}")

    return target


async def get_stored_auth() -> dict | None:
    """Read stored GitHub auth from DB."""
    db = get_db()
    cursor = await db.execute(
        "SELECT github_user_id, github_username, github_avatar, access_token FROM github_auth LIMIT 1"
    )
    row = await cursor.fetchone()
    return dict(row) if row else None


async def store_auth(user_data: dict, token: str) -> dict:
    """Upsert GitHub auth into DB (single-row)."""
    db = get_db()
    await db.execute("DELETE FROM github_auth")
    await db.execute(
        """INSERT INTO github_auth (id, github_user_id, github_username, github_avatar, access_token)
           VALUES (1, ?, ?, ?, ?)""",
        (
            str(user_data["id"]),
            user_data["login"],
            user_data.get("avatar_url", ""),
            token,
        ),
    )
    await db.commit()
    return {
        "github_user_id": str(user_data["id"]),
        "github_username": user_data["login"],
        "github_avatar": user_data.get("avatar_url", ""),
    }


async def clear_auth():
    """Delete stored GitHub auth."""
    db = get_db()
    await db.execute("DELETE FROM github_auth")
    await db.commit()
