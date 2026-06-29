"use client";

import { ArrowLeft, LockKeyhole, RefreshCw, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { Button } from "@/components/ui/button";
import { API_BASE_URL, setToken } from "@/lib/auth";
import { cn } from "@/lib/utils";
import type { CaptchaPayload, Envelope, LoginSuccess } from "@/types/blog";

export type CaptchaType = "none" | "image" | "slider" | "turnstile";

type AdminLoginFormProps = {
  backgroundUrl: string;
  backgroundDisplay: "cover" | "contain" | "auto";
  backgroundPosition: string;
  overlayEnabled: boolean;
  overlayOpacity: number;
  captchaType: CaptchaType;
  mfaEnabled: boolean;
};

const fieldClass =
  "h-11 w-full rounded-md border border-white/12 bg-black/28 px-3 text-sm font-medium text-white outline-none ring-[color-mix(in_srgb,var(--primary)_24%,transparent)] placeholder:text-white/42 focus:border-[var(--primary)] focus:ring-4";

const labelClass = "grid gap-2 text-sm font-semibold text-white/78";

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

export function AdminLoginForm({
  backgroundUrl,
  backgroundDisplay,
  backgroundPosition,
  overlayEnabled,
  overlayOpacity,
  captchaType,
  mfaEnabled,
}: AdminLoginFormProps) {
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
    <main className="relative flex min-h-[100svh] flex-col overflow-hidden bg-[#0b0b0c] px-4 py-5 text-white sm:px-6">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(79,124,255,0.16),transparent_28rem)]" aria-hidden="true" />
      {backgroundUrl ? (
        <div
          className={cn(
            "absolute inset-0 bg-no-repeat transition-opacity duration-500",
            backgroundLoaded ? "opacity-100" : "opacity-0",
          )}
          style={{
            backgroundImage: `url(${backgroundUrl})`,
            backgroundSize: backgroundDisplay,
            backgroundPosition,
          }}
          aria-hidden="true"
        />
      ) : null}
      {overlayEnabled ? (
        <div className="absolute inset-0 bg-black" style={{ opacity: overlayOpacity }} aria-hidden="true" />
      ) : null}

      <div className="relative z-10 mx-auto flex max-w-6xl items-center justify-between">
        <Link
          href="/"
          className="interactive inline-flex min-h-10 items-center gap-2 rounded-md bg-black/34 px-3 py-2 text-sm font-semibold text-white shadow-sm ring-1 ring-white/15 backdrop-blur hover:bg-black/46"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          返回首页
        </Link>
        <ThemeToggle />
      </div>

      <section className="relative z-10 grid min-h-0 flex-1 place-items-center py-6 sm:py-8">
        <div className="motion-surface w-full max-w-[460px] rounded-lg border border-white/12 bg-[color-mix(in_srgb,var(--surface-card)_88%,transparent)] p-6 text-[var(--text)] shadow-2xl backdrop-blur-xl sm:p-8">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-md bg-[var(--primary)] text-white shadow-soft">
            <LockKeyhole className="h-7 w-7" aria-hidden="true" />
          </div>
          <div className="mt-5 text-center">
            <h1 className="text-2xl font-black">后台登录</h1>
            <p className="mt-2 text-sm font-medium text-[var(--text-muted)]">请输入账号信息进入管理后台</p>
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
                    className="interactive grid h-11 place-items-center overflow-hidden rounded-md border border-white/12 bg-black/28 text-sm font-semibold text-white shadow-sm ring-[color-mix(in_srgb,var(--primary)_24%,transparent)] hover:border-[var(--primary)]"
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
              <div className="rounded-md border border-[color-mix(in_srgb,var(--warning)_42%,transparent)] bg-[color-mix(in_srgb,var(--warning)_14%,transparent)] px-3 py-2 text-sm font-semibold text-[var(--warning)]">
                当前验证码类型暂未接入，请联系管理员调整登录验证码配置。
              </div>
            ) : null}

            {mfaEnabled ? (
              <label className={labelClass}>
                MFA 动态验证码
                <div className="relative">
                  <ShieldCheck className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                  <input
                    name="mfa_code"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    placeholder="请输入 6 位动态验证码"
                    className={cn(fieldClass, "pl-9")}
                  />
                </div>
                <span className="text-xs font-medium text-muted-foreground">请输入认证器中的 6 位动态验证码。</span>
              </label>
            ) : null}

            {error ? (
              <p className="motion-notice rounded-md bg-destructive/10 px-3 py-2 text-sm font-semibold text-destructive">
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
