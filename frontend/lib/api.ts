import type { Envelope } from "@/types/blog";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api/v1";

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    cache: init?.cache ?? "no-store",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  const body = (await response.json()) as Envelope<T> | { detail?: string };
  if (!response.ok) {
    const detail = "detail" in body ? body.detail : "Request failed";
    throw new Error(detail ?? "Request failed");
  }
  if ("code" in body) return body.data;
  return body as T;
}

export async function safeApiFetch<T>(path: string, fallback: T): Promise<T> {
  try {
    return await apiFetch<T>(path);
  } catch {
    return fallback;
  }
}
