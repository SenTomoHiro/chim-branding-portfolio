"use client";
import { BackToTopButton } from "./back-to-top-button";
import { CategoryPill } from "./category-pill";
import type { Business, CaseCategory } from "@/lib/types";

interface FloatingControlsProps {
  business: Business;
  category?: CaseCategory;
}

export function FloatingControls({ business, category }: FloatingControlsProps) {
  return (
    <div className="floatingControlsGroup">
      <CategoryPill business={business} category={category} />
      <BackToTopButton />
    </div>
  );
}
