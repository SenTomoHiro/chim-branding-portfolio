"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

type AdminIconButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children" | "aria-label"> & {
  label: string;
  icon: ReactNode;
  tone?: "default" | "danger";
};

export function AdminIconButton({ label, icon, tone = "default", className = "", ...props }: AdminIconButtonProps) {
  return <button
    type="button"
    className={`adminIconButton ${tone === "danger" ? "isDanger" : ""} ${className}`.trim()}
    aria-label={label}
    title={label}
    {...props}
  >{icon}</button>;
}

export function ChapterSplitIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5H5v14h4M15 5h4v14h-4M10 12H7m7 0h3" /></svg>;
}

export function TrashIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14M9 7V4h6v3m2 0-1 13H8L7 7m3 4v5m4-5v5" /></svg>;
}
