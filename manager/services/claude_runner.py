"""Claude CLI invocation and stream-json parsing."""

import asyncio
import json
import logging
from pathlib import Path
from dataclasses import dataclass, field

from manager.config import settings
from manager.event_bus import bus

log = logging.getLogger(__name__)


@dataclass
class ClaudeResult:
    success: bool = False
    tokens_input: int = 0
    tokens_output: int = 0
    cost_usd: float = 0.0
    error: str = ""
    result_text: str = ""


# Approximate pricing (per million tokens) — update as needed
COST_PER_M_INPUT = 3.0
COST_PER_M_OUTPUT = 15.0


def estimate_cost(tokens_in: int, tokens_out: int) -> float:
    return (tokens_in * COST_PER_M_INPUT + tokens_out * COST_PER_M_OUTPUT) / 1_000_000


async def run_claude(
    prompt: str,
    cwd: Path,
    task_id: int,
    plan_mode: bool = True,
) -> ClaudeResult:
    """
    Run Claude CLI and parse stream-json output.
    Publishes events to the task's SSE channel.
    """
    cmd = [
        settings.claude_cli,
        "-p", prompt,
        "--dangerously-skip-permissions",
        "--output-format", "stream-json",
        "--verbose",
    ]
    if settings.claude_model:
        cmd.extend(["--model", settings.claude_model])

    log.info("Running Claude for task %d in %s", task_id, cwd)
    channel = f"task:{task_id}"

    # Clean env to avoid nested-session detection
    import os
    env = {k: v for k, v in os.environ.items() if k != "CLAUDECODE"}

    try:
        proc = await asyncio.create_subprocess_exec(
            *cmd,
            cwd=str(cwd),
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            env=env,
        )
    except FileNotFoundError:
        return ClaudeResult(error=f"Claude CLI not found: {settings.claude_cli}")

    result = ClaudeResult()
    result_text_parts = []

    try:
        async for line in proc.stdout:
            line = line.decode().strip()
            if not line:
                continue
            try:
                event = json.loads(line)
            except json.JSONDecodeError:
                continue

            event_type = event.get("type", "")

            # Publish raw event for live UI
            await bus.publish(channel, "claude_event", {
                "task_id": task_id,
                "event": event,
            })

            # Track tokens from usage events
            if event_type == "usage":
                usage = event.get("usage", event)
                result.tokens_input += usage.get("input_tokens", 0)
                result.tokens_output += usage.get("output_tokens", 0)

            # Capture assistant text
            if event_type == "assistant" and "message" in event:
                msg = event["message"]
                if isinstance(msg, str):
                    result_text_parts.append(msg)
                elif isinstance(msg, dict):
                    content = msg.get("content", [])
                    for block in content:
                        if isinstance(block, dict) and block.get("type") == "text":
                            result_text_parts.append(block.get("text", ""))

            # Capture result event
            if event_type == "result":
                result_text_parts.append(event.get("result", ""))
                if "usage" in event:
                    u = event["usage"]
                    result.tokens_input = u.get("input_tokens", result.tokens_input)
                    result.tokens_output = u.get("output_tokens", result.tokens_output)
                if "cost" in event:
                    result.cost_usd = event["cost"]

    except Exception as e:
        log.error("Error reading Claude output for task %d: %s", task_id, e)
        result.error = str(e)

    # Wait for process to finish
    _, stderr = await proc.communicate()
    rc = proc.returncode

    result.result_text = "\n".join(result_text_parts)
    if result.cost_usd == 0.0:
        result.cost_usd = estimate_cost(result.tokens_input, result.tokens_output)

    if rc != 0:
        err_text = stderr.decode().strip() if stderr else "Unknown error"
        result.error = err_text
        result.success = False
        log.error("Claude exited with code %d for task %d: %s", rc, task_id, err_text)
    else:
        result.success = True
        log.info("Claude completed task %d: %d in / %d out tokens, $%.4f",
                 task_id, result.tokens_input, result.tokens_output, result.cost_usd)

    await bus.publish(channel, "claude_done", {
        "task_id": task_id,
        "success": result.success,
        "tokens_input": result.tokens_input,
        "tokens_output": result.tokens_output,
        "cost_usd": result.cost_usd,
    })

    return result
