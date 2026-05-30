"""Env-backed settings. Single source of truth — every module imports
`settings` from here, never reads `os.environ` directly."""

from __future__ import annotations

from functools import lru_cache
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # `extra="ignore"` lets you keep unrelated keys in .env without
    # the loader complaining. `protected_namespaces=()` quiets the
    # pydantic-v2 warning about `model_name` colliding with the
    # reserved `model_` namespace — we own this Settings class, the
    # collision is cosmetic.
    model_config = SettingsConfigDict(
        env_file=".env",
        extra="ignore",
        protected_namespaces=(),
    )

    # ── Server ────────────────────────────────────────────────
    port: int = 8000

    # ── Model ─────────────────────────────────────────────────
    model_name: str = "qwen2.5:7b-instruct-q4_K_M"
    ollama_host: str = "127.0.0.1:11434"

    # ── Inference tuning ──────────────────────────────────────
    # Budget at 8192-token context (default):
    #   ~80 system + ~5000 page + ~200 schema + ~600 few-shot +
    #   ~1024 output, ~1300 headroom.
    # Holds Qwen2.5-7B Q4_K_M in ~5.4 GB total — fits inside
    # Docker Desktop's default ~5.9 GB free.
    max_page_tokens: int = 5_000
    llm_temperature: float = 0.1
    llm_top_p: float = 0.9
    # Output budget. Bumped down from 2048 because product JSON is
    # tiny (~50–200 tokens) and reserving 2K cuts into input space.
    llm_max_tokens: int = 1024
    # Ollama defaults this to 2048 which silently truncates prompts.
    # Bump up only if you've raised Docker Desktop's VM memory
    # (Settings → Resources): 12288 needs ~5.7 GB free, 16384 needs
    # ~6.3 GB free, 32768 needs ~9 GB free.
    llm_num_ctx: int = 8192

    # ── Database ──────────────────────────────────────────────
    database_url: str

    # ── Few-shot ──────────────────────────────────────────────
    embedding_model: str = "BAAI/bge-small-en-v1.5"
    few_shot_k: int = 2
    few_shot_min_sim: float = 0.55

    # ── Fetcher ───────────────────────────────────────────────
    user_agent: str = "Mozilla/5.0 (compatible; web-page-extractor-llm/1.0)"
    fetch_timeout_s: int = 15
    always_render_js: bool = False

    # ── Validation ────────────────────────────────────────────
    max_validation_retries: int = 2

    # ── Auth ──────────────────────────────────────────────────
    api_token: str | None = Field(default=None)

    @field_validator("database_url")
    @classmethod
    def _reject_placeholder_dsn(cls, v: str) -> str:
        """Fail fast with a clear message when the .env.example
        placeholder leaks into a real environment. asyncpg's generic
        `socket.gaierror` is hard to diagnose otherwise."""
        if "user:pass@host" in v or v.endswith("@host:5432/web-page-extractor-llm"):
            raise ValueError(
                "DATABASE_URL still has the .env.example placeholder "
                "(user:pass@host:5432/...). Either set a real DSN in "
                ".env, or delete .env to use docker-compose's bundled "
                "postgres (postgres://wpe:wpe@postgres:5432/wpe)."
            )
        return v

    @property
    def ollama_base_url(self) -> str:
        return f"http://{self.ollama_host}"


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()  # type: ignore[call-arg]


settings = get_settings()
