"use client";

import { AlertCircle, Cpu, HardDrive, Info, MemoryStick, RefreshCw, Server } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";

import { Button } from "@/components/ui/Button";
import { adminRequest } from "@/lib/auth";
import { cn } from "@/lib/utils";
import type { ServiceMonitor } from "@/types/blog";

const AUTO_REFRESH_MS = 30_000;

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
  if (value >= 85) return { color: "#ef4444", text: "text-red-600 dark:text-red-300", bg: "bg-red-500" };
  if (value >= warning) return { color: "#f59e0b", text: "text-amber-600 dark:text-amber-300", bg: "bg-amber-500" };
  return { color: "#22c55e", text: "text-emerald-600 dark:text-emerald-300", bg: "bg-emerald-500" };
}

function PercentDial({ value, warning }: { value: number; warning?: number }) {
  const tone = toneForPercent(value, warning);
  const angle = Math.max(0, Math.min(100, value)) * 3.6;

  return (
    <div className="mx-auto grid h-36 w-36 place-items-center rounded-full bg-slate-100 dark:bg-slate-800">
      <div
        className="grid h-32 w-32 place-items-center rounded-full"
        style={{ background: `conic-gradient(${tone.color} ${angle}deg, rgba(148, 163, 184, 0.16) 0deg)` }}
      >
        <div className="grid h-24 w-24 place-items-center rounded-full bg-white text-center shadow-inner dark:bg-slate-900">
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
    <section className="interactive-card overflow-hidden rounded-lg border border-ink/10 bg-white shadow-sm dark:border-white/10 dark:bg-slate-900">
      <div className="flex items-center gap-3 border-b border-ink/10 px-5 py-4 dark:border-white/10">
        <span className="grid h-9 w-9 place-items-center rounded-md bg-ocean/10 text-ocean dark:bg-sky-400/10 dark:text-sky-300">{icon}</span>
        <h2 className="text-base font-black text-ink dark:text-slate-100">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function MetricItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex min-h-11 items-center justify-between gap-4 rounded-md bg-[#f5f7f4] px-4 py-2 dark:bg-white/5">
      <span className="text-sm font-bold text-ink/55 dark:text-slate-400">{label}</span>
      <span className="min-w-0 truncate text-right text-sm font-black text-ink dark:text-slate-100">{value}</span>
    </div>
  );
}

function LoadingGrid() {
  return (
    <div className="grid gap-4">
      <div className="grid gap-4 xl:grid-cols-2">
        {[0, 1].map((item) => (
          <div key={item} className="h-72 animate-pulse rounded-lg border border-ink/10 bg-white dark:border-white/10 dark:bg-slate-900" />
        ))}
      </div>
      {[0, 1, 2].map((item) => (
        <div key={item} className="h-44 animate-pulse rounded-lg border border-ink/10 bg-white dark:border-white/10 dark:bg-slate-900" />
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

  return (
    <div className="motion-list grid gap-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-bold text-ocean dark:text-sky-300">Monitor</p>
          <h1 className="mt-2 text-2xl font-black text-ink dark:text-slate-100">服务监控</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-ink/55 dark:text-slate-400">
            查看当前博客服务所在服务器的 CPU、内存、磁盘和运行环境状态。
          </p>
          <p className="mt-2 text-xs font-bold text-ink/45 dark:text-slate-500">
            最后更新：{lastUpdated}
            {refreshing ? " · 正在刷新..." : " · 每 30 秒自动刷新"}
          </p>
        </div>
        <Button onClick={() => void loadMonitor(true)} disabled={refreshing}>
          <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} aria-hidden="true" />
          刷新
        </Button>
      </div>

      {error ? (
        <div className="flex flex-col gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-sm font-bold">
            <AlertCircle className="h-4 w-4" aria-hidden="true" />
            {error || "监控数据获取失败，请稍后重试"}
          </div>
          <Button variant="ghost" onClick={() => void loadMonitor()}>
            重试
          </Button>
        </div>
      ) : null}

      {loading && !monitor ? <LoadingGrid /> : null}

      {monitor ? (
        <>
          <div className="grid gap-4 xl:grid-cols-2">
            <MonitorCard title="CPU 使用率" icon={<Cpu className="h-5 w-5" aria-hidden="true" />}>
              <div className="grid gap-5">
                <PercentDial value={monitor.cpu.usage_percent} warning={60} />
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
                <PercentDial value={monitor.memory.usage_percent} />
                <div className="grid gap-3 sm:grid-cols-2">
                  <MetricItem label="总内存" value={formatBytes(monitor.memory.total)} />
                  <MetricItem label="已用内存" value={formatBytes(monitor.memory.used)} />
                  <MetricItem label="剩余内存" value={formatBytes(monitor.memory.available)} />
                  <MetricItem label="使用率" value={`${monitor.memory.usage_percent.toFixed(1)}%`} />
                </div>
              </div>
            </MonitorCard>
          </div>

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

          <MonitorCard title="磁盘信息" icon={<HardDrive className="h-5 w-5" aria-hidden="true" />}>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] border-separate border-spacing-0 text-left text-sm">
                <thead>
                  <tr className="text-ink/50 dark:text-slate-400">
                    {["盘符路径", "文件系统", "总大小", "可用大小", "已用大小", "使用率"].map((label) => (
                      <th key={label} className="border-b border-ink/10 px-3 py-3 font-black dark:border-white/10">
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {monitor.disks.map((disk) => {
                    const tone = toneForPercent(disk.usage_percent);

                    return (
                      <tr key={`${disk.mountpoint}-${disk.filesystem}`} className="text-ink dark:text-slate-100">
                        <td className="border-b border-ink/5 px-3 py-4 font-bold dark:border-white/5">{disk.mountpoint}</td>
                        <td className="border-b border-ink/5 px-3 py-4 text-ink/65 dark:border-white/5 dark:text-slate-400">{disk.filesystem}</td>
                        <td className="border-b border-ink/5 px-3 py-4 dark:border-white/5">{formatBytes(disk.total)}</td>
                        <td className="border-b border-ink/5 px-3 py-4 dark:border-white/5">{formatBytes(disk.free)}</td>
                        <td className="border-b border-ink/5 px-3 py-4 dark:border-white/5">{formatBytes(disk.used)}</td>
                        <td className="border-b border-ink/5 px-3 py-4 dark:border-white/5">
                          <div className="flex items-center gap-3">
                            <div className="h-2 min-w-24 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                              <div className={cn("h-full rounded-full", tone.bg)} style={{ width: `${Math.min(100, Math.max(0, disk.usage_percent))}%` }} />
                            </div>
                            <span className={cn("w-16 text-right font-black", tone.text)}>{disk.usage_percent.toFixed(1)}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </MonitorCard>
        </>
      ) : null}
    </div>
  );
}
