from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "LogiFlow API"
    API_V1_STR: str = "/api/v1"
    
    SYNC_DATABASE_URL: str

    @property
    def SQLALCHEMY_DATABASE_URI(self) -> str:
        return self.SYNC_DATABASE_URL

    SECRET_KEY: str = "change-me-later-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 8

    model_config = {
        "env_file": ".env",
        "case_sensitive": True,
        "extra": "ignore"
    }

settings = Settings()
