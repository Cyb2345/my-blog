import type { Post } from "@/types/blog";

export type DocTreeItem = {
  id: number;
  slug: string;
  title: string;
  updated_at: string;
};

export type DocTreeGroup = {
  id: string;
  name: string;
  slug: string;
  items: DocTreeItem[];
};

export function buildDocTree(posts: Post[]): DocTreeGroup[] {
  const groups = new Map<string, DocTreeGroup>();

  for (const post of posts) {
    const category = post.category;
    const groupId = category ? `category-${category.id}` : "category-none";
    const group = groups.get(groupId) ?? {
      id: groupId,
      name: category?.name ?? "未分类",
      slug: category?.slug ?? "uncategorized",
      items: [],
    };

    group.items.push({
      id: post.id,
      slug: post.slug,
      title: post.title,
      updated_at: post.updated_at,
    });
    groups.set(groupId, group);
  }

  return Array.from(groups.values())
    .map((group) => ({
      ...group,
      items: group.items.sort((a, b) => a.title.localeCompare(b.title, "zh-CN")),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "zh-CN"));
}

export function firstDoc(groups: DocTreeGroup[]) {
  return groups.flatMap((group) => group.items)[0] ?? null;
}
