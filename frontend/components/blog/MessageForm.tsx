"use client";

import { Send } from "lucide-react";
import { FormEvent, useState } from "react";

import { Button } from "@/components/ui/Button";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api/v1";

export function MessageForm() {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");
    setMessage("");
    const form = new FormData(event.currentTarget);
    const payload = {
      nickname: form.get("nickname"),
      email: form.get("email"),
      content: form.get("content"),
    };
    const response = await fetch(`${API_BASE_URL}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (response.ok) {
      event.currentTarget.reset();
      setStatus("success");
      setMessage("留言已提交，审核通过后会显示在页面上。");
    } else {
      const body = await response.json().catch(() => null);
      setStatus("error");
      setMessage(body?.detail ?? "提交失败，请稍后再试。");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="motion-surface space-y-4 rounded-lg border border-ink/10 bg-white/80 p-5 shadow-sm">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-2 text-sm font-semibold text-ink">
          昵称
          <input
            name="nickname"
            required
            maxLength={64}
            className="rounded-md border border-ink/10 bg-white px-3 py-2 outline-none ring-ocean/25 transition focus:ring-4"
          />
        </label>
        <label className="grid gap-2 text-sm font-semibold text-ink">
          邮箱
          <input
            name="email"
            type="email"
            required
            className="rounded-md border border-ink/10 bg-white px-3 py-2 outline-none ring-ocean/25 transition focus:ring-4"
          />
        </label>
      </div>
      <label className="grid gap-2 text-sm font-semibold text-ink">
        留言
        <textarea
          name="content"
          required
          minLength={2}
          maxLength={2000}
          rows={5}
          className="resize-y rounded-md border border-ink/10 bg-white px-3 py-2 outline-none ring-ocean/25 transition focus:ring-4"
        />
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={status === "loading"}>
          <Send className="h-4 w-4" aria-hidden="true" />
          提交留言
        </Button>
        {message ? (
          <span className={status === "error" ? "notice-pop text-sm text-red-700" : "notice-pop text-sm text-moss"}>
            {message}
          </span>
        ) : null}
      </div>
    </form>
  );
}
