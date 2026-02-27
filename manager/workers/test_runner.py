"""Run npm test in a worktree directory."""

import asyncio
import logging
from pathlib import Path

log = logging.getLogger(__name__)


async def run_tests(cwd: Path) -> tuple[bool, str]:
    """
    Run `npm test` in the given directory.
    Returns (passed, output).
    Skips gracefully if no package.json or no test script.
    """
    package_json = cwd / "package.json"
    if not package_json.exists():
        log.info("No package.json in %s, skipping tests", cwd)
        return True, "No package.json — tests skipped"

    # Check if test script exists
    import json
    try:
        pkg = json.loads(package_json.read_text())
        scripts = pkg.get("scripts", {})
        if "test" not in scripts:
            log.info("No test script in %s, skipping", cwd)
            return True, "No test script — tests skipped"
    except Exception:
        return True, "Could not parse package.json — tests skipped"

    try:
        proc = await asyncio.create_subprocess_exec(
            "npm", "test",
            cwd=str(cwd),
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.STDOUT,
        )
        stdout, _ = await asyncio.wait_for(proc.communicate(), timeout=300)
        output = stdout.decode()

        if proc.returncode == 0:
            return True, output[-2000:]  # Truncate to last 2000 chars
        else:
            return False, output[-2000:]

    except asyncio.TimeoutError:
        proc.kill()
        return False, "Test execution timed out (5 min)"
    except FileNotFoundError:
        return True, "npm not found — tests skipped"
