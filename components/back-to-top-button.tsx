"use client";

export function BackToTopButton() {
  function returnToTop() {
    window.scrollTo({
      top: 0,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
    });
  }

  return <button className="floatingButton backToTop" type="button" onClick={returnToTop} aria-label="返回顶部"><span className="chevronUp" aria-hidden="true" /></button>;
}
