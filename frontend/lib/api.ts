import "server-only";

import type { Envelope } from "@/types/blog";
import { SERVER_API_BASE_URL } from "@/lib/serverApi";

const API_BASE_URL = SERVER_API_BASE_URL;

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
