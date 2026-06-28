import { Tag, type TagVariant } from "@/components/ui/Tag";

type StatusTagProps = {
  status: string | boolean | null | undefined;
  label?: string;
  map?: Record<string, { label: string; variant: TagVariant }>;
};

const defaultStatusMap: Record<string, { label: string; variant: TagVariant }> = {
  active: { label: "启用", variant: "success" },
  inactive: { label: "禁用", variant: "danger" },
  enabled: { label: "启用", variant: "success" },
  disabled: { label: "禁用", variant: "danger" },
  published: { label: "已发布", variant: "success" },
  draft: { label: "草稿", variant: "warning" },
  deleted: { label: "已删除", variant: "danger" },
  pending: { label: "待处理", variant: "warning" },
  approved: { label: "已通过", variant: "success" },
  rejected: { label: "已拒绝", variant: "danger" },
  success: { label: "成功", variant: "success" },
  failed: { label: "失败", variant: "danger" },
  true: { label: "是", variant: "success" },
  false: { label: "否", variant: "neutral" },
  normal: { label: "正常", variant: "success" },
  abnormal: { label: "异常", variant: "danger" },
  local: { label: "本地磁盘", variant: "info" },
  r2: { label: "Cloudflare R2", variant: "primary" },
  s3: { label: "S3 Compatible", variant: "info" },
};

export function StatusTag({ status, label, map }: StatusTagProps) {
  const key = String(status ?? "");
  const item = map?.[key] ?? defaultStatusMap[key] ?? { label: (label ?? key) || "-", variant: "neutral" as TagVariant };
  return <Tag variant={item.variant}>{label ?? item.label}</Tag>;
}
