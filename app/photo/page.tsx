import { RuntimeCaseIndex } from "@/components/runtime-case-index";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "商业摄影案例", description: "CHIM 商业摄影案例作品集。" };

export default function PhotographyPage() { return <RuntimeCaseIndex business="photography" title="Photography Works" subtitle="商业摄影案例" footer="Commercial photography · Art direction" />; }
