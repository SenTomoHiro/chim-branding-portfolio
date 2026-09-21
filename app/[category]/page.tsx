import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { RuntimeCaseIndex } from "@/components/runtime-case-index";
import { CATEGORY_ROUTES } from "@/lib/taxonomy";
import type { CaseCategory } from "@/lib/types";

const pageContent: Record<CaseCategory, { title: string; subtitle: string; description: string }> = {
  food: { title: "Food Branding", subtitle: "餐饮品牌案例", description: "CHIM 餐饮品牌设计案例。" },
  drinks: { title: "Drinks Branding", subtitle: "饮品品牌案例", description: "CHIM 饮品品牌设计案例。" },
  ip: { title: "IP Design", subtitle: "IP设计案例", description: "CHIM IP 设计案例。" },
  other: { title: "Other Works", subtitle: "其他品牌案例", description: "CHIM 其他消费品牌设计案例。" },
};

const getCategory = (value: string) => CATEGORY_ROUTES.includes(value as CaseCategory) ? value as CaseCategory : undefined;

export function generateStaticParams() {
  return CATEGORY_ROUTES.map((category) => ({ category }));
}

export async function generateMetadata({ params }: { params: Promise<{ category: string }> }): Promise<Metadata> {
  const category = getCategory((await params).category);
  return category ? { title: pageContent[category].subtitle, description: pageContent[category].description } : {};
}

export default async function CategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const category = getCategory((await params).category);
  if (!category) notFound();
  const page = pageContent[category];
  return <RuntimeCaseIndex category={category} title={page.title} subtitle={page.subtitle} />;
}
