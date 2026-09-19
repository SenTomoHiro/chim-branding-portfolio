"use client";

import { useRouter } from "next/navigation";
import { clearCaseListEntry, isCaseListRoute, normalizePortfolioPath, readCaseListEntry, requestCaseListReturn } from "@/lib/return-context";

export function DetailCloseButton({ fallback }: { fallback: "/" | "/photo" }) {
  const router = useRouter();

  function close() {
    const entry = readCaseListEntry();
    const current = normalizePortfolioPath(window.location.pathname);
    if (entry?.target === current && isCaseListRoute(entry.source) && window.history.length > entry.historyLength) {
      requestCaseListReturn(entry);
      router.back();
      return;
    }
    clearCaseListEntry();
    router.replace(fallback);
  }

  return <button className="detailClose" type="button" onClick={close} aria-label="返回案例列表"><span aria-hidden="true">×</span></button>;
}
