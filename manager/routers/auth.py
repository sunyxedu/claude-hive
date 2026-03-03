"""GitHub OAuth and repo endpoints."""

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import RedirectResponse

from manager.config import settings
from manager.models import GitHubUser, RepoInfo, CloneRequest, ProjectCreate
from manager.services import github_service, project_service

router = APIRouter(tags=["auth", "github"])


@router.get("/auth/github/url")
async def github_auth_url(redirect: str = Query(default="/")):
    if not settings.github_client_id:
        raise HTTPException(500, "HIVE_GITHUB_CLIENT_ID not configured")
    url = github_service.get_oauth_url(redirect)
    return {"url": url}


@router.get("/auth/github/callback")
async def github_callback(code: str, state: str):
    redirect = github_service.validate_state(state)
    if redirect is None:
        raise HTTPException(400, "Invalid or expired state")

    try:
        token = await github_service.exchange_code(code)
        user_data = await github_service.get_github_user(token)
        await github_service.store_auth(user_data, token)
    except Exception as e:
        raise HTTPException(400, f"GitHub auth failed: {e}")

    return RedirectResponse(url=redirect, status_code=302)


@router.get("/auth/me")
async def auth_me():
    auth = await github_service.get_stored_auth()
    if not auth:
        return {"logged_in": False}
    return GitHubUser(
        github_username=auth["github_username"],
        github_avatar=auth["github_avatar"],
    )


@router.post("/auth/logout", status_code=204)
async def logout():
    await github_service.clear_auth()


@router.get("/github/repos", response_model=list[RepoInfo])
async def list_github_repos(page: int = 1, search: str = ""):
    auth = await github_service.get_stored_auth()
    if not auth:
        raise HTTPException(401, "Not logged in to GitHub")

    token = auth["access_token"]
    try:
        if search.strip():
            raw = await github_service.search_repos(token, search.strip())
        else:
            raw = await github_service.list_repos(token, page)
    except Exception as e:
        raise HTTPException(502, f"GitHub API error: {e}")

    return [
        RepoInfo(
            full_name=r["full_name"],
            name=r["name"],
            description=r.get("description"),
            private=r.get("private", False),
            default_branch=r.get("default_branch", "main"),
            html_url=r.get("html_url", ""),
        )
        for r in raw
    ]


@router.post("/github/clone")
async def clone_github_repo(req: CloneRequest):
    auth = await github_service.get_stored_auth()
    if not auth:
        raise HTTPException(401, "Not logged in to GitHub")

    token = auth["access_token"]
    try:
        target = await github_service.clone_repo(token, req.full_name, req.branch)
    except FileExistsError as e:
        raise HTTPException(409, str(e))
    except RuntimeError as e:
        raise HTTPException(500, str(e))

    # Auto-create project from cloned repo
    repo_name = req.full_name.split("/")[-1]
    branch = req.branch or "main"
    try:
        project = await project_service.create_project(
            ProjectCreate(name=repo_name, path=str(target), main_branch=branch)
        )
    except Exception:
        # Project creation failed (maybe duplicate) — clone still succeeded
        project = None

    return {
        "path": str(target),
        "project": project,
        "message": f"Cloned {req.full_name} to {target}",
    }
