"use client";

import { type MouseEvent } from "react";

export function BackToTopButton() {
  function returnToTop(event: MouseEvent<HTMLButtonElement>) {
    // Preserve the shared Chrome focus fix before starting smooth scroll.
    event.currentTarget.blur();
    window.scrollTo({
      top: 0,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
    });
  }

  return <button className="floatingButton backToTop" type="button" onMouseDown={event => event.preventDefault()} onClick={returnToTop} aria-label="返回顶部"><span className="chevronUp" aria-hidden="true" /></button>;
}
