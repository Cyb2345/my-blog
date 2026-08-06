"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";

export function useAdminViewTransitionNavigate() {
  const router = useRouter();

  return useCallback(
    (to: string) => {
      if (!to) return;
      router.push(to);
    },
    [router],
  );
}
