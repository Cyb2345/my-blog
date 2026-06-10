from datetime import datetime

from pydantic import BaseModel


class CpuMonitor(BaseModel):
    usage_percent: float
    core_count: int
    user_percent: float
    system_percent: float
    idle_percent: float


class MemoryMonitor(BaseModel):
    total: int
    used: int
    available: int
    usage_percent: float


class ServerMonitor(BaseModel):
    hostname: str
    ip: str
    os: str
    platform: str
    architecture: str
    boot_time: datetime
    uptime_seconds: int


class RuntimeMonitor(BaseModel):
    backend_framework: str
    python_version: str
    process_id: int
    process_start_time: datetime
    process_uptime_seconds: int
    project_path: str
    storage_type: str
    r2_enabled: bool


class DiskMonitor(BaseModel):
    mountpoint: str
    filesystem: str
    total: int
    used: int
    free: int
    usage_percent: float


class ServiceMonitor(BaseModel):
    timestamp: datetime
    cpu: CpuMonitor
    memory: MemoryMonitor
    server: ServerMonitor
    runtime: RuntimeMonitor
    disks: list[DiskMonitor]
