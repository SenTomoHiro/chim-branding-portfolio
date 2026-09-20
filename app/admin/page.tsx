import { AdminDashboard } from "@/components/admin/admin-dashboard";
import { LoginForm } from "@/components/admin/login-form";
import { isAuthenticated } from "@/lib/auth";
import { readContent } from "@/lib/content";
export const dynamic="force-dynamic";
export default async function Page(){if(!await isAuthenticated())return <LoginForm/>;return <AdminDashboard initial={await readContent()}/>}
