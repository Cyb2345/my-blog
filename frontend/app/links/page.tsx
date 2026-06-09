import { ExternalLink } from "lucide-react";
import Image from "next/image";

import { safeApiFetch } from "@/lib/api";
import { fallbackLinks } from "@/lib/fallback";
import { getAssetUrl } from "@/lib/utils";
import type { FriendLink } from "@/types/blog";

export default async function LinksPage() {
  const links = await safeApiFetch<FriendLink[]>("/links", fallbackLinks);

  return (
    <section className="mx-auto max-w-6xl px-4 py-10">
      <p className="text-sm font-bold text-ocean">Friends</p>
      <h1 className="mt-2 text-3xl font-black text-ink">友链</h1>
      <div className="motion-list mt-7 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {links.map((link) => (
          <a
            key={link.id}
            href={link.url}
            target="_blank"
            rel="noreferrer"
            className="interactive-card group rounded-lg border border-ink/10 bg-white/80 p-5 shadow-sm hover:shadow-soft"
          >
            <div className="flex items-center gap-4">
              <Image
                src={getAssetUrl(link.avatar)}
                alt={link.name}
                width={56}
                height={56}
                className="h-14 w-14 rounded-md object-cover"
              />
              <div className="min-w-0">
                <h2 className="flex items-center gap-2 text-lg font-black text-ink group-hover:text-ocean">
                  {link.name}
                  <ExternalLink className="h-4 w-4" aria-hidden="true" />
                </h2>
                <p className="truncate text-xs text-ink/45">{link.url}</p>
              </div>
            </div>
            <p className="mt-4 line-clamp-3 text-sm leading-6 text-ink/60">{link.description}</p>
          </a>
        ))}
      </div>
    </section>
  );
}
