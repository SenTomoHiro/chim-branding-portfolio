import { Suspense } from "react";
import { GitHubAdmin } from "@/components/admin/github-pages-admin";

export default function Layout() {
  return <div className="adminRoot"><Suspense><GitHubAdmin /></Suspense></div>;
}
