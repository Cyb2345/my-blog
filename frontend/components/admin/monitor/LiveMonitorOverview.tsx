"use client";

import { Activity, ArrowDownUp, Cpu, HardDrive, MemoryStick, Network } from "lucide-react";
import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { MonitorCard } from "@/components/admin/monitor/MonitorCard";
import { TrendChart, type TrendPoint } from "@/components/admin/monitor/TrendChart";
import type { ServiceMonitor, MonitorHistoryPoint } from "@/types/blog";

export type MonitorSample = MonitorHistoryPoint;
export function sampleMonitor(data: ServiceMonitor): MonitorSample {
  return { time: Date.parse(data.timestamp), source: data.data_source, cpu: data.host?.cpu.usage_percent ?? data.cpu.usage_percent,
    memory: data.host?.memory.usage_percent ?? data.memory.usage_percent, disk: data.host?.disk.usage_percent ?? null,
    swap: data.host?.swap?.usage_percent ?? null, rx: data.host?.network.rx_bytes_per_second ?? null,
    tx: data.host?.network.tx_bytes_per_second ?? null, tcp: data.host?.connections?.tcp ?? null, udp: data.host?.connections?.udp ?? null };
}
export function bytes(value?: number | null) {
  if (value == null || !Number.isFinite(value)) return "—";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const index = Math.min(4, Math.max(0, Math.floor(Math.log2(Math.max(1, value)) / 10)));
  return `${(value / 1024 ** index).toFixed(index ? 2 : 0)} ${units[index]}`;
}
const rate = (value?: number | null) => value == null ? "—" : `${bytes(value)}/s`;
const percent = (value?: number | null) => value == null ? "—" : `${value.toFixed(1)}%`;

export function LiveMonitorOverview({ monitor, history }: { monitor: ServiceMonitor; history: MonitorSample[] }) {
  const current = sampleMonitor(monitor);
  const host = monitor.host;
  const points = (...keys: Array<keyof Omit<MonitorSample, "time" | "source">>): TrendPoint[] => history.map(sample => ({time: sample.time, values: keys.map(key => sample[key])}));
  const stat = (key: keyof Omit<MonitorSample, "time" | "source">, peak = false) => {
    const values = history.map(s => s[key]).filter((v): v is number => v !== null && Number.isFinite(v));
    return values.length ? peak ? Math.max(...values) : values.reduce((a,b) => a+b,0) / values.length : null;
  };
  const metric = (title: string, icon: ReactNode, key: "cpu" | "memory" | "swap" | "disk", detail: string) => <Card key={key} className="monitor-resource-card">
    <CardContent className="space-y-2 p-4 pb-0">
      <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground"><span className="text-primary [&_svg]:size-4">{icon}</span>{title}</div>
      <p className="text-4xl font-semibold tabular-nums text-foreground">{percent(current[key])}</p>
      <p className="min-h-5 text-sm text-muted-foreground">{detail}</p>
      <div className="flex justify-between text-xs text-muted-foreground"><span>窗口均值 {percent(stat(key))}</span><span>峰值 {percent(stat(key, true))}</span></div>
      <div className="-mx-4 pt-2"><TrendChart compact percent points={points(key)} labels={[title]} /></div>
    </CardContent>
  </Card>;
  return <>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {metric("CPU", <Cpu/>, "cpu", `${monitor.cpu.core_count} 个逻辑核心`)}
      {metric("内存", <MemoryStick/>, "memory", `${bytes(host?.memory.used ?? monitor.memory.used)} / ${bytes(host?.memory.total ?? monitor.memory.total)}`)}
      {metric("交换空间", <ArrowDownUp/>, "swap", host?.swap ? host.swap.total ? `${bytes(host.swap.used)} / ${bytes(host.swap.total)}` : "未配置交换空间" : "当前数据源未提供")}
      {metric("存储", <HardDrive/>, "disk", `${bytes(host?.disk.used)} / ${bytes(host?.disk.total)}`)}
    </div>
    <div className="grid gap-4 xl:grid-cols-3">
      <div className="min-w-0 xl:col-span-2"><MonitorCard compact title="网络吞吐" icon={<Network/>}>
        <div className="space-y-4">
          <div className="flex flex-wrap justify-between gap-2 text-sm tabular-nums"><span className="text-primary">↑ 发送 {rate(current.tx)}</span><span className="text-muted-foreground">↓ 接收 {rate(current.rx)}</span></div>
          <TrendChart points={points("tx", "rx")} labels={["发送速率", "接收速率"]} formatValue={value => rate(value)}/>
          <div className="grid gap-3 border-t border-border pt-4 text-sm sm:grid-cols-3">
            <div className="text-muted-foreground">累计发送<p className="mt-1 font-semibold text-foreground">{bytes(host?.network.sent_bytes)}</p></div>
            <div className="text-muted-foreground">累计接收<p className="mt-1 font-semibold text-foreground">{bytes(host?.network.received_bytes)}</p></div>
            <div className="text-muted-foreground">窗口均值<p className="mt-1 font-semibold text-foreground">↑ {rate(stat("tx"))} ↓ {rate(stat("rx"))}</p></div>
          </div>
        </div>
      </MonitorCard></div>
      <MonitorCard compact title="连接数" icon={<Activity/>}>
        <div className="space-y-4">
          <p className="text-4xl font-semibold tabular-nums">{current.tcp != null && current.udp != null ? current.tcp + current.udp : "—"}<span className="ml-2 text-sm font-normal text-muted-foreground">使用中的套接字</span></p>
          <div className="flex justify-between text-sm"><span className="text-primary">TCP {current.tcp ?? "—"}</span><span className="text-muted-foreground">UDP {current.udp ?? "—"}</span></div>
          <TrendChart points={points("tcp", "udp")} labels={["TCP", "UDP"]} formatValue={value => value == null ? "—" : Math.round(value).toLocaleString("zh-CN")}/>
          {current.tcp == null && <p className="text-xs text-muted-foreground">当前采集器未提供连接数，不以零值代替。</p>}
        </div>
      </MonitorCard>
    </div>
  </>;
}
