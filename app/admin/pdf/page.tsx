import { redirect } from "next/navigation";
import { PdfAdmin } from "@/components/admin/pdf-admin";
import { isAuthenticated } from "@/lib/auth";
import { readContent } from "@/lib/content";

export const dynamic = "force-dynamic";

export default async function PdfAdminPage() {
  if (!await isAuthenticated()) redirect("/admin");
  return <PdfAdmin initial={await readContent()} enabled={process.env.NODE_ENV === "development"} />;
}
