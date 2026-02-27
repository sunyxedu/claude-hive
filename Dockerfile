FROM python:3.12-slim

# Install Node.js (for npm test in worktrees) and git
RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    curl \
    && curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && rm -rf /var/lib/apt/lists/*

# Install Claude CLI
RUN npm install -g @anthropic-ai/claude-code

WORKDIR /app

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY manager/ manager/
COPY static/ static/
COPY templates/ templates/

EXPOSE 8420

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
    CMD curl -f http://localhost:8420/api/health || exit 1

CMD ["python", "-m", "uvicorn", "manager.main:app", "--host", "0.0.0.0", "--port", "8420"]
