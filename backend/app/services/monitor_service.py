import os
import platform
import socket
import sys
from datetime import datetime, timezone
from pathlib import Path

import psutil

from app.core.config import get_settings
from app.schemas.monitor import (
    CpuMonitor,
    DiskMonitor,
    MemoryMonitor,
    RuntimeMonitor,
    ServerMonitor,
    ServiceMonitor,
)


def _utc_datetime(timestamp: float) -> datetime:
    return datetime.fromtimestamp(timestamp, timezone.utc)


def _round_percent(value: float) -> float:
    return round(float(value), 2)


def _server_ip() -> str:
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as sock:
            sock.connect(("8.8.8.8", 80))
            return sock.getsockname()[0]
    except OSError:
        try:
            return socket.gethostbyname(socket.gethostname())
        except OSError:
            return "127.0.0.1"


def _platform_label() -> str:
    system = platform.system()
    release = platform.release()
    if system == "Linux":
        try:
            freedesktop = platform.freedesktop_os_release()
            name = freedesktop.get("PRETTY_NAME")
            if name:
                return name
        except OSError:
            pass
    return " ".join(part for part in [system, release] if part)


def _disk_items() -> list[DiskMonitor]:
    disks: list[DiskMonitor] = []
    seen: set[str] = set()
    for partition in psutil.disk_partitions(all=False):
        mountpoint = partition.mountpoint
        if not mountpoint or mountpoint in seen:
            continue
        seen.add(mountpoint)
        try:
            usage = psutil.disk_usage(mountpoint)
        except OSError:
            continue
        disks.append(
            DiskMonitor(
                mountpoint=mountpoint,
                filesystem=partition.fstype or partition.device or mountpoint,
                total=usage.total,
                used=usage.used,
                free=usage.free,
                usage_percent=_round_percent(usage.percent),
            )
        )

    if not disks:
        usage = psutil.disk_usage("/")
        disks.append(
            DiskMonitor(
                mountpoint="/",
                filesystem="/",
                total=usage.total,
                used=usage.used,
                free=usage.free,
                usage_percent=_round_percent(usage.percent),
            )
        )
    return disks


def get_service_monitor() -> ServiceMonitor:
    settings = get_settings()
    now = datetime.now(timezone.utc)
    cpu_times = psutil.cpu_times_percent(interval=0.1)
    memory = psutil.virtual_memory()
    process = psutil.Process(os.getpid())
    boot_time = _utc_datetime(psutil.boot_time())
    process_start_time = _utc_datetime(process.create_time())

    return ServiceMonitor(
        timestamp=now,
        cpu=CpuMonitor(
            usage_percent=_round_percent(100 - cpu_times.idle),
            core_count=psutil.cpu_count(logical=True) or 1,
            user_percent=_round_percent(cpu_times.user),
            system_percent=_round_percent(cpu_times.system),
            idle_percent=_round_percent(cpu_times.idle),
        ),
        memory=MemoryMonitor(
            total=memory.total,
            used=memory.used,
            available=memory.available,
            usage_percent=_round_percent(memory.percent),
        ),
        server=ServerMonitor(
            hostname=socket.gethostname(),
            ip=_server_ip(),
            os=platform.system() or "Unknown",
            platform=_platform_label(),
            architecture=platform.machine() or "Unknown",
            boot_time=boot_time,
            uptime_seconds=max(0, int((now - boot_time).total_seconds())),
        ),
        runtime=RuntimeMonitor(
            backend_framework="FastAPI",
            python_version=sys.version.split()[0],
            process_id=process.pid,
            process_start_time=process_start_time,
            process_uptime_seconds=max(0, int((now - process_start_time).total_seconds())),
            project_path=str(Path.cwd()),
            storage_type="r2" if settings.R2_ENABLED else "local",
            r2_enabled=settings.R2_ENABLED,
        ),
        disks=_disk_items(),
    )
