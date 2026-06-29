"use client";

import { Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { Input } from "@/components/ui/input";

type SearchFormProps = {
  activeType: string;
  initialKeyword: string;
};

function buildSearchUrl(keyword: string, type: string) {
  const params = new URLSearchParams();
  if (keyword) params.set("q", keyword);
  if (type !== "all") params.set("type", type);
  const query = params.toString();
  return query ? `/search?${query}` : "/search";
}

export function SearchForm({ activeType, initialKeyword }: SearchFormProps) {
  const router = useRouter();
  const [keyword, setKeyword] = useState(initialKeyword);

  useEffect(() => {
    setKeyword(initialKeyword);
  }, [initialKeyword]);

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    router.push(buildSearchUrl(keyword.trim(), activeType));
    window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
  }

  function clearSearch() {
    setKeyword("");
    router.push(
      activeType === "all" ? "/search" : `/search?type=${activeType}`,
    );
    window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
  }

  return (
    <form
      onSubmit={submitSearch}
      className="motion-surface flex min-h-14 items-center gap-2 rounded-lg border border-border bg-card p-2 shadow-sm"
    >
      <Search
        className="ml-2 h-5 w-5 shrink-0 text-primary"
        aria-hidden="true"
      />
      <Input
        value={keyword}
        onChange={(event) => setKeyword(event.target.value)}
        className="min-w-0 flex-1 border-0 bg-transparent px-1 text-base"
        placeholder="输入关键词搜索文章、知识库、分类、标签..."
        aria-label="搜索关键词"
      />
      {keyword ? (
        <IconButton
          label="清空"
          onClick={clearSearch}
          variant="ghost"
          className="shrink-0"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </IconButton>
      ) : null}
      <Button type="submit" className="shrink-0">
        <Search className="h-4 w-4" aria-hidden="true" />
        <span className="hidden sm:inline">搜索</span>
      </Button>
    </form>
  );
}
