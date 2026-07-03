from fastapi import APIRouter

from app.api.v1.endpoints import auth
from app.api.v1.endpoints import shipments
from app.api.v1.endpoints import tracking
from app.api.v1.endpoints import fleet
from app.api.v1.endpoints import billing
from app.api.v1.endpoints import analytics
from app.api.v1.endpoints import customers
from app.api.v1.endpoints import warehouses
from app.api.v1.endpoints import audit_logs
from app.api.v1.endpoints import notifications
from app.api.v1.endpoints import saas

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(customers.router, prefix="/customers", tags=["customers"])
api_router.include_router(shipments.router, prefix="/shipments", tags=["shipments"])
api_router.include_router(tracking.router, prefix="/tracking", tags=["tracking"])
api_router.include_router(fleet.router, prefix="/fleet", tags=["fleet"])
api_router.include_router(billing.router, prefix="/billing", tags=["billing"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["analytics"])
api_router.include_router(warehouses.router, prefix="/warehouses", tags=["warehouses"])
api_router.include_router(audit_logs.router, prefix="/audit-logs", tags=["audit-logs"])
api_router.include_router(notifications.router, prefix="/notifications", tags=["notifications"])
api_router.include_router(saas.router, prefix="/saas", tags=["saas"])
