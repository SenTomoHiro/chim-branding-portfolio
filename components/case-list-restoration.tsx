"use client";

import { useLayoutEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { clearCaseListReturn, normalizePortfolioPath, readPendingCaseListReturn } from "@/lib/return-context";

export function CaseListRestoration() {
  const pathname = usePathname();
  const router = useRouter();
  useLayoutEffect(() => {
    const entry = readPendingCaseListReturn();
    if (!entry) return;
    if (entry.source !== normalizePortfolioPath(pathname)) {
      router.replace(entry.source);
      return;
    }
    const card = document.querySelector<HTMLElement>(`[data-case-id="${CSS.escape(entry.caseId)}"]`);
    if (!card) { clearCaseListReturn(); return; }
    const previousRestoration = history.scrollRestoration;
    history.scrollRestoration = "manual";
    const restore = () => {
      const documentTop = window.scrollY + card.getBoundingClientRect().top;
      window.scrollTo({ top: Math.max(0, documentTop - entry.anchorTop), behavior: "instant" });
    };
    restore();
    const first = requestAnimationFrame(() => {
      restore();
      requestAnimationFrame(() => {
        restore();
        clearCaseListReturn();
        history.scrollRestoration = previousRestoration;
      });
    });
    return () => cancelAnimationFrame(first);
  }, [pathname, router]);
  return null;
}
