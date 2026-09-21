export const PDF_CONTENT_WIDTH_MM = 182;
export const PDF_WATERFALL_GAP_MM = 5;
export const PDF_WATERFALL_COLUMN_WIDTH_MM = (PDF_CONTENT_WIDTH_MM - PDF_WATERFALL_GAP_MM) / 2;

export type PdfMasonryImage = {
  id: string;
  ratio: number;
};

export type PdfMasonryPlacement = PdfMasonryImage & {
  column: 0 | 1;
  left: number;
  top: number;
  width: number;
  height: number;
};

export type PdfMasonryLayout = {
  height: number;
  placements: PdfMasonryPlacement[];
};

export function layoutPdfMasonry(images: PdfMasonryImage[]): PdfMasonryLayout {
  const columnHeights = [0, 0];
  const placements = images.map((image) => {
    if (!Number.isFinite(image.ratio) || image.ratio <= 0) throw new Error(`PDF 图片尺寸无效：${image.id}`);
    const column: 0 | 1 = columnHeights[0] <= columnHeights[1] ? 0 : 1;
    const height = PDF_WATERFALL_COLUMN_WIDTH_MM / image.ratio;
    const placement = {
      ...image,
      column,
      left: column * (PDF_WATERFALL_COLUMN_WIDTH_MM + PDF_WATERFALL_GAP_MM),
      top: columnHeights[column],
      width: PDF_WATERFALL_COLUMN_WIDTH_MM,
      height,
    };
    columnHeights[column] += height + PDF_WATERFALL_GAP_MM;
    return placement;
  });
  return {
    placements,
    height: Math.max(0, ...columnHeights.map((height) => height ? height - PDF_WATERFALL_GAP_MM : 0)),
  };
}
