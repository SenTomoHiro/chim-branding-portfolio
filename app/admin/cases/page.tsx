import { notFound, redirect } from "next/navigation";
import { CaseForm } from "@/components/admin/case-form";
import { isAuthenticated } from "@/lib/auth";
import { readContent } from "@/lib/content";

export const dynamic = "force-dynamic";
export default async function Page({ searchParams }: { searchParams: Promise<{ id?: string; new?: string }> }) {
  if (!await isAuthenticated()) redirect("/admin");
  const query = await searchParams;
  if (query.new === "1") return <CaseForm />;
  const item = (await readContent()).cases.find((entry) => entry.id === query.id);
  if (!item) notFound();
  return <CaseForm initial={item} localPdfEnabled={process.env.NODE_ENV === "development"} />;
}
