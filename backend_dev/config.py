from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    jwt_secret: str = "secret"
    jwt_expire: str = "7d"
    api_port: int = 5000
    frontend_url: str = "http://localhost:5173"

    class Config:
        env_file = ".env"
        case_sensitive = False

settings = Settings()
