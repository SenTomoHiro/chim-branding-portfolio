import { redirect } from "next/navigation";
import { CaseForm } from "@/components/admin/case-form";
import { isAuthenticated } from "@/lib/auth";
export const dynamic="force-dynamic";
export default async function Page(){if(!await isAuthenticated())redirect('/admin');return <CaseForm/>}
