import { Library } from "lucide-react";

import { DocsTree } from "@/components/docs/DocsTree";
import type { DocTreeGroup } from "@/lib/docs";

type Props = {
  activeSlug?: string;
  groups: DocTreeGroup[];
};

export function DocsNav({ activeSlug, groups }: Props) {
  return (
    <>
      <details className="docs-drawer lg:hidden">
        <summary>
          <span className="inline-flex items-center gap-2">
            <Library className="h-4 w-4" aria-hidden="true" />
            知识库目录
          </span>
        </summary>
        <div className="docs-drawer__body">
          <DocsTree activeSlug={activeSlug} groups={groups} />
        </div>
      </details>

      <aside className="docs-sidebar hidden lg:block">
        <div className="docs-sidebar__inner">
          <div className="mb-3 inline-flex items-center gap-2 text-sm font-black text-foreground text-foreground">
            <Library
              className="h-4 w-4 text-primary text-primary"
              aria-hidden="true"
            />
            知识库目录
          </div>
          <DocsTree activeSlug={activeSlug} groups={groups} />
        </div>
      </aside>
    </>
  );
}
