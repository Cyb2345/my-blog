"use client";

import type { Envelope } from "@/types/blog";

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api/v1";
const TOKEN_KEY = "blog_admin_token";

type ApiErrorBody = {
  detail?: unknown;
};

function formatApiError(body: ApiErrorBody | Envelope<unknown>) {
  if ("message" in body && typeof body.message === "string") return body.message;
  if (!("detail" in body)) return "Request failed";

  const detail = body.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((item) => {
        if (typeof item === "string") return item;
        if (item && typeof item === "object") {
          const record = item as { loc?: unknown[]; msg?: unknown };
          const field = Array.isArray(record.loc) ? record.loc.slice(1).join(".") : "";
          const message = typeof record.msg === "string" ? record.msg : JSON.stringify(item);
          return field ? `${field}: ${message}` : message;
        }
        return String(item);
      })
      .join("；");
  }
  if (detail && typeof detail === "object") return JSON.stringify(detail);
  return detail ? String(detail) : "Request failed";
}

export function getToken() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  window.localStorage.removeItem(TOKEN_KEY);
}

export async function adminRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: token ? `Bearer ${token}` : "",
      ...(init?.headers ?? {}),
    },
  });
  const body = (await response.json()) as Envelope<T> | ApiErrorBody;
  if (!response.ok) {
    throw new Error(formatApiError(body));
  }
  if ("code" in body) return body.data;
  return body as T;
}

export async function adminUpload<T>(path: string, formData: FormData): Promise<T> {
  const token = getToken();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      Authorization: token ? `Bearer ${token}` : "",
    },
    body: formData,
  });
  const body = (await response.json()) as Envelope<T> | ApiErrorBody;
  if (!response.ok) {
    throw new Error(formatApiError(body));
  }
  if ("code" in body) return body.data;
  return body as T;
}
