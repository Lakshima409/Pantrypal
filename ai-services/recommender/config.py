# ai-services/recommender/config.py
# Reads DB settings from environment, falling back to server/.env so both
# services share one source of truth (blueprint §27 — no secrets in code).
import os
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]  # repo root (…/recipe-suggester-system)
ENV_FILE = ROOT / "server" / ".env"


def _parse_env_file():
    values = {}
    if ENV_FILE.exists():
        for line in ENV_FILE.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, val = line.partition("=")
            values[key.strip()] = val.strip()
    return values


def get(key, default=""):
    """Environment variable first, then server/.env, then default."""
    return os.environ.get(key) or _parse_env_file().get(key, default)


DB_CONFIG = {
    "host": get("DB_HOST", "localhost"),
    "port": int(get("DB_PORT", "3306") or 3306),
    "user": get("DB_USER", "root"),
    "password": get("DB_PASS", ""),
    "database": get("DB_NAME", "recipe_db"),
    "charset": "utf8mb4",
    "autocommit": True,
}

PORT = int(get("AI_RECOMMENDER_PORT", "5001") or 5001)
