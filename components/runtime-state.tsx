"use client";

export function RuntimeLoading({ label = "正在加载案例…" }: { label?: string }) {
  return <main className="runtimeState" aria-live="polite"><p>{label}</p></main>;
}

export function RuntimeError({ message, retry }: { message: string; retry: () => void }) {
  return <main className="runtimeState"><p>{message}</p><button type="button" onClick={retry}>重试</button></main>;
}
