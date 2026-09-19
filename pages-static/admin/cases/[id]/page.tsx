import content from "@/data/content.json";

export const dynamicParams = false;

export function generateStaticParams() {
  return content.cases.map(({ id }) => ({ id }));
}

export default function Page() {
  return null;
}
