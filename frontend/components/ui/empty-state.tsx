import { Empty } from "@/components/ui/empty";

export function EmptyState({ title = "暂时没有内容", description }: { title?: string; description?: string }) {
  return <Empty title={title} description={description} className="bg-white/55" />;
}
