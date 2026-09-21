import { GitHubPagesAdmin } from "@/components/admin/github-pages-admin";
import { Suspense } from "react";

export default function Layout() {
  return <div className="adminRoot"><Suspense><GitHubPagesAdmin /></Suspense></div>;
}
