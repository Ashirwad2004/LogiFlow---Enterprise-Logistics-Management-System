# Import all the models here so Alembic can discover them
from app.db.base_class import Base
from app.models.company import Company
from app.models.user import User
from app.models.role import Role
from app.models.customer import Customer
from app.models.vehicle import Vehicle
from app.models.driver import Driver
from app.models.warehouse import Warehouse
from app.models.shipment import Shipment, ShipmentItem, ShipmentTracking
