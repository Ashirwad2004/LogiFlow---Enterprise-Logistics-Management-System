from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.config import settings

engine = create_engine(
    settings.SQLALCHEMY_DATABASE_URI,
    pool_pre_ping=True,
    pool_recycle=300,
    pool_size=3,
    max_overflow=2
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
