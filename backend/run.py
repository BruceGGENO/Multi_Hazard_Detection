"""python -m backend.run: load the root local environment and bind loopback."""
from pathlib import Path

import uvicorn

if __name__ == "__main__":
    environment = Path(__file__).resolve().parents[1] / ".env.local"
    if not environment.is_file():
        raise SystemExit("Create .env.local from .env.example and configure the local service secret first.")
    uvicorn.run("backend.main:app", host="127.0.0.1", port=8000, env_file=str(environment))
