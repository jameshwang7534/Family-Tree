from pathlib import Path
from pydantic_settings import BaseSettings
from supabase import create_client, Client

# Load .env from backend_dev folder
_env_file = Path(__file__).resolve().parent / ".env"


class Settings(BaseSettings):
    jwt_secret: str = "secret"
    jwt_expire: str = "7d"
    api_port: int = 5000
    frontend_url: str = "http://localhost:5173"
    supabase_url: str = ""
    supabase_service_key: str = ""

    model_config = {"env_file": _env_file, "extra": "ignore", "case_sensitive": False}


settings = Settings()


def get_supabase() -> Client:
    if not settings.supabase_url or not settings.supabase_service_key:
        raise RuntimeError("SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in .env")
    key = settings.supabase_service_key.strip()
    # Supabase Python client requires the JWT-style key (starts with eyJ), not sb_secret_*
    if not key.startswith("eyJ"):
        raise RuntimeError(
            "SUPABASE_SERVICE_KEY must be the service_role JWT from Supabase "
            "(long key starting with eyJ...). Get it from: Dashboard → Project Settings → API → service_role (secret)."
        )
    return create_client(settings.supabase_url, key)
