import type { Metadata } from "next";
import type { ReactNode } from "react";

import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { RouteTransition } from "@/components/layout/RouteTransition";
import { ScrollManager } from "@/components/layout/ScrollManager";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { serverApiFetch } from "@/lib/serverApi";

import "./globals.css";

import type { SiteConfig } from "@/types/blog";

type RuntimeOptions = {
  default_theme?: "light" | "dark" | "system";
};

export async function generateMetadata(): Promise<Metadata> {
  const config = await serverApiFetch<SiteConfig>("/site/config", {});
  const title = config.site_name || "技术札记";
  const description =
    config.site_description ||
    "个人技术博客，记录运维、DevOps、Linux、Docker 与 Python 学习。";
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

export default async function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  const runtime = await serverApiFetch<RuntimeOptions>("/site/runtime-options", {
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
