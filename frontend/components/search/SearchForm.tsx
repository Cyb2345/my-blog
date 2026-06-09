"use client";

import { Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

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
    router.push(activeType === "all" ? "/search" : `/search?type=${activeType}`);
    window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
  }

  return (
    <form
      onSubmit={submitSearch}
      className="motion-surface flex min-h-14 items-center gap-2 rounded-lg border border-ink/10 bg-white/90 p-2 shadow-sm dark:border-white/10 dark:bg-slate-950/80"
    >
      <Search className="ml-2 h-5 w-5 shrink-0 text-ocean dark:text-sky-300" aria-hidden="true" />
      <input
        value={keyword}
        onChange={(event) => setKeyword(event.target.value)}
        className="min-w-0 flex-1 border-0 bg-transparent px-1 text-base font-semibold text-ink outline-none placeholder:text-ink/40 dark:text-slate-100 dark:placeholder:text-slate-500"
        placeholder="输入关键词搜索文章、知识库、分类、标签..."
        aria-label="搜索关键词"
      />
      {keyword ? (
        <button
          type="button"
          onClick={clearSearch}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-md text-ink/45 hover:bg-paper hover:text-ink dark:text-slate-500 dark:hover:bg-white/10 dark:hover:text-slate-100"
          aria-label="清空搜索"
          title="清空"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      ) : null}
      <button
        type="submit"
        className="interactive inline-flex min-h-10 shrink-0 items-center gap-2 rounded-md bg-ink px-4 text-sm font-black text-white hover:bg-ocean dark:bg-sky-400 dark:text-slate-950 dark:hover:bg-sky-300"
      >
        <Search className="h-4 w-4" aria-hidden="true" />
        <span className="hidden sm:inline">搜索</span>
      </button>
    </form>
  );
}
