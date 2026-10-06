"use client";

import { useLayoutEffect } from "react";
import { usePathname } from "next/navigation";
import { clearCaseListReturn, normalizePortfolioPath, readPendingCaseListReturn } from "@/lib/return-context";
import { cancelCoverTransition, completeCoverReturnTransition } from "@/lib/cover-transition";

export function CaseListRestoration() {
  const pathname = usePathname();
  useLayoutEffect(() => {
    const entry = readPendingCaseListReturn();
    if (!entry || entry.source !== normalizePortfolioPath(pathname)) return;
    const card = document.querySelector<HTMLElement>(`[data-case-id="${CSS.escape(entry.caseId)}"]`);
    if (!card) { clearCaseListReturn(); cancelCoverTransition(); return; }
    let cancelled = false;
    const previousRestoration = history.scrollRestoration;
    history.scrollRestoration = "manual";
    // Feed images reserve geometry from their width/height metadata, including lazy images.
    // Wait for text geometry, not for unrelated offscreen network downloads.
    document.fonts.ready.then(() => {
      if (cancelled) return;
      window.scrollTo({ top: Math.max(0, window.scrollY + card.getBoundingClientRect().top - entry.anchorTop), behavior: "instant" });
      clearCaseListReturn();
      history.scrollRestoration = previousRestoration;
      completeCoverReturnTransition(entry.caseId, card);
    });
    return () => { cancelled = true; history.scrollRestoration = previousRestoration; };
  }, [pathname]);
  return null;
}
