"use client";

import { useRouter } from "next/navigation";
import type { Business } from "@/lib/types";

const listRoutes = new Set(["/", "/food", "/drinks", "/ip", "/other", "/photo"]);

export function DetailCloseButton({ business, fallback }: { business: Business; fallback: "/" | "/photo" }) {
  const router = useRouter();

  function close() {
    const raw = sessionStorage.getItem("chim-case-list-entry");
    sessionStorage.removeItem("chim-case-list-entry");
    try {
      const entry = raw ? JSON.parse(raw) as { source?: string; target?: string } : null;
      if (entry?.target === window.location.pathname && entry.source && listRoutes.has(entry.source)) {
        router.back();
        return;
      }
    } catch {}
    router.push(fallback);
  }

  return <button className="detailClose" data-business={business} type="button" onClick={close} aria-label="返回案例列表"><span aria-hidden="true">×</span></button>;
}
