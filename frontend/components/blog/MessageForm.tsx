"use client";

import { Send } from "lucide-react";
import { FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api/v1";

export function MessageForm() {
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
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
    <Card className="motion-surface">
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Input label="昵称" name="nickname" required maxLength={64} />
            <Input label="邮箱" name="email" type="email" required />
          </div>
          <Textarea
            label="留言"
            name="content"
            required
            minLength={2}
            maxLength={2000}
            rows={5}
          />
          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" disabled={status === "loading"}>
              <Send className="h-4 w-4" aria-hidden="true" />
              提交留言
            </Button>
            {message ? (
              <span
                className={
                  status === "error"
                    ? "motion-notice text-sm font-semibold text-destructive"
                    : "motion-notice text-sm font-semibold text-primary"
                }
              >
                {message}
              </span>
            ) : null}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
