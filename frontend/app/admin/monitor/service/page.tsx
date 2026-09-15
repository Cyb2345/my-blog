"use client";

import {
  AlertCircle,
  Boxes,
  HardDrive,
  Info,
  Server,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState, useRef } from "react";

import {
  AdminDataTable,
  type AdminDataTableColumn,
} from "@/components/admin/AdminDataTable";
import { AdminPage } from "@/components/admin/AdminPage";
import {
  MonitorCard,
  MetricItem,
} from "@/components/admin/monitor/MonitorCard";
import { LiveMonitorOverview, sampleMonitor, type MonitorSample } from "@/components/admin/monitor/LiveMonitorOverview";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusTag } from "@/components/admin/StatusTag";
import { Button } from "@/components/ui/button";
import { adminRequest } from "@/lib/auth";
import { cn } from "@/lib/utils";
import type { ServiceMonitor } from "@/types/blog";

const AUTO_REFRESH_MS = 5_000;
type ContainerMonitor = ServiceMonitor["containers"][number];
type DiskMonitor = ServiceMonitor["disks"][number];

function formatBytes(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let size = value;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  return `${size >= 10 || unitIndex === 0 ? size.toFixed(0) : size.toFixed(1)} ${units[unitIndex]}`;
}

function formatDateTime(value?: string) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

function formatDuration(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "-";
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const parts = [
    days ? `${days}天` : "",
    hours ? `${hours}小时` : "",
    minutes ? `${minutes}分钟` : "",
  ].filter(Boolean);
  return parts.length ? parts.join("") : "不足 1 分钟";
}

function toneForPercent(value: number, warning = 70) {
  if (value >= 85)
    return {
      variant: "danger" as const,
      text: "text-destructive",
      bg: "bg-destructive",
    };
  if (value >= warning)
    return {
      variant: "warning" as const,
      text: "text-[var(--color-warning)]",
      bg: "bg-[var(--color-warning)]",
    };
  return {
    variant: "success" as const,
    text: "text-[var(--color-success)]",
    bg: "bg-[var(--color-success)]",
  };
}

function LoadingGrid() {
  return (
    <div className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((item) => (
          <Skeleton key={item} className="h-52" />
        ))}
      </div>
      {[0, 1, 2].map((item) => (
        <Skeleton key={item} className="h-44" />
      ))}
    </div>
  );
}

export default function ServiceMonitorPage() {
  const [monitor, setMonitor] = useState<ServiceMonitor | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [history, setHistory] = useState<MonitorSample[]>([]);
  const activeRequest = useRef<AbortController | null>(null);

  const loadMonitor = useCallback(async () => {
    if (activeRequest.current || document.hidden) return;
    const controller = new AbortController();
    activeRequest.current = controller;
    const timeout = window.setTimeout(() => controller.abort(), 20_000);
    setRefreshing(true);
    try {
      const data = await adminRequest<ServiceMonitor>("/admin/monitor/service", { signal: controller.signal, cache: "no-store" });
      if (controller.signal.aborted) return;
      setMonitor(data);
      setError("");
      const sample = sampleMonitor(data);
      if (Number.isFinite(sample.time)) setHistory(previous => {
        if (data.history?.length) return data.history;
        const sameSource = previous.at(-1)?.source === sample.source ? previous : [];
        if (sameSource.at(-1)?.time === sample.time) return sameSource;
        return [...sameSource.filter(p => p.time > sample.time - 300_000), sample].slice(-61);
      });
    } catch (exc) {
      if (activeRequest.current === controller) setError(controller.signal.aborted ? "采集超时，保留上次数据，稍后自动重试" : exc instanceof Error ? exc.message : "监控数据获取失败");
    } finally {
      window.clearTimeout(timeout);
      if (activeRequest.current === controller) {
        activeRequest.current = null;
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    setRefreshing(false);
    const tick = () => { void loadMonitor(); };
    const visibility = () => {
      if (!document.hidden) tick();
    };
    tick();
    const timer = window.setInterval(tick, AUTO_REFRESH_MS);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", visibility);
      const request = activeRequest.current;
      activeRequest.current = null;
      request?.abort();
    };
  }, [loadMonitor]);

  const containerColumns = useMemo<
    Array<AdminDataTableColumn<ContainerMonitor>>
  >(
    () => [
      {
        key: "name",
        title: "容器名称",
        minWidth: 180,
        ellipsis: true,
        render: (container) => (
          <span className="font-black text-foreground">{container.name}</span>
        ),
      },
      {
        key: "status",
        title: "运行状态",
        width: 120,
        render: (container) => (
          <StatusTag
            status={container.status === "running" ? "normal" : "pending"}
            label={container.status}
            map={{
              normal: { label: container.status, variant: "success" },
              pending: { label: container.status, variant: "warning" },
            }}
          />
        ),
      },
      {
        key: "cpu",
        title: "CPU 使用率",
        width: 130,
        render: (container) => `${container.cpu_usage_percent.toFixed(2)}%`,
      },
      {
        key: "memory",
        title: "内存使用量",
        width: 150,
        render: (container) => formatBytes(container.memory_usage_bytes),
      },
      {
        key: "lastSeen",
        title: "最后采集时间",
        width: 190,
        render: (container) => formatDateTime(container.last_seen ?? undefined),
      },
    ],
    [],
  );
  const diskColumns = useMemo<Array<AdminDataTableColumn<DiskMonitor>>>(
    () => [
      {
        key: "mountpoint",
        title: "盘符路径",
        minWidth: 180,
        ellipsis: true,
        render: (disk) => (
          <span className="font-bold text-foreground">{disk.mountpoint}</span>
        ),
      },
      {
        key: "filesystem",
        title: "文件系统",
        width: 150,
        ellipsis: true,
        render: (disk) => disk.filesystem,
      },
      {
        key: "total",
        title: "总大小",
        width: 130,
        render: (disk) => formatBytes(disk.total),
      },
      {
        key: "free",
        title: "可用大小",
        width: 130,
        render: (disk) => formatBytes(disk.free),
      },
      {
        key: "used",
        title: "已用大小",
        width: 130,
        render: (disk) => formatBytes(disk.used),
      },
      {
        key: "usage",
        title: "使用率",
        width: 220,
        render: (disk) => {
          const tone = toneForPercent(disk.usage_percent);
          return (
            <div className="flex items-center gap-3">
              <div className="h-2 min-w-24 flex-1 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn("h-full rounded-full", tone.bg)}
                  style={{
                    width: `${Math.min(100, Math.max(0, disk.usage_percent))}%`,
                  }}
                />
              </div>
              <span className={cn("w-16 text-right font-black", tone.text)}>
                {disk.usage_percent.toFixed(1)}%
              </span>
            </div>
          );
        },
      },
    ],
    [],
  );

  return (
    <AdminPage>
      {error ? (
        <div
          role="alert"
          className="flex flex-col gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-destructive sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-center gap-2 text-sm font-bold">
            <AlertCircle className="h-4 w-4" aria-hidden="true" />
            {error || "监控数据获取失败，请稍后重试"}
          </div>
          <Button
            variant="ghost"
            disabled={loading || refreshing}
            onClick={() => void loadMonitor()}
          >
            重试
          </Button>
        </div>
      ) : null}

      {monitor?.history_warning && <p role="status" className="text-sm text-muted-foreground">{monitor.history_warning}</p>}
      {monitor?.warning ? (
        <div className="flex items-center gap-2 rounded-lg border border-[color-mix(in_srgb,var(--color-warning)_35%,transparent)] bg-[color-mix(in_srgb,var(--color-warning)_12%,transparent)] p-4 text-sm font-bold text-[var(--color-warning)]">
          <AlertCircle className="h-4 w-4" aria-hidden="true" />
          {monitor.warning}
        </div>
      ) : null}

      {loading && !monitor ? <LoadingGrid /> : null}

      {monitor ? (
        <>
          <LiveMonitorOverview monitor={monitor} history={history} />

          <div className="grid items-start gap-4 xl:grid-cols-2">
            <MonitorCard
              title="服务器信息"
              icon={<Server className="h-5 w-5" aria-hidden="true" />}
            >
              <div className="grid gap-3">
                <MetricItem
                  label="服务器名称"
                  value={monitor.server.hostname}
                />
                <MetricItem label="服务器 IP" value={monitor.server.ip} />
                <MetricItem label="操作系统" value={monitor.server.os} />
                <MetricItem
                  label="系统架构"
                  value={monitor.server.architecture}
                />
                <MetricItem label="系统版本" value={monitor.server.platform} />
                <MetricItem
                  label="启动时间"
                  value={formatDateTime(monitor.server.boot_time)}
                />
                <MetricItem
                  label="运行时长"
                  value={formatDuration(monitor.server.uptime_seconds)}
                />
              </div>
            </MonitorCard>

            <MonitorCard
              title="运行环境信息"
              icon={<Info className="h-5 w-5" aria-hidden="true" />}
            >
              <div className="grid gap-3">
                <MetricItem
                  label="后端框架"
                  value={monitor.runtime.backend_framework}
                />
                <MetricItem
                  label="Python 版本"
                  value={monitor.runtime.python_version}
                />
                <MetricItem
                  label="进程 ID"
                  value={monitor.runtime.process_id}
                />
                <MetricItem
                  label="后端启动时间"
                  value={formatDateTime(monitor.runtime.process_start_time)}
                />
                <MetricItem
                  label="后端运行时长"
                  value={formatDuration(monitor.runtime.process_uptime_seconds)}
                />
                <MetricItem
                  label="项目路径"
                  value={monitor.runtime.project_path}
                />
                <MetricItem
                  label="上传存储"
                  value={
                    monitor.runtime.storage_type === "r2"
                      ? "Cloudflare R2"
                      : "本地存储"
                  }
                />
                <MetricItem
                  label="R2 状态"
                  value={monitor.runtime.r2_enabled ? "已启用" : "未启用"}
                />
              </div>
            </MonitorCard>
          </div>

          <MonitorCard
            title="容器监控"
            icon={<Boxes className="h-5 w-5" aria-hidden="true" />}
          >
            <AdminDataTable
              columns={containerColumns}
              data={monitor.containers}
              rowKey="name"
              emptyText="暂无容器监控数据"
              minWidth={720}
            />
          </MonitorCard>

          <MonitorCard
            title="磁盘信息"
            icon={<HardDrive className="h-5 w-5" aria-hidden="true" />}
          >
            <AdminDataTable
              columns={diskColumns}
              data={monitor.disks}
              rowKey={(disk) => `${disk.mountpoint}-${disk.filesystem}`}
              emptyText="暂无磁盘数据"
              minWidth={760}
            />
          </MonitorCard>
        </>
      ) : null}
    </AdminPage>
  );
}
