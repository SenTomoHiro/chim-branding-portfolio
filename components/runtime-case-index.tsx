"use client";
import { useRuntimeContent } from "@/lib/runtime-content";
import { RuntimeError, RuntimeLoading } from "./runtime-state";
import { getPublishedCases } from "@/lib/sort-cases";
import type { Business, CaseCategory } from "@/lib/types";
import { HomeFeed } from "./home-carousel";
import { FloatingControls } from "./floating-controls";
import { CaseListRestoration } from "./case-list-restoration";
import { BrandMark } from "./brand-mark";

export function RuntimeCaseIndex({ business = "branding", category, title, subtitle }: { business?: Business; category?: CaseCategory; title?: string; subtitle?: string }) {
  const { data, error, retry } = useRuntimeContent();

  if (error) return <RuntimeError message={error} retry={retry} />;
  if (!data) return <RuntimeLoading />;

  const cases = getPublishedCases(data.cases, data, { business, category });

  if (cases.length === 0) {
    return (
      <div className="runtimeState">
        <p>暂无案例</p>
      </div>
    );
  }

  return (
    <>
      <CaseListRestoration />
      <BrandMark />
      <HomeFeed cases={cases} />
      <FloatingControls business={business} category={category} />
    </>
  );
}
