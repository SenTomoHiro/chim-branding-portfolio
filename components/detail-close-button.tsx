"use client";

import { useRouter } from "next/navigation";

const listRoutes = new Set(["/", "/food", "/drinks", "/ip", "/other", "/photo"]);

export function DetailCloseButton({ fallback }: { fallback: "/" | "/photo" }) {
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

  return <button className="detailClose" type="button" onClick={close} aria-label="返回案例列表"><span aria-hidden="true">×</span></button>;
}
