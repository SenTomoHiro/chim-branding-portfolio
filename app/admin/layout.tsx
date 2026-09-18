import { AdminHeader } from "@/components/admin/admin-header";
import { isAuthenticated } from "@/lib/auth";
export const dynamic="force-dynamic";
export default async function Layout({children}:{children:React.ReactNode}){const authenticated=await isAuthenticated();return <div className="adminRoot">{authenticated&&<AdminHeader/>}{children}</div>}
