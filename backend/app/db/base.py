# Import all the models here so Alembic can discover them
from app.db.base_class import Base
from app.models.company import Company
from app.models.user import User
from app.models.role import Role
