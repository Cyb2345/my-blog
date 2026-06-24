import type { Metadata } from "next";
import type { ReactNode } from "react";

import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { RouteTransition } from "@/components/layout/RouteTransition";
import { ScrollManager } from "@/components/layout/ScrollManager";
import { ThemeProvider } from "@/components/theme/ThemeProvider";

import "./globals.css";

import type { Envelope, SiteConfig } from "@/types/blog";

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api/v1").replace(/\/$/, "");

type RuntimeOptions = {
  default_theme?: "light" | "dark" | "system";
};

async function getPublicData<T>(path: string, fallback: T): Promise<T> {
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, { cache: "no-store" });
    if (!response.ok) return fallback;
    const body = (await response.json()) as Envelope<T>;
    return body.data ?? fallback;
  } catch {
    return fallback;
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const config = await getPublicData<SiteConfig>("/site/config", {});
  const title = config.site_name || "技术札记";
  const description = config.site_description || "个人技术博客，记录运维、DevOps、Linux、Docker 与 Python 学习。";
  const favicon = config.favicon_url || undefined;
  return {
    title,
    description,
    icons: favicon
      ? {
          icon: favicon,
          shortcut: favicon,
        }
      : undefined,
  };
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const runtime = await getPublicData<RuntimeOptions>("/site/runtime-options", {
    default_theme: "system",
  });
  return (
    <html lang="zh-CN" data-scroll-behavior="smooth" suppressHydrationWarning>
      <body>
        <ThemeProvider defaultTheme={runtime.default_theme ?? "system"}>
          <ScrollManager />
          <div className="flex min-h-screen flex-col">
            <Header />
            <main className="flex-1">
              <RouteTransition>{children}</RouteTransition>
            </main>
            <Footer />
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
