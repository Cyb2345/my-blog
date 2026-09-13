import "server-only";

import type { Envelope } from "@/types/blog";

export const SERVER_API_BASE_URL = (
  process.env.INTERNAL_API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "http://localhost:8000/api/v1"
).replace(/\/$/, "");

export async function serverApiFetch<T>(
  path: string,
  fallback: T,
): Promise<T> {
  try {
    const response = await fetch(`${SERVER_API_BASE_URL}${path}`, {
      cache: "no-store",
    });
    if (!response.ok) return fallback;
    const body = (await response.json()) as Envelope<T>;
    return body.data ?? fallback;
  } catch {
    return fallback;
  }
}
