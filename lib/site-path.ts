const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

/** Prefixes public assets when the portfolio is hosted as a GitHub Pages project site. */
export function assetPath(source: string) {
  return source.startsWith("/") && !source.startsWith("//") ? `${basePath}${source}` : source;
}
