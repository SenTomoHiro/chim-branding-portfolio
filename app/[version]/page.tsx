import { VersionPage } from "@/components/version-page";
export const dynamic = "force-dynamic";
export default async function Page({ params }: { params: Promise<{ version: string }> }) { const { version } = await params; return <VersionPage slug={version} />; }
