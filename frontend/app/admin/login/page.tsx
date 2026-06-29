import { AdminLoginForm, type CaptchaType } from "./AdminLoginForm";
import type { Envelope } from "@/types/blog";

export const dynamic = "force-dynamic";

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api/v1"
).replace(/\/$/, "");
const BACKEND_ORIGIN = API_BASE_URL.replace(/\/api\/v1\/?$/, "");

type LoginBackgroundPayload = {
  image_url?: string | null;
  display?: "cover" | "contain" | "auto" | null;
  position?: string | null;
  overlay_enabled?: boolean | null;
  overlay_opacity?: number | null;
};

type LoginOptionsPayload = {
  captcha_type?: string | null;
  mfa_enabled?: boolean | null;
};

const fallbackLoginOptions: Required<LoginOptionsPayload> = {
  captcha_type: "image",
  mfa_enabled: false,
};

function normalizeCaptchaType(value?: string | null): CaptchaType {
  const type = (value ?? "").trim().toLowerCase();
  if (
    type === "none" ||
    type === "image" ||
    type === "slider" ||
    type === "turnstile"
  )
    return type;
  return "image";
}

function resolveAssetUrl(url?: string | null) {
  if (!url) return "";
  if (
    url.startsWith("http://") ||
    url.startsWith("https://") ||
    url.startsWith("data:")
  )
    return url;
  if (url.startsWith("/uploads/")) return `${BACKEND_ORIGIN}${url}`;
  return url;
}

async function fetchPublicData<T>(path: string, fallback: T): Promise<T> {
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      cache: "no-store",
    });
    if (!response.ok) return fallback;
    const body = (await response.json()) as Envelope<T>;
    return body.data ?? fallback;
  } catch {
    return fallback;
  }
}

export default async function AdminLoginPage() {
  const [background, options] = await Promise.all([
    fetchPublicData<LoginBackgroundPayload>("/site/login-background", {
      image_url: "",
      display: "cover",
      position: "center center",
      overlay_enabled: true,
      overlay_opacity: 0.35,
    }),
    fetchPublicData<LoginOptionsPayload>(
      "/auth/login-options",
      fallbackLoginOptions,
    ),
  ]);
  const backgroundUrl = resolveAssetUrl(background.image_url);
  const captchaType = normalizeCaptchaType(options.captcha_type);

  return (
    <>
      {backgroundUrl ? (
        <link rel="preload" as="image" href={backgroundUrl} />
      ) : null}
      <AdminLoginForm
        backgroundUrl={backgroundUrl}
        backgroundDisplay={background.display ?? "cover"}
        backgroundPosition={background.position ?? "center center"}
        overlayEnabled={background.overlay_enabled !== false}
        overlayOpacity={Math.min(
          Math.max(Number(background.overlay_opacity ?? 0.35), 0),
          0.8,
        )}
        captchaType={captchaType}
        mfaEnabled={Boolean(options.mfa_enabled)}
      />
    </>
  );
}
