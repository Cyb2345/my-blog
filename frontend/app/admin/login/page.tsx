"use client";

import { ArrowLeft, LockKeyhole, RefreshCw, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { Button } from "@/components/ui/Button";
import { API_BASE_URL, setToken } from "@/lib/auth";
import type { CaptchaPayload, Envelope, LoginSuccess } from "@/types/blog";

const BACKEND_ORIGIN = API_BASE_URL.replace(/\/api\/v1$/, "");

function resolveAssetUrl(url: string) {
  if (!url) return "/images/blog-hero.png";
  if (url.startsWith("/uploads/")) return `${BACKEND_ORIGIN}${url}`;
  return url;
}

function formatError(body: unknown) {
  if (!body || typeof body !== "object") return "请求失败";
  const message = (body as { message?: unknown }).message;
  if (typeof message === "string") return message;
  const detail = (body as { detail?: unknown }).detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) return detail.map((item) => (typeof item === "string" ? item : JSON.stringify(item))).join("；");
  return detail ? JSON.stringify(detail) : "请求失败";
}

export default function AdminLoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [captcha, setCaptcha] = useState<CaptchaPayload | null>(null);
  const [backgroundUrl, setBackgroundUrl] = useState("/images/blog-hero.png");

  async function loadCaptcha() {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/captcha`, { cache: "no-store" });
      const body = (await response.json()) as Envelope<CaptchaPayload>;
      setCaptcha(body.data);
    } catch {
      setCaptcha(null);
    }
  }

  useEffect(() => {
    void loadCaptcha();
    fetch(`${API_BASE_URL}/site/login-background`, { cache: "no-store" })
      .then((response) => response.json())
      .then((body: Envelope<{ image_url: string }>) => setBackgroundUrl(resolveAssetUrl(body.data.image_url)))
      .catch(() => setBackgroundUrl("/images/blog-hero.png"));
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: form.get("username"),
        password: form.get("password"),
        captcha_id: captcha?.captcha_id,
        captcha_code: form.get("captcha_code"),
        mfa_code: form.get("mfa_code") || null,
      }),
    });
    const body = await response.json().catch(() => null);
    setLoading(false);
    if (!response.ok) {
      setError(formatError(body));
      void loadCaptcha();
      return;
    }
    const data = (body as Envelope<LoginSuccess>).data;
    setToken(data.access_token);
    router.replace("/admin");
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950 px-4 py-6 text-slate-100">
      <div
        className="absolute inset-0 bg-cover bg-center opacity-75 transition-opacity duration-300"
        style={{ backgroundImage: `url(${backgroundUrl})` }}
        aria-hidden="true"
      />
      <div className="absolute inset-0 bg-slate-950/58 backdrop-blur-[1px]" aria-hidden="true" />

      <div className="relative z-10 mx-auto flex max-w-6xl items-center justify-between">
        <Link
          href="/"
          className="interactive inline-flex min-h-10 items-center gap-2 rounded-md bg-white/12 px-3 py-2 text-sm font-bold text-white backdrop-blur hover:bg-white/18"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          返回首页
        </Link>
        <ThemeToggle />
      </div>

      <section className="relative z-10 grid min-h-[calc(100vh-5.5rem)] place-items-center">
        <div className="motion-surface w-full max-w-md rounded-lg border border-white/20 bg-white/92 p-6 text-ink shadow-2xl backdrop-blur-xl dark:bg-slate-900/92 dark:text-slate-100">
          <div className="mb-6 grid h-12 w-12 place-items-center rounded-md bg-ink text-white dark:bg-sky-400 dark:text-slate-950">
            <LockKeyhole className="h-6 w-6" aria-hidden="true" />
          </div>
          <h1 className="text-2xl font-black">管理员登录</h1>
          <p className="mt-2 text-sm leading-6 text-ink/60 dark:text-slate-400">
            使用管理员账号进入博客后台；已开启 MFA 的账号同时填写认证器中的 6 位动态验证码。
          </p>

          <form onSubmit={handleSubmit} className="mt-6 grid gap-4">
            <label className="grid gap-2 text-sm font-bold">
              用户名或邮箱
              <input name="username" required autoComplete="username" className="rounded-md border border-ink/10 bg-white px-3 py-2 outline-none ring-ocean/20 transition focus:ring-4 dark:border-white/10 dark:bg-slate-950/70 dark:text-slate-100" />
            </label>
            <label className="grid gap-2 text-sm font-bold">
              密码
              <input name="password" type="password" required autoComplete="current-password" className="rounded-md border border-ink/10 bg-white px-3 py-2 outline-none ring-ocean/20 transition focus:ring-4 dark:border-white/10 dark:bg-slate-950/70 dark:text-slate-100" />
            </label>
            <label className="grid gap-2 text-sm font-bold">
              验证码
              <div className="grid gap-2 sm:grid-cols-[1fr_160px]">
                <input name="captcha_code" required className="rounded-md border border-ink/10 bg-white px-3 py-2 uppercase outline-none ring-ocean/20 transition focus:ring-4 dark:border-white/10 dark:bg-slate-950/70 dark:text-slate-100" />
                <button
                  type="button"
                  onClick={() => void loadCaptcha()}
                  className="interactive inline-flex min-h-10 items-center justify-center gap-2 overflow-hidden rounded-md border border-ink/10 bg-paper text-sm font-black text-ink dark:border-white/10 dark:bg-slate-950 dark:text-slate-100"
                  aria-label="刷新验证码"
                >
                  {captcha?.image ? <img src={captcha.image} alt="验证码" className="h-[54px] w-full object-cover" /> : <RefreshCw className="h-4 w-4" aria-hidden="true" />}
                </button>
              </div>
            </label>
            <label className="grid gap-2 text-sm font-bold">
              MFA 动态验证码
              <div className="relative">
                <ShieldCheck className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/35 dark:text-slate-500" aria-hidden="true" />
                <input
                  name="mfa_code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="未开启 MFA 可留空"
                  className="w-full rounded-md border border-ink/10 bg-white py-2 pl-9 pr-3 outline-none ring-ocean/20 transition focus:ring-4 dark:border-white/10 dark:bg-slate-950/70 dark:text-slate-100 dark:placeholder:text-slate-500"
                />
              </div>
            </label>
            {error ? <p className="notice-pop rounded-md bg-red-50 px-3 py-2 text-sm font-bold text-red-700 dark:bg-red-500/10 dark:text-red-200">{error}</p> : null}
            <Button type="submit" disabled={loading || !captcha}>
              {loading ? "登录中..." : "登录后台"}
            </Button>
          </form>
        </div>
      </section>
    </main>
  );
}
