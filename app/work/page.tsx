import { Suspense } from "react";
import type { Metadata } from "next";
import { RuntimeWorkPage } from "@/components/runtime-work-page";
import { RuntimeLoading } from "@/components/runtime-state";

export const metadata: Metadata = { title: "案例详情", description: "CHIM 品牌设计与商业摄影案例。" };
export default function WorkPage() { return <Suspense fallback={<RuntimeLoading />}><RuntimeWorkPage /></Suspense>; }
