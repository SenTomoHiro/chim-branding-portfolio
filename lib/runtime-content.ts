"use client";

import { useCallback, useEffect, useState } from "react";
import { renumberChapters } from "./chapters";
import { contentOrigin } from "./origins";
import type { ContentData } from "./types";

export function runtimeContentUrl() {
  return `${contentOrigin}/data/content.json`;
}

export function contentMediaUrl(source: string) {
  if (!source.startsWith("/media/") || source.startsWith("//")) return source;
  return `${contentOrigin}/public${source}`;
}

export async function fetchRuntimeContent(signal?: AbortSignal): Promise<ContentData> {
  const separator = runtimeContentUrl().includes("?") ? "&" : "?";
  const response = await fetch(`${runtimeContentUrl()}${separator}v=${Date.now()}`, { cache: "no-store", signal });
  if (!response.ok) throw new Error(`内容加载失败（HTTP ${response.status}）`);
  const data = await response.json() as ContentData;
  return { ...data, cases: data.cases.map((item) => ({ ...item, media: renumberChapters(item.media) })) };
}

export function useRuntimeContent() {
  const [data, setData] = useState<ContentData>();
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const retry = useCallback(() => setRevision((value) => value + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    setData(undefined);
    setError("");
    fetchRuntimeContent(controller.signal).then(setData).catch((reason) => {
      if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "内容加载失败");
    });
    return () => controller.abort();
  }, [revision]);

  return { data, error, retry };
}
