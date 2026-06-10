from fastapi import APIRouter, Depends

from app.core.deps import require_admin
from app.schemas.monitor import ServiceMonitor
from app.services.monitor_service import get_service_monitor
from app.utils.response import ok

router = APIRouter(prefix="/admin/monitor", tags=["admin-monitor"], dependencies=[Depends(require_admin)])


@router.get("/service")
def service_monitor() -> dict[str, object]:
    data: ServiceMonitor = get_service_monitor()
    return ok(data.model_dump(mode="json"))
