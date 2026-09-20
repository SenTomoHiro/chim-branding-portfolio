"use client";

export function DetailBackToTopButton() {
  function returnToTop() {
    window.scrollTo({
      top: 0,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
    });
  }

  return <button className="detailFloatingButton detailBackToTop" type="button" onClick={returnToTop} aria-label="返回顶部"><span aria-hidden="true">↑</span></button>;
}
