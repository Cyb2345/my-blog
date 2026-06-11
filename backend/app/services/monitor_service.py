import os
import platform
import socket
import sys
from datetime import datetime, timezone
from pathlib import Path
from contextlib import suppress

import psutil

from app.core.config import get_settings
from app.schemas.monitor import (
    CpuMonitor,
    DiskMonitor,
    HostCpuMonitor,
    HostDiskMonitor,
    HostLoadMonitor,
    HostMemoryMonitor,
    HostMonitor,
    HostNetworkMonitor,
    MemoryMonitor,
    RuntimeMonitor,
    ServerMonitor,
    ServiceMonitor,
)
from app.services.prometheus_service import PrometheusUnavailable, get_prometheus_monitor


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


def _host_from_psutil(cpu: CpuMonitor, memory: MemoryMonitor, disks: list[DiskMonitor]) -> HostMonitor:
    root_disk = next((disk for disk in disks if disk.mountpoint == "/"), disks[0])
    load1 = load5 = load15 = 0.0
    with suppress(OSError, AttributeError):
        load1, load5, load15 = os.getloadavg()

    return HostMonitor(
        cpu=HostCpuMonitor(usage_percent=cpu.usage_percent),
        memory=HostMemoryMonitor(
            total=memory.total,
            used=memory.used,
            available=memory.available,
            usage_percent=memory.usage_percent,
        ),
        disk=HostDiskMonitor(
            total=root_disk.total,
            used=root_disk.used,
            free=root_disk.free,
            usage_percent=root_disk.usage_percent,
        ),
        load=HostLoadMonitor(
            load1=_round_percent(load1),
            load5=_round_percent(load5),
            load15=_round_percent(load15),
        ),
        network=HostNetworkMonitor(rx_bytes_per_second=0, tx_bytes_per_second=0),
    )


def get_psutil_service_monitor(warning: str | None = None) -> ServiceMonitor:
    settings = get_settings()
    now = datetime.now(timezone.utc)
    cpu_times = psutil.cpu_times_percent(interval=0.1)
    memory = psutil.virtual_memory()
    process = psutil.Process(os.getpid())
    boot_time = _utc_datetime(psutil.boot_time())
    process_start_time = _utc_datetime(process.create_time())
    cpu = CpuMonitor(
        usage_percent=_round_percent(100 - cpu_times.idle),
        core_count=psutil.cpu_count(logical=True) or 1,
        user_percent=_round_percent(cpu_times.user),
        system_percent=_round_percent(cpu_times.system),
        idle_percent=_round_percent(cpu_times.idle),
    )
    memory_monitor = MemoryMonitor(
        total=memory.total,
        used=memory.used,
        available=memory.available,
        usage_percent=_round_percent(memory.percent),
    )
    disks = _disk_items()

    return ServiceMonitor(
        data_source="psutil_fallback",
        warning=warning,
        timestamp=now,
        host=_host_from_psutil(cpu, memory_monitor, disks),
        containers=[],
        cpu=cpu,
        memory=memory_monitor,
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
        disks=disks,
    )


def get_service_monitor() -> ServiceMonitor:
    settings = get_settings()
    if settings.PROMETHEUS_ENABLED:
        try:
            return get_prometheus_monitor(settings)
        except PrometheusUnavailable:
            return get_psutil_service_monitor("Prometheus 不可用，当前显示基础监控数据")
    return get_psutil_service_monitor()
