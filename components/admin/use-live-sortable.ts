"use client";

import { useCallback, useEffect, useRef, useState, type DragEvent } from "react";

const ROW_SELECTOR = "[data-sortable-row]";

function createFullRowPreview(event: DragEvent<HTMLElement>) {
  const row = event.currentTarget.closest<HTMLElement>(ROW_SELECTOR);
  if (!row) return null;
  const rect = row.getBoundingClientRect();
  const preview = row.cloneNode(true) as HTMLElement;
  preview.classList.add("sortableDragPreview");
  preview.style.width = `${rect.width}px`;
  preview.style.height = `${rect.height}px`;
  preview.style.position = "fixed";
  preview.style.left = "-10000px";
  preview.style.top = "-10000px";
  preview.style.pointerEvents = "none";
  preview.setAttribute("aria-hidden", "true");
  document.body.append(preview);
  event.dataTransfer.setDragImage(
    preview,
    Math.max(0, Math.min(rect.width, event.clientX - rect.left)),
    Math.max(0, Math.min(rect.height, event.clientY - rect.top)),
  );
  return preview;
}

export function useLiveSortable(onMove: (activeId: string, overId: string) => void) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const activeRef = useRef<string | null>(null);
  const lastOverRef = useRef<string | null>(null);
  const previewRef = useRef<HTMLElement | null>(null);
  const moveRef = useRef(onMove);
  moveRef.current = onMove;

  const clear = useCallback(() => {
    activeRef.current = null;
    lastOverRef.current = null;
    setActiveId(null);
    previewRef.current?.remove();
    previewRef.current = null;
  }, []);

  useEffect(() => clear, [clear]);

  const moveOver = useCallback((event: DragEvent<HTMLElement>, overId: string) => {
    event.preventDefault();
    const current = activeRef.current;
    if (!current || current === overId || lastOverRef.current === overId) return;
    lastOverRef.current = overId;
    moveRef.current(current, overId);
  }, []);

  return {
    activeId,
    rowProps: (id: string) => ({
      "data-sortable-row": true,
      "data-sortable-id": id,
      "data-sortable-active": activeId === id ? "true" : undefined,
      onDragEnter: (event: DragEvent<HTMLElement>) => moveOver(event, id),
      onDragOver: (event: DragEvent<HTMLElement>) => moveOver(event, id),
      onDrop: (event: DragEvent<HTMLElement>) => { event.preventDefault(); clear(); },
    }),
    handleProps: (id: string) => ({
      draggable: true,
      onDragStart: (event: DragEvent<HTMLElement>) => {
        activeRef.current = id;
        lastOverRef.current = null;
        setActiveId(id);
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", id);
        previewRef.current = createFullRowPreview(event);
        requestAnimationFrame(() => {
          previewRef.current?.remove();
          previewRef.current = null;
        });
      },
      onDragEnd: clear,
    }),
  };
}
