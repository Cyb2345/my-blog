import { Eye, Folder, Tag as TagIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { Card } from "@/components/ui/card";
import { Tag } from "@/components/ui/tag";
import { formatDate, getAssetUrl } from "@/lib/utils";
import type { Post } from "@/types/blog";

export function PostCard({ post }: { post: Post }) {
  return (
    <Card className="interactive-card grid md:grid-cols-[210px_1fr]">
      <Link
        href={`/posts/${post.slug}`}
        className="group relative block aspect-[16/10] min-h-44 overflow-hidden md:aspect-auto"
      >
        <Image
          src={getAssetUrl(post.cover_image)}
          alt={post.title}
          fill
          sizes="(max-width: 768px) 100vw, 220px"
          className="object-cover transition duration-500 ease-out group-hover:scale-105"
        />
      </Link>
      <div className="flex flex-col gap-3 p-5">
        <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-muted-foreground">
          <span>{formatDate(post.published_at ?? post.created_at)}</span>
          {post.category ? (
            <Link
              href={`/categories/${post.category.slug}`}
              className="interactive inline-flex items-center gap-1 hover:text-primary"
            >
              <Folder className="h-3.5 w-3.5" aria-hidden="true" />
              {post.category.name}
            </Link>
          ) : null}
          <span className="inline-flex items-center gap-1">
            <Eye className="h-3.5 w-3.5" aria-hidden="true" />
            {post.view_count}
          </span>
        </div>
        <Link href={`/posts/${post.slug}`}>
          <h2 className="text-xl font-black leading-snug text-foreground transition hover:text-primary">
            {post.title}
          </h2>
        </Link>
        <p className="line-clamp-2 text-sm leading-6 text-muted-foreground">
          {post.summary}
        </p>
        <div className="mt-auto flex flex-wrap gap-2">
          {post.tags?.map((tag) => (
            <Link
              key={tag.id}
              href={`/tags/${tag.slug}`}
              className="interactive"
            >
              <Tag variant="primary">
                <TagIcon className="h-3 w-3" aria-hidden="true" />
                {tag.name}
              </Tag>
            </Link>
          ))}
        </div>
      </div>
    </Card>
  );
}
