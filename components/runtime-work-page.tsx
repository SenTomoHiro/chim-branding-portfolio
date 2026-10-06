"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { DetailCloseButton } from "./detail-close-button";
import { pairedHalfIds } from "@/lib/media-layout";
import { NextCaseLink } from "./next-case-link";
import { RevealMedia } from "./reveal-media";
import { RuntimeError, RuntimeLoading } from "./runtime-state";
import { getCaseCover, getCaseBodyMedia, getCaseHero } from "@/lib/case-media";
import { caseFullTitle } from "@/lib/case-title";
import { findPublishedCaseById } from "@/lib/case-route";
import { contentMediaUrl, useRuntimeContent } from "@/lib/runtime-content";
import { getPublishedCases } from "@/lib/sort-cases";
import { formatCaseMetadata } from "@/lib/taxonomy";
import { FloatingControls } from "./floating-controls";
import { completeCoverTransition } from "@/lib/cover-transition";

export function RuntimeWorkPage() {
  const heroRef = useRef<HTMLDivElement>(null);
  const id = useSearchParams().get("id") || "";
  const { data, error, retry } = useRuntimeContent();
  const current = data ? findPublishedCaseById(data.cases, id) : undefined;

  useEffect(() => {
    if (!current) return;
    document.title = `${caseFullTitle(current)} — CHIM`;
    document.querySelector('meta[name="description"]')?.setAttribute("content", current.intro);
  }, [current]);

  useLayoutEffect(() => {
    if (current && heroRef.current) completeCoverTransition(current.id, heroRef.current);
  }, [current]);

  if (error) return <RuntimeError message={error} retry={retry} />;
  if (!data) return <RuntimeLoading />;
  if (!current) return <RuntimeError message="找不到这个案例，或案例尚未发布。" retry={retry} />;

  const ordered = getPublishedCases(data.cases, data, { business: current.business });
  const index = ordered.findIndex((entry) => entry.id === current.id);
  const item = ordered[index];
  const next = ordered[(index + 1) % ordered.length];
  const fullTitle = caseFullTitle(item);
  const cover = getCaseCover(item);
  const hero = getCaseHero(item);
  const caseNumber = String(index + 1).padStart(2, "0");

  if (!cover) return <RuntimeError message="案例缺少封面图。" retry={retry} />;

  // 封面用于沉浸式开篇，原 Hero 在简介后展示（如果不同）
  const heroAfterIntro = hero && hero.src !== cover.src ? hero : null;

  const bodyMedia = getCaseBodyMedia(item);
  const paired = pairedHalfIds(bodyMedia);

  return (
    <main className="detailPage">
      <DetailCloseButton fallback={item.business === "photography" ? "/photo" : "/"} />
      <FloatingControls key={item.id} business={item.business} category={item.business === "branding" ? item.categories[0] : undefined} />

      <div ref={heroRef} className="detailHero">
        <img src={contentMediaUrl(cover.src)} alt={`${fullTitle} 封面`} />
      </div>

      <div className="detailContent">
        <header className="detailIntro">
          <div className="detailTitleBlock">
            <span className="caseNumber">{caseNumber}</span>
            <h1 aria-label={fullTitle}>
              <span className="caseTitleBrand">{item.brandName}</span>
              {item.projectName && <span className="caseTitleProject">{item.projectName}</span>}
            </h1>
          </div>
          <div className="detailSummary">
            <p className="detailMeta">{formatCaseMetadata(item)}</p>
            <p className="detailIntroText">{item.intro}</p>
          </div>
        </header>

        {heroAfterIntro && (
          <div className="detailHeroFull">
            <img src={contentMediaUrl(heroAfterIntro.src)} alt={`${fullTitle} 项目主视觉`} />
          </div>
        )}

        <section className="mediaFlow">
          {bodyMedia.map((media) => (
            <RevealMedia key={media.id} media={media} paired={paired.has(media.id)} caseName={fullTitle} />
          ))}
        </section>

        <NextCaseLink current={item} next={next} />
      </div>
    </main>
  );
}
