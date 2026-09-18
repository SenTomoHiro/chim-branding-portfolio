export const pdfSources = {
  N001: "新案例/250820-W² Concept Cafe/250820-W² Concept Cafe.pdf",
  N002: "新案例/251015-粤有福手作/251015-粤有福手作.pdf",
  N003: "新案例/251211-小满/251211-小满.pdf",
  N004: "新案例/251224-三餐好乡邻/251224-三餐好乡邻.pdf",
  N005: "新案例/251229-水果老爸/251229-水果老爸.pdf",
  N006: "新案例/260325-Oi·Coffee/260325-Oi·Coffee.pdf",
  N007: "新案例/260330-稻米香 · 湘菜小炒/260330-稻米香 · 湘菜小炒.pdf",
  N008: "新案例/260409-果壳里/260409-果壳里.pdf",
  N009: "新案例/260420-饭点时光/260420-饭点时光.pdf",
  N010: "新案例/260428-禾之伴/260428-禾之伴.pdf",
  N011: "新案例/260520-豚豚冰屋Tone/260520-豚豚冰屋Tone.pdf",
  N012: "新案例/260526-郑社长满分果汁/260526-郑社长满分果汁.pdf",
  N013: "新案例/260602-堡乎乎/260602-堡乎乎.pdf",
  N014: "新案例/260623-欢树/260623-欢树.pdf",
  N015: "新案例/260629-台滋味·台式厨房/260629-台滋味·台式厨房.pdf",
  N016: "新案例/260707-荟HUI·威士忌水烟吧/260707-荟HUI·威士忌水烟吧.pdf",
  N017: "新案例/260717-大利村/260717-大利村.pdf",
  N018: "新案例/260730-觅咔咔/260730-觅咔咔 .pdf",
  N019: "新案例/260805-鮮燙町/260805-鮮燙町.pdf",
  N020: "新案例/260811-巴适的钵/260811-巴适的钵.pdf",
};

const rules = {
  N001: [[1, 1, "concept"], [2, 2, "strategy"], [3, 3, "research"], [4, 4, "strategy"], [5, 5, "reference"], [6, 8, "concept"], [9, 22, "final_design"], [23, 24, "mixed", "final applications plus explanatory/reference material"], [25, 33, "final_design"]],
  N002: [[1, 1, "concept"], [2, 8, "strategy"], [9, 20, "final_design"], [21, 22, "strategy"], [23, 23, "final_design"], [24, 24, "mixed", "final packaging direction plus source photography"], [25, 48, "final_design"]],
  N003: [[1, 1, "concept"], [2, 6, "moodboard"], [7, 8, "concept"], [9, 20, "final_design"], [21, 21, "mixed", "final logo application plus contextual photography"], [22, 36, "final_design"]],
  N004: [[1, 1, "concept"], [2, 5, "strategy"], [6, 6, "mixed", "brand concept plus source food photography"], [7, 7, "moodboard"], [8, 11, "final_design"], [12, 12, "mixed", "visual direction board containing reference imagery"], [13, 26, "final_design"]],
  N005: [[1, 2, "final_design"], [3, 3, "concept"], [4, 4, "moodboard"], [5, 31, "final_design"]],
  N006: [[1, 1, "concept"], [2, 4, "moodboard"], [5, 9, "strategy"], [10, 18, "final_design"], [19, 21, "mixed", "final identity elements combined with reference/context photography"], [22, 41, "final_design"]],
  N007: [[1, 1, "concept"], [2, 5, "research"], [6, 10, "strategy"], [11, 11, "mixed", "final positioning page combined with unbranded reference photography"], [12, 13, "final_design"], [14, 14, "mixed", "final identity direction plus reference image"], [15, 20, "final_design"], [21, 21, "mixed", "final graphic system plus contextual photograph"], [22, 33, "final_design"]],
  N008: [[1, 1, "concept"], [2, 3, "strategy"], [4, 5, "research"], [6, 6, "concept"], [7, 7, "strategy"], [8, 8, "moodboard"], [9, 10, "final_design"], [11, 12, "strategy"], [13, 14, "mixed", "final identity elements shown with reference/context imagery"], [15, 15, "strategy"], [16, 30, "final_design"]],
  N009: [[1, 1, "concept"], [2, 3, "reference"], [4, 8, "strategy"], [9, 20, "final_design"], [21, 21, "strategy"], [22, 40, "final_design"]],
  N010: [[1, 1, "concept"], [2, 5, "reference"], [6, 8, "strategy"], [9, 11, "final_design"], [12, 12, "reference", "unbranded source vegetation photography"], [13, 13, "mixed", "final pattern combined with source photography"], [14, 28, "final_design"]],
  N011: [[1, 1, "concept"], [2, 4, "strategy"], [5, 10, "final_design"], [11, 11, "mixed", "final graphic element combined with source food photography"], [12, 30, "final_design"]],
  N012: [[1, 1, "concept"], [2, 5, "research"], [6, 9, "strategy"], [10, 40, "final_design"]],
  N013: [[1, 1, "concept"], [2, 8, "strategy"], [9, 9, "concept"], [10, 35, "final_design"]],
  N014: [[1, 1, "concept"], [2, 4, "reference"], [5, 10, "strategy"], [11, 13, "final_design"], [14, 14, "mixed", "final identity direction combined with contextual imagery"], [15, 15, "strategy"], [16, 33, "final_design"]],
  N015: [[1, 4, "reference"], [5, 6, "strategy"], [7, 25, "final_design"]],
  N016: [[1, 1, "final_design"], [2, 2, "mixed", "brand concept combined with source photography"], [3, 3, "strategy"], [4, 4, "mixed", "brand concept combined with source photography"], [5, 25, "final_design"]],
  N017: [[1, 1, "concept"], [2, 2, "mixed", "brand concept combined with source food photography"], [3, 10, "strategy"], [11, 11, "mixed", "final logo construction presented on reference documentary photography"], [12, 14, "final_design"], [15, 15, "mixed", "final brand material system presented on reference documentary photography"], [16, 30, "final_design"]],
  N018: [[1, 1, "concept"], [2, 2, "strategy"], [3, 9, "research"], [10, 33, "final_design"]],
  N019: [[1, 1, "concept"], [2, 9, "research"], [10, 10, "concept"], [11, 23, "final_design"]],
  N020: [[1, 1, "concept"], [2, 5, "strategy"], [6, 20, "final_design"]],
};

export const pageCounts = {
  N001: 33, N002: 48, N003: 36, N004: 26, N005: 31,
  N006: 41, N007: 33, N008: 30, N009: 40, N010: 28,
  N011: 30, N012: 40, N013: 35, N014: 33, N015: 25,
  N016: 25, N017: 30, N018: 33, N019: 23, N020: 20,
};

export function pageClassification(caseId, page) {
  const rule = rules[caseId]?.find(([start, end]) => page >= start && page <= end);
  if (!rule) throw new Error(`Missing page classification: ${caseId} page ${page}`);
  const [, , classification, note] = rule;
  return { classification, ...(note ? { note } : {}) };
}

export function allPageClassifications() {
  return Object.keys(pdfSources).map((caseId) => ({
    case_id: caseId,
    source_pdf: pdfSources[caseId],
    visual_review: "rendered_page_reviewed",
    pages: Array.from({ length: pageCounts[caseId] }, (_, index) => {
      const page = index + 1;
      return { page, ...pageClassification(caseId, page) };
    }),
  }));
}
