import { notFound,redirect } from "next/navigation";
import { CaseForm } from "@/components/admin/case-form";
import { isAuthenticated } from "@/lib/auth";
import { readContent } from "@/lib/content";
export const dynamic="force-dynamic";
export default async function Page({params}:{params:Promise<{id:string}>}){if(!await isAuthenticated())redirect('/admin');const {id}=await params;const item=(await readContent()).cases.find((entry)=>entry.id===id);if(!item)notFound();return <CaseForm initial={item}/>}
