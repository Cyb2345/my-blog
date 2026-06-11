import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen

import psutil

from app.core.config import Settings
from app.schemas.monitor import (
    ContainerMonitor,
    HostCpuMonitor,
    HostDiskMonitor,
    HostLoadMonitor,
    HostMemoryMonitor,
    HostMonitor,
    HostNetworkMonitor,
    ServiceMonitor,
)


class PrometheusUnavailable(RuntimeError):
    pass


class PrometheusClient:
    def __init__(self, settings: Settings) -> None:
        self.base_url = settings.PROMETHEUS_BASE_URL.rstrip("/")
        self.timeout = settings.PROMETHEUS_TIMEOUT_SECONDS
        self.range_minutes = max(1, settings.PROMETHEUS_DEFAULT_RANGE_MINUTES)

    def query(self, promql: str) -> list[dict[str, object]]:
        params = urlencode({"query": promql})
        request = Request(f"{self.base_url}/api/v1/query?{params}")
        try:
            with urlopen(request, timeout=self.timeout) as response:
                body = json.loads(response.read().decode("utf-8"))
        except Exception as exc:  # noqa: BLE001 - network/client errors are all treated as unavailable.
            raise PrometheusUnavailable(str(exc)) from exc

        if body.get("status") != "success":
            raise PrometheusUnavailable(str(body.get("error") or "Prometheus query failed"))
        data = body.get("data")
        if not isinstance(data, dict):
            return []
        result = data.get("result")
        return result if isinstance(result, list) else []

    def scalar(self, promql: str, default: float = 0) -> float:
        result = self.query(promql)
        if not result:
            return default
        value = result[0].get("value")
        if not isinstance(value, list) or len(value) < 2:
            return default
        try:
            return float(value[1])
        except (TypeError, ValueError):
            return default

    def vector(self, promql: str) -> list[dict[str, object]]:
        return self.query(promql)


def _round_value(value: float) -> float:
    return round(float(value), 2)


def _vector_value(item: dict[str, object], default: float = 0) -> float:
    value = item.get("value")
    if not isinstance(value, list) or len(value) < 2:
        return default
    try:
        return float(value[1])
    except (TypeError, ValueError):
        return default


def _container_name(item: dict[str, object]) -> str | None:
    metric = item.get("metric")
    if not isinstance(metric, dict):
        return None
    name = metric.get("name") or metric.get("container_label_com_docker_compose_service")
    return str(name) if name else None


def _container_last_seen(value: float) -> datetime | None:
    if value <= 0:
        return None
    return datetime.fromtimestamp(value, timezone.utc)


def _build_containers(client: PrometheusClient, now: datetime) -> list[ContainerMonitor]:
    window = f"{client.range_minutes}m"
    cpu_items = client.vector(f'sum by(name) (rate(container_cpu_usage_seconds_total{{name!=""}}[{window}])) * 100')
    memory_items = client.vector('container_memory_working_set_bytes{name!=""}')
    last_seen_items = client.vector('container_last_seen{name!=""}')

    containers: dict[str, dict[str, float]] = {}
    for item in cpu_items:
        name = _container_name(item)
        if name:
            containers.setdefault(name, {})["cpu"] = _vector_value(item)
    for item in memory_items:
        name = _container_name(item)
        if name:
            containers.setdefault(name, {})["memory"] = _vector_value(item)
    for item in last_seen_items:
        name = _container_name(item)
        if name:
            containers.setdefault(name, {})["last_seen"] = _vector_value(item)

    rows: list[ContainerMonitor] = []
    for name, values in sorted(containers.items()):
        last_seen_value = values.get("last_seen", 0)
        last_seen = _container_last_seen(last_seen_value)
        status = "running" if last_seen and (now - last_seen).total_seconds() < 60 else "unknown"
        rows.append(
            ContainerMonitor(
                name=name,
                status=status,
                cpu_usage_percent=_round_value(values.get("cpu", 0)),
                memory_usage_bytes=max(0, int(values.get("memory", 0))),
                last_seen=last_seen,
            )
        )
    return rows


def get_prometheus_monitor(settings: Settings) -> ServiceMonitor:
    client = PrometheusClient(settings)
    now = datetime.now(timezone.utc)
    window = f"{client.range_minutes}m"

    cpu_usage = client.scalar(f'100 - (avg(rate(node_cpu_seconds_total{{mode="idle"}}[{window}])) * 100)')
    cpu_core_count = max(0, int(client.scalar('count(count(node_cpu_seconds_total{mode="idle"}) by (cpu))')))
    memory_total = client.scalar("node_memory_MemTotal_bytes")
    memory_available = client.scalar("node_memory_MemAvailable_bytes")
    memory_used = max(0, memory_total - memory_available)
    memory_usage = (memory_used / memory_total * 100) if memory_total else 0

    disk_total = client.scalar('node_filesystem_size_bytes{mountpoint="/",fstype!~"tmpfs|overlay|squashfs"}')
    disk_free = client.scalar('node_filesystem_avail_bytes{mountpoint="/",fstype!~"tmpfs|overlay|squashfs"}')
    disk_used = max(0, disk_total - disk_free)
    disk_usage = (disk_used / disk_total * 100) if disk_total else 0

    host = HostMonitor(
        cpu=HostCpuMonitor(usage_percent=_round_value(cpu_usage)),
        memory=HostMemoryMonitor(
            total=max(0, int(memory_total)),
            used=max(0, int(memory_used)),
            available=max(0, int(memory_available)),
            usage_percent=_round_value(memory_usage),
        ),
        disk=HostDiskMonitor(
            total=max(0, int(disk_total)),
            used=max(0, int(disk_used)),
            free=max(0, int(disk_free)),
            usage_percent=_round_value(disk_usage),
        ),
        load=HostLoadMonitor(
            load1=_round_value(client.scalar("node_load1")),
            load5=_round_value(client.scalar("node_load5")),
            load15=_round_value(client.scalar("node_load15")),
        ),
        network=HostNetworkMonitor(
            rx_bytes_per_second=_round_value(
                client.scalar(f'sum(rate(node_network_receive_bytes_total{{device!~"lo|docker.*|br.*|veth.*"}}[{window}]))')
            ),
            tx_bytes_per_second=_round_value(
                client.scalar(f'sum(rate(node_network_transmit_bytes_total{{device!~"lo|docker.*|br.*|veth.*"}}[{window}]))')
            ),
        ),
    )

    boot_time_seconds = client.scalar("node_boot_time_seconds")
    boot_time = datetime.fromtimestamp(boot_time_seconds, timezone.utc) if boot_time_seconds > 0 else now
    uname_items = client.vector("node_uname_info")
    uname_metric = uname_items[0].get("metric") if uname_items else {}
    uname = uname_metric if isinstance(uname_metric, dict) else {}
    hostname = str(uname.get("nodename") or "")
    os_name = str(uname.get("sysname") or "Linux")
    release = str(uname.get("release") or "")
    architecture = str(uname.get("machine") or "")
    process = psutil.Process(os.getpid())
    process_start_time = datetime.fromtimestamp(process.create_time(), timezone.utc)

    return ServiceMonitor(
        data_source="prometheus",
        timestamp=now,
        host=host,
        containers=_build_containers(client, now),
        cpu={
            "usage_percent": host.cpu.usage_percent,
            "core_count": cpu_core_count,
            "user_percent": 0,
            "system_percent": 0,
            "idle_percent": max(0, _round_value(100 - host.cpu.usage_percent)),
        },
        memory={
            "total": host.memory.total,
            "used": host.memory.used,
            "available": host.memory.available,
            "usage_percent": host.memory.usage_percent,
        },
        server={
            "hostname": hostname,
            "ip": "",
            "os": os_name,
            "platform": " ".join(part for part in [os_name, release] if part),
            "architecture": architecture,
            "boot_time": boot_time,
            "uptime_seconds": max(0, int((now - boot_time).total_seconds())),
        },
        runtime={
            "backend_framework": "FastAPI",
            "python_version": sys.version.split()[0],
            "process_id": process.pid,
            "process_start_time": process_start_time,
            "process_uptime_seconds": max(0, int((now - process_start_time).total_seconds())),
            "project_path": str(Path.cwd()),
            "storage_type": "r2" if settings.R2_ENABLED else "local",
            "r2_enabled": settings.R2_ENABLED,
        },
        disks=[
            {
                "mountpoint": "/",
                "filesystem": "/",
                "total": host.disk.total,
                "used": host.disk.used,
                "free": host.disk.free,
                "usage_percent": host.disk.usage_percent,
            }
        ],
    )
