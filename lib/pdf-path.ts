import { assetPath } from "./site-path";

export const casePdfFilename = (id: string) => `${id.toLowerCase()}.pdf`;
export const casePdfPath = (id: string) => assetPath(`/pdf/cases/${casePdfFilename(id)}`);
export const portfolioPdfPath = () => assetPath("/pdf/portfolio.pdf");
