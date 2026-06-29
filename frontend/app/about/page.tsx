import {
  Cloud,
  Database,
  Network,
  Server,
  type LucideIcon,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Tag } from "@/components/ui/tag";

const stacks = [
  "Linux",
  "Docker",
  "Kubernetes",
  "PostgreSQL",
  "网络",
  "DevOps",
  "云服务器",
  "监控告警",
  "自动化运维",
  "Python",
];

const focusCards: Array<[LucideIcon, string]> = [
  [Server, "服务器"],
  [Cloud, "云服务"],
  [Database, "数据库"],
  [Network, "网络"],
];

export default function AboutPage() {
  return (
    <section className="mx-auto max-w-5xl px-4 py-10">
      <p className="text-sm font-bold text-primary">About</p>
      <h1 className="mt-2 text-3xl font-black text-foreground">关于</h1>
      <div className="mt-7 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <Card className="bg-primary text-primary-foreground">
          <CardContent className="p-6">
            <h2 className="text-2xl font-black">
              把每一次排查都变成下一次的路标
            </h2>
            <p className="mt-4 leading-8 text-primary-foreground/75">
              这个博客用于记录个人在运维、DevOps、Linux、Docker、网络、数据库和云服务方向的学习与实践，也作为学习
              Python 后端开发的长期项目。
            </p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              {focusCards.map(([Icon, label]) => (
                <div
                  key={label}
                  className="rounded-md bg-[color-mix(in_srgb,var(--primary-foreground)_12%,transparent)] p-3"
                >
                  <Icon className="h-5 w-5" aria-hidden="true" />
                  <p className="mt-2 text-sm font-bold">{label}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <h2 className="text-xl font-black text-foreground">关注方向</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {stacks.map((item) => (
                <Tag key={item} variant="primary" className="px-3 py-2 text-sm">
                  {item}
                </Tag>
              ))}
            </div>
            <div className="mt-8">
              <h2 className="text-xl font-black text-foreground">联系方式</h2>
              <p className="mt-3 leading-7 text-muted-foreground">
                第一版先保留为可配置内容。后续可以把关于页内容做成后台可编辑，或者扩展为个人资料、社交链接和站点公告。
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
