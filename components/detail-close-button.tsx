"use client";

import { useRouter } from "next/navigation";
import { beginCoverReturnTransition, cancelCoverTransition, isCoverReturnTransitionActive } from "@/lib/cover-transition";
import { clearCaseListEntry, isCaseListRoute, normalizePortfolioPath, readCaseListEntry, requestCaseListReturn } from "@/lib/return-context";

export function DetailCloseButton({ fallback }: { fallback: "/" | "/photo" }) {
  const router = useRouter();

  function close() {
    if (isCoverReturnTransitionActive()) return;
    const entry = readCaseListEntry();
    const current = normalizePortfolioPath(`${window.location.pathname}${window.location.search}`);
    if (entry?.target === current && isCaseListRoute(entry.source)) {
      const navigate = () => {
        requestCaseListReturn(entry);
        window.history.go(-entry.detailDepth);
      };
      if (!beginCoverReturnTransition(entry, navigate)) navigate();
      return;
    }
    cancelCoverTransition();
    clearCaseListEntry();
    router.replace(fallback);
  }

  return <button className="floatingButton detailClose" type="button" onClick={close} aria-label="返回案例列表"><span aria-hidden="true">×</span></button>;
}
