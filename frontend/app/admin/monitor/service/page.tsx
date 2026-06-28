"use client";

import { Activity, AlertCircle, Boxes, Cpu, HardDrive, Info, MemoryStick, RefreshCw, Server } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";

import { AdminDataTable, type AdminDataTableColumn } from "@/components/admin/AdminDataTable";
import { AdminPage } from "@/components/admin/AdminPage";
import { StatusTag } from "@/components/admin/StatusTag";
import { Button } from "@/components/ui/button";
import { adminRequest } from "@/lib/auth";
import { cn } from "@/lib/utils";
import type { ServiceMonitor } from "@/types/blog";

const AUTO_REFRESH_MS = 30_000;
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

function formatRate(value: number) {
  return `${formatBytes(value)}/s`;
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
  if (value >= 85) return { color: "var(--destructive)", text: "text-destructive", bg: "bg-destructive" };
  if (value >= warning) return { color: "var(--warning)", text: "text-[var(--warning)]", bg: "bg-[var(--warning)]" };
  return { color: "var(--color-success)", text: "text-[var(--color-success)]", bg: "bg-[var(--color-success)]" };
}

function PercentDial({ value, warning }: { value: number; warning?: number }) {
  const tone = toneForPercent(value, warning);
  const angle = Math.max(0, Math.min(100, value)) * 3.6;

  return (
    <div className="mx-auto grid h-36 w-36 place-items-center rounded-full bg-muted">
      <div
        className="grid h-32 w-32 place-items-center rounded-full"
        style={{ background: `conic-gradient(${tone.color} ${angle}deg, rgba(148, 163, 184, 0.16) 0deg)` }}
      >
        <div className="grid h-24 w-24 place-items-center rounded-full bg-card text-center shadow-inner">
          <span className={cn("text-2xl font-black", tone.text)}>{value.toFixed(1)}%</span>
        </div>
      </div>
    </div>
  );
}

function MonitorCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="interactive-card overflow-hidden rounded-lg border border-border bg-card text-card-foreground shadow-sm">
      <div className="flex items-center gap-3 border-b border-border px-5 py-4">
        <span className="grid h-9 w-9 place-items-center rounded-md bg-accent text-accent-foreground">{icon}</span>
        <h2 className="text-base font-black text-foreground">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function MetricItem({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex min-h-11 items-center justify-between gap-4 rounded-md bg-muted px-4 py-2">
      <span className="text-sm font-bold text-muted-foreground">{label}</span>
      <span className="min-w-0 truncate text-right text-sm font-black text-foreground">{value}</span>
    </div>
  );
}

function LoadingGrid() {
  return (
    <div className="grid gap-4">
      <div className="grid gap-4 xl:grid-cols-2">
        {[0, 1].map((item) => (
          <div key={item} className="h-72 animate-pulse rounded-lg border border-border bg-card" />
        ))}
      </div>
      {[0, 1, 2].map((item) => (
        <div key={item} className="h-44 animate-pulse rounded-lg border border-border bg-card" />
      ))}
    </div>
  );
}

export default function ServiceMonitorPage() {
  const [monitor, setMonitor] = useState<ServiceMonitor | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadMonitor = useCallback(async (silent = false) => {
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError("");
    try {
      const data = await adminRequest<ServiceMonitor>("/admin/monitor/service");
      setMonitor(data);
    } catch (exc) {
      setError(exc instanceof Error ? exc.message : "监控数据获取失败，请稍后重试");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadMonitor();
    const timer = window.setInterval(() => {
      void loadMonitor(true);
    }, AUTO_REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [loadMonitor]);

  const lastUpdated = useMemo(() => formatDateTime(monitor?.timestamp), [monitor?.timestamp]);
  const host = monitor?.host ?? null;
  const dataSourceLabel = monitor?.data_source === "prometheus" ? "Prometheus" : "psutil 基础监控";
  const cpuUsage = host?.cpu.usage_percent ?? monitor?.cpu.usage_percent ?? 0;
  const memory = host?.memory ?? monitor?.memory;
  const containerColumns = useMemo<Array<AdminDataTableColumn<ContainerMonitor>>>(
    () => [
      {
        key: "name",
        title: "容器名称",
        minWidth: 180,
        ellipsis: true,
        render: (container) => <span className="font-black text-foreground">{container.name}</span>,
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
        render: (disk) => <span className="font-bold text-foreground">{disk.mountpoint}</span>,
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
                <div className={cn("h-full rounded-full", tone.bg)} style={{ width: `${Math.min(100, Math.max(0, disk.usage_percent))}%` }} />
              </div>
              <span className={cn("w-16 text-right font-black", tone.text)}>{disk.usage_percent.toFixed(1)}%</span>
            </div>
          );
        },
      },
    ],
    [],
  );

  return (
    <AdminPage
      title="服务监控"
      description="查看当前博客服务所在服务器的 CPU、内存、磁盘和运行环境状态。"
      actions={
        <Button onClick={() => void loadMonitor(true)} disabled={refreshing}>
          <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} aria-hidden="true" />
          刷新
        </Button>
      }
    >
      <div className="grid gap-3">
        <p className="text-xs font-bold text-muted-foreground">
          最后更新：{lastUpdated}
          {refreshing ? " · 正在刷新..." : " · 每 30 秒自动刷新"}
        </p>
        {monitor ? (
          <p className="inline-flex w-fit rounded-full border border-border bg-accent px-3 py-1 text-xs font-black text-accent-foreground">
            数据来源：{dataSourceLabel}
          </p>
        ) : null}
      </div>

      {error ? (
        <div className="flex flex-col gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-destructive sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-sm font-bold">
            <AlertCircle className="h-4 w-4" aria-hidden="true" />
            {error || "监控数据获取失败，请稍后重试"}
          </div>
          <Button variant="ghost" onClick={() => void loadMonitor()}>
            重试
          </Button>
        </div>
      ) : null}

      {monitor?.warning ? (
        <div className="flex items-center gap-2 rounded-lg border border-[color-mix(in_srgb,var(--warning)_35%,transparent)] bg-[color-mix(in_srgb,var(--warning)_12%,transparent)] p-4 text-sm font-bold text-[var(--warning)]">
          <AlertCircle className="h-4 w-4" aria-hidden="true" />
          {monitor.warning}
        </div>
      ) : null}

      {loading && !monitor ? <LoadingGrid /> : null}

      {monitor ? (
        <>
          <div className="grid gap-4 xl:grid-cols-2">
            <MonitorCard title="CPU 使用率" icon={<Cpu className="h-5 w-5" aria-hidden="true" />}>
              <div className="grid gap-5">
                <PercentDial value={cpuUsage} warning={60} />
                <div className="grid gap-3 sm:grid-cols-2">
                  <MetricItem label="核心数" value={monitor.cpu.core_count} />
                  <MetricItem label="用户使用率" value={`${monitor.cpu.user_percent.toFixed(1)}%`} />
                  <MetricItem label="系统使用率" value={`${monitor.cpu.system_percent.toFixed(1)}%`} />
                  <MetricItem label="当前空闲率" value={`${monitor.cpu.idle_percent.toFixed(1)}%`} />
                </div>
              </div>
            </MonitorCard>

            <MonitorCard title="内存使用率" icon={<MemoryStick className="h-5 w-5" aria-hidden="true" />}>
              <div className="grid gap-5">
                <PercentDial value={memory?.usage_percent ?? 0} />
                <div className="grid gap-3 sm:grid-cols-2">
                  <MetricItem label="总内存" value={formatBytes(memory?.total ?? 0)} />
                  <MetricItem label="已用内存" value={formatBytes(memory?.used ?? 0)} />
                  <MetricItem label="剩余内存" value={formatBytes(memory?.available ?? 0)} />
                  <MetricItem label="使用率" value={`${(memory?.usage_percent ?? 0).toFixed(1)}%`} />
                </div>
              </div>
            </MonitorCard>
          </div>

          {host ? (
            <MonitorCard title="主机监控" icon={<Activity className="h-5 w-5" aria-hidden="true" />}>
              <div className="grid gap-3 lg:grid-cols-3">
                <MetricItem label="CPU 使用率" value={`${host.cpu.usage_percent.toFixed(1)}%`} />
                <MetricItem label="内存使用率" value={`${host.memory.usage_percent.toFixed(1)}%`} />
                <MetricItem label="磁盘使用率" value={`${host.disk.usage_percent.toFixed(1)}%`} />
                <MetricItem label="系统负载" value={`${host.load.load1.toFixed(2)} / ${host.load.load5.toFixed(2)} / ${host.load.load15.toFixed(2)}`} />
                <MetricItem label="网络接收" value={formatRate(host.network.rx_bytes_per_second)} />
                <MetricItem label="网络发送" value={formatRate(host.network.tx_bytes_per_second)} />
              </div>
            </MonitorCard>
          ) : null}

          <MonitorCard title="服务器信息" icon={<Server className="h-5 w-5" aria-hidden="true" />}>
            <div className="grid gap-3 lg:grid-cols-2">
              <MetricItem label="服务器名称" value={monitor.server.hostname} />
              <MetricItem label="服务器 IP" value={monitor.server.ip} />
              <MetricItem label="操作系统" value={monitor.server.os} />
              <MetricItem label="系统架构" value={monitor.server.architecture} />
              <MetricItem label="系统版本" value={monitor.server.platform} />
              <MetricItem label="启动时间" value={formatDateTime(monitor.server.boot_time)} />
              <MetricItem label="运行时长" value={formatDuration(monitor.server.uptime_seconds)} />
            </div>
          </MonitorCard>

          <MonitorCard title="运行环境信息" icon={<Info className="h-5 w-5" aria-hidden="true" />}>
            <div className="grid gap-3 lg:grid-cols-2">
              <MetricItem label="后端框架" value={monitor.runtime.backend_framework} />
              <MetricItem label="Python 版本" value={monitor.runtime.python_version} />
              <MetricItem label="进程 ID" value={monitor.runtime.process_id} />
              <MetricItem label="后端启动时间" value={formatDateTime(monitor.runtime.process_start_time)} />
              <MetricItem label="后端运行时长" value={formatDuration(monitor.runtime.process_uptime_seconds)} />
              <MetricItem label="项目路径" value={monitor.runtime.project_path} />
              <MetricItem label="上传存储" value={monitor.runtime.storage_type === "r2" ? "Cloudflare R2" : "本地存储"} />
              <MetricItem label="R2 状态" value={monitor.runtime.r2_enabled ? "已启用" : "未启用"} />
            </div>
          </MonitorCard>

          <MonitorCard title="容器监控" icon={<Boxes className="h-5 w-5" aria-hidden="true" />}>
            <AdminDataTable columns={containerColumns} data={monitor.containers} rowKey="name" emptyText="暂无容器监控数据" minWidth={720} />
          </MonitorCard>

          <MonitorCard title="磁盘信息" icon={<HardDrive className="h-5 w-5" aria-hidden="true" />}>
            <AdminDataTable columns={diskColumns} data={monitor.disks} rowKey={(disk) => `${disk.mountpoint}-${disk.filesystem}`} emptyText="暂无磁盘数据" minWidth={760} />
          </MonitorCard>
        </>
      ) : null}
    </AdminPage>
  );
}
