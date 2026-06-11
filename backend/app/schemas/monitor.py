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


class HostCpuMonitor(BaseModel):
    usage_percent: float


class HostMemoryMonitor(BaseModel):
    total: int
    used: int
    available: int
    usage_percent: float


class HostDiskMonitor(BaseModel):
    total: int
    used: int
    free: int
    usage_percent: float


class HostLoadMonitor(BaseModel):
    load1: float
    load5: float
    load15: float


class HostNetworkMonitor(BaseModel):
    rx_bytes_per_second: float
    tx_bytes_per_second: float


class HostMonitor(BaseModel):
    cpu: HostCpuMonitor
    memory: HostMemoryMonitor
    disk: HostDiskMonitor
    load: HostLoadMonitor
    network: HostNetworkMonitor


class ContainerMonitor(BaseModel):
    name: str
    status: str
    cpu_usage_percent: float
    memory_usage_bytes: int
    last_seen: datetime | None = None


class ServiceMonitor(BaseModel):
    data_source: str = "psutil_fallback"
    warning: str | None = None
    timestamp: datetime
    host: HostMonitor | None = None
    containers: list[ContainerMonitor] = []
    cpu: CpuMonitor
    memory: MemoryMonitor
    server: ServerMonitor
    runtime: RuntimeMonitor
    disks: list[DiskMonitor]
