import type { ContentData, MediaType, PortfolioCase } from "@/lib/types";

export type UploadedMedia = { type: MediaType; src: string; width?: number; height?: number };

export type AdminPersistence = {
  saveCase: (item: PortfolioCase, isEdit: boolean) => Promise<void>;
  deleteCase: (item: PortfolioCase) => Promise<void>;
  saveOrder: (order: string[], type: "branding" | "photography") => Promise<void>;
  upload: (file: File, caseId: string) => Promise<UploadedMedia>;
};

async function request(url: string, init: RequestInit) {
  const response = await fetch(url, init);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || "保存失败");
  return body;
}

export const localPersistence: AdminPersistence = {
  saveCase: async (item, isEdit) => { await request(isEdit ? `/api/admin/cases/${item.id}` : "/api/admin/cases", { method: isEdit ? "PATCH" : "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(item) }); },
  deleteCase: async (item) => { await request(`/api/admin/cases/${item.id}`, { method: "DELETE" }); },
  saveOrder: async (order, type) => { await request("/api/admin/order", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ order, type }) }); },
  upload: async (file) => { const form = new FormData(); form.set("file", file); return request("/api/admin/upload", { method: "POST", body: form }) as Promise<UploadedMedia>; },
};
