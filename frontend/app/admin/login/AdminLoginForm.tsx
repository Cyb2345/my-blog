"use client";

import { ArrowLeft, LockKeyhole, RefreshCw, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { Button } from "@/components/ui/Button";
import { API_BASE_URL, setToken } from "@/lib/auth";
import { cn } from "@/lib/utils";
import type { CaptchaPayload, Envelope, LoginSuccess } from "@/types/blog";

export type CaptchaType = "none" | "image" | "slider" | "turnstile";

type AdminLoginFormProps = {
  backgroundUrl: string;
  captchaType: CaptchaType;
  mfaEnabled: boolean;
};

const fieldClass =
  "h-11 w-full rounded-md border border-ink/15 bg-white/95 px-3 text-sm font-medium text-ink outline-none ring-ocean/15 placeholder:text-ink/40 focus:border-ocean focus:ring-4 dark:border-[var(--border)] dark:bg-[var(--bg-soft)] dark:text-[var(--text)] dark:placeholder:text-[var(--text-muted)] dark:focus:border-[var(--primary)] dark:focus:ring-[color-mix(in_srgb,var(--primary)_24%,transparent)]";

const labelClass = "grid gap-2 text-sm font-semibold text-ink/75 dark:text-[var(--text-secondary)]";

function getFormString(form: FormData, key: string) {
  const value = form.get(key);
  return typeof value === "string" ? value : "";
}

function formatError(body: unknown) {
  if (!body || typeof body !== "object") return "请求失败，请稍后重试";
  const message = (body as { message?: unknown }).message;
  if (typeof message === "string" && message) return message;
  const detail = (body as { detail?: unknown }).detail;
  if (typeof detail === "string" && detail) return detail;
  if (Array.isArray(detail)) {
    return detail.map((item) => (typeof item === "string" ? item : JSON.stringify(item))).join("；");
  }
  return detail ? JSON.stringify(detail) : "请求失败，请稍后重试";
}

export function AdminLoginForm({ backgroundUrl, captchaType, mfaEnabled }: AdminLoginFormProps) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [captcha, setCaptcha] = useState<CaptchaPayload | null>(null);
  const [backgroundLoaded, setBackgroundLoaded] = useState(!backgroundUrl);

  const imageCaptchaEnabled = captchaType === "image";
  const captchaUnsupported = captchaType === "slider" || captchaType === "turnstile";

  const loadCaptcha = useCallback(async () => {
    if (!imageCaptchaEnabled) {
      setCaptcha(null);
      return;
    }
    try {
      const response = await fetch(`${API_BASE_URL}/auth/captcha`, { cache: "no-store" });
      const body = (await response.json()) as Envelope<CaptchaPayload>;
      setCaptcha(body.data ?? null);
    } catch {
      setCaptcha(null);
    }
  }, [imageCaptchaEnabled]);

  useEffect(() => {
    void loadCaptcha();
  }, [loadCaptcha]);

  useEffect(() => {
    if (!backgroundUrl) {
      setBackgroundLoaded(true);
      return;
    }
    setBackgroundLoaded(false);
    const image = new Image();
    image.onload = () => setBackgroundLoaded(true);
    image.onerror = () => setBackgroundLoaded(true);
    image.src = backgroundUrl;
  }, [backgroundUrl]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (captchaUnsupported) return;

    setLoading(true);
    setError("");

    const form = new FormData(event.currentTarget);
    const payload: Record<string, string | null> = {
      username: getFormString(form, "username").trim(),
      password: getFormString(form, "password"),
    };

    if (imageCaptchaEnabled) {
      payload.captcha_id = captcha?.captcha_id ?? "";
      payload.captcha_code = getFormString(form, "captcha_code").trim();
    }
    if (mfaEnabled) {
      payload.mfa_code = getFormString(form, "mfa_code").trim() || null;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        setError(formatError(body));
        if (imageCaptchaEnabled) void loadCaptcha();
        return;
      }
      const data = (body as Envelope<LoginSuccess>).data;
      setToken(data.access_token);
      router.replace("/admin");
    } catch {
      setError("网络请求失败，请稍后重试");
      if (imageCaptchaEnabled) void loadCaptcha();
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative min-h-[100svh] overflow-hidden bg-[var(--bg)] px-4 py-5 text-ink dark:text-[var(--text)] sm:px-6">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(68,112,143,0.18),transparent_28rem)] dark:bg-[radial-gradient(circle_at_20%_10%,rgba(79,124,255,0.16),transparent_28rem)]" aria-hidden="true" />
      {backgroundUrl ? (
        <div
          className={cn(
            "absolute inset-0 bg-cover bg-center transition-opacity duration-500",
            backgroundLoaded ? "opacity-100" : "opacity-0",
          )}
          style={{ backgroundImage: `url(${backgroundUrl})` }}
          aria-hidden="true"
        />
      ) : null}
      <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] dark:bg-black/48" aria-hidden="true" />

      <div className="relative z-10 mx-auto flex max-w-6xl items-center justify-between">
        <Link
          href="/"
          className="interactive inline-flex min-h-10 items-center gap-2 rounded-md bg-white/80 px-3 py-2 text-sm font-semibold text-ink shadow-sm ring-1 ring-ink/10 backdrop-blur hover:text-ocean dark:bg-[color-mix(in_srgb,var(--surface-soft)_86%,transparent)] dark:text-[var(--text)] dark:ring-[var(--border-soft)] dark:hover:text-[color-mix(in_srgb,var(--primary)_78%,white)]"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          返回首页
        </Link>
        <ThemeToggle />
      </div>

      <section className="relative z-10 grid min-h-[calc(100svh-4.5rem)] place-items-center py-8">
        <div className="motion-surface w-full max-w-[460px] rounded-lg border border-ink/10 bg-white/92 p-6 text-ink shadow-2xl backdrop-blur-xl dark:border-[var(--border)] dark:bg-[color-mix(in_srgb,var(--surface-card)_92%,transparent)] dark:text-[var(--text)] sm:p-8">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-md bg-ink text-white shadow-soft dark:bg-[var(--primary)] dark:text-[var(--bg)]">
            <LockKeyhole className="h-7 w-7" aria-hidden="true" />
          </div>
          <div className="mt-5 text-center">
            <h1 className="text-2xl font-black">后台登录</h1>
            <p className="mt-2 text-sm font-medium text-ink/58 dark:text-[var(--text-muted)]">请输入账号信息进入管理后台</p>
          </div>

          <form onSubmit={handleSubmit} className="mt-7 grid gap-4">
            <label className={labelClass}>
              用户名或邮箱
              <input name="username" required autoComplete="username" className={fieldClass} />
            </label>

            <label className={labelClass}>
              密码
              <input name="password" type="password" required autoComplete="current-password" className={fieldClass} />
            </label>

            {imageCaptchaEnabled ? (
              <label className={labelClass}>
                验证码
                <div className="grid grid-cols-[minmax(0,1fr)_8.75rem] gap-2">
                  <input
                    name="captcha_code"
                    required
                    className={cn(fieldClass, "uppercase tracking-[0.18em]")}
                    autoComplete="off"
                  />
                  <button
                    type="button"
                    onClick={() => void loadCaptcha()}
                    className="interactive grid h-11 place-items-center overflow-hidden rounded-md border border-ink/15 bg-white/90 text-sm font-semibold text-ink shadow-sm ring-ocean/15 hover:border-ocean dark:border-[var(--border)] dark:bg-[var(--bg-soft)] dark:text-[var(--text)] dark:hover:border-[var(--primary)]"
                    aria-label="刷新验证码"
                    title="刷新验证码"
                  >
                    {captcha?.image ? (
                      <img src={captcha.image} alt="验证码" className="h-full w-full object-contain" />
                    ) : (
                      <RefreshCw className="h-4 w-4" aria-hidden="true" />
                    )}
                  </button>
                </div>
              </label>
            ) : null}

            {captchaUnsupported ? (
              <div className="rounded-md border border-honey/40 bg-honey/10 px-3 py-2 text-sm font-semibold text-ink/75 dark:border-[color-mix(in_srgb,var(--warning)_42%,transparent)] dark:bg-[color-mix(in_srgb,var(--warning)_14%,transparent)] dark:text-[var(--text-secondary)]">
                当前验证码类型暂未接入，请联系管理员调整登录验证码配置。
              </div>
            ) : null}

            {mfaEnabled ? (
              <label className={labelClass}>
                MFA 动态验证码
                <div className="relative">
                  <ShieldCheck className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/35 dark:text-[var(--text-muted)]" aria-hidden="true" />
                  <input
                    name="mfa_code"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    placeholder="请输入 6 位动态验证码"
                    className={cn(fieldClass, "pl-9")}
                  />
                </div>
                <span className="text-xs font-medium text-ink/48 dark:text-[var(--text-muted)]">请输入认证器中的 6 位动态验证码。</span>
              </label>
            ) : null}

            {error ? (
              <p className="notice-pop rounded-md bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 dark:bg-[color-mix(in_srgb,var(--danger)_14%,transparent)] dark:text-[color-mix(in_srgb,var(--danger)_72%,white)]">
                {error}
              </p>
            ) : null}

            <Button type="submit" className="mt-1 h-11 w-full" disabled={loading || captchaUnsupported || (imageCaptchaEnabled && !captcha)}>
              {loading ? "登录中..." : "登录"}
            </Button>
          </form>
        </div>
      </section>
    </main>
  );
}
