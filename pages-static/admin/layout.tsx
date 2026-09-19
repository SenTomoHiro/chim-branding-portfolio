import { GitHubPagesAdmin } from "@/components/admin/github-pages-admin";

export default function Layout({ children }: { children: React.ReactNode }) {
  return <div className="adminRoot"><GitHubPagesAdmin />{children}</div>;
}
