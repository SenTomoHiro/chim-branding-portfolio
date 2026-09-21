import { RuntimeCaseIndex } from "@/components/runtime-case-index";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "品牌设计案例", description: "CHIM 品牌设计案例作品集。" };

export default function Home() { return <RuntimeCaseIndex />; }
