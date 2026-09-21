import { Suspense } from "react";
import type { Metadata } from "next";
import { RuntimeCasePrintPage } from "@/components/runtime-print-page";
import { RuntimeLoading } from "@/components/runtime-state";

export const metadata: Metadata = { title: "PDF Casebook", robots: { index: false, follow: false } };
export default function Page() { return <Suspense fallback={<RuntimeLoading label="正在准备 PDF 案例…" />}><RuntimeCasePrintPage /></Suspense>; }
