import { Suspense } from "react";
import type { Metadata } from "next";
import { RuntimePortfolioPrintPage } from "@/components/runtime-print-page";
import { RuntimeLoading } from "@/components/runtime-state";

export const metadata: Metadata = { title: "Portfolio / PDF", robots: { index: false, follow: false } };
export default function Page() { return <Suspense fallback={<RuntimeLoading label="正在准备 Portfolio…" />}><RuntimePortfolioPrintPage /></Suspense>; }
