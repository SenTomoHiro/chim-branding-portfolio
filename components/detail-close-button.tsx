"use client";

import { useRouter } from "next/navigation";
import { clearCaseListEntry, isCaseListRoute, normalizePortfolioPath, readCaseListEntry, requestCaseListReturn } from "@/lib/return-context";

export function DetailCloseButton({ fallback }: { fallback: "/" | "/photo" }) {
  const router = useRouter();

  function close() {
    const entry = readCaseListEntry();
    const current = normalizePortfolioPath(window.location.pathname);
    if (entry?.target === current && isCaseListRoute(entry.source)) {
      requestCaseListReturn(entry);
      window.history.go(-entry.detailDepth);
      return;
    }
    clearCaseListEntry();
    router.replace(fallback);
  }

  return <button className="floatingButton detailClose" type="button" onClick={close} aria-label="返回案例列表"><span aria-hidden="true">×</span></button>;
}
