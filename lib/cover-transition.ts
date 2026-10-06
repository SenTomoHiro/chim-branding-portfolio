import { normalizePortfolioPath, type CaseListEntry } from "./return-context";

// One presentation-only layer, in either direction. History/entry state remains
// owned by the existing router and return-context helpers.
const easing = "cubic-bezier(.22,.68,.18,.98)";
type Rect = { left: number; top: number; width: number; height: number; borderRadius: string };
type CoverTransition = {
  direction: "enter" | "exit";
  id: string;
  source: HTMLElement;
  sourceVisibility: string;
  overlay: HTMLDivElement;
  destination?: HTMLElement;
  destinationVisibility?: string;
  copy?: HTMLElement;
  copyVisibility?: string;
  copyLayer?: HTMLElement;
  viewport?: HTMLElement;
  proxy?: boolean;
  returnSource?: string;
  returned?: boolean;
  animations: Animation[];
  timer: ReturnType<typeof setTimeout>;
  interrupt: () => void;
  popstate: () => void;
  pointerdown: (event: PointerEvent) => void;
};
let active: CoverTransition | undefined;

export function cancelCoverTransition() {
  const state = active;
  if (!state) return;
  active = undefined;
  clearTimeout(state.timer);
  state.animations.forEach(animation => animation.cancel());
  state.overlay.remove();
  state.viewport?.remove();
  state.copyLayer?.remove();
  state.source.style.visibility = state.sourceVisibility;
  if (state.copy) state.copy.style.visibility = state.copyVisibility || "";
  if (state.destination) state.destination.style.visibility = state.destinationVisibility || "";
  window.removeEventListener("popstate", state.popstate);
  window.removeEventListener("wheel", state.interrupt);
  window.removeEventListener("touchmove", state.interrupt);
  window.removeEventListener("keydown", state.interrupt);
  window.removeEventListener("pointerdown", state.pointerdown);
}

export function isCoverReturnTransitionActive() { return active?.direction === "exit"; }

function supported() {
  return Boolean(HTMLElement.prototype.animate) && !matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function paintedRect(image: HTMLImageElement, container: HTMLElement): Rect {
  const box = image.getBoundingClientRect();
  const contain = getComputedStyle(image).objectFit === "contain";
  const scale = Math.min(box.width / image.naturalWidth, box.height / image.naturalHeight);
  const width = contain ? image.naturalWidth * scale : box.width;
  const height = contain ? image.naturalHeight * scale : box.height;
  return { left: box.left + (box.width - width) / 2, top: box.top + (box.height - height) / 2, width, height, borderRadius: getComputedStyle(container).borderRadius };
}

function frame(rect: Rect) {
  return { left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.width}px`, height: `${rect.height}px`, borderRadius: rect.borderRadius };
}

function imageLayer(image: HTMLImageElement, rect: Rect, id: string, direction: "enter" | "exit") {
  const overlay = document.createElement("div");
  overlay.className = "coverTransition";
  overlay.setAttribute("aria-hidden", "true");
  // Never impersonate a real list card: restoration selects data-case-id.
  overlay.dataset.transitionCaseId = id;
  overlay.dataset.direction = direction;
  overlay.dataset.phase = "waiting";
  Object.assign(overlay.style, frame(rect));
  const picture = image.cloneNode() as HTMLImageElement;
  picture.removeAttribute("loading");
  picture.style.visibility = "";
  overlay.append(picture);
  return overlay;
}

function attach(state: CoverTransition) {
  active = state;
  // A deadline is only a failed/slow-navigation fallback, never the animation
  // trigger. The restoration callback + image.decode() determine the handoff.
  state.timer = setTimeout(() => { if (active === state) cancelCoverTransition(); }, 1800);
  window.addEventListener("popstate", state.popstate);
  window.addEventListener("wheel", state.interrupt, { passive: true });
  window.addEventListener("touchmove", state.interrupt, { passive: true });
  window.addEventListener("keydown", state.interrupt);
  window.addEventListener("pointerdown", state.pointerdown);
  document.body.append(state.overlay);
}

function stateFor(direction: "enter" | "exit", id: string, source: HTMLElement, overlay: HTMLDivElement): CoverTransition {
  const state: CoverTransition = {
    direction, id, source, sourceVisibility: source.style.visibility, overlay,
    animations: [], timer: 0 as unknown as ReturnType<typeof setTimeout>,
    interrupt: cancelCoverTransition,
    popstate: () => {
      // Accept precisely the existing Close's history.go() arrival. A second
      // Back/Forward interrupts the visual layer instead of changing navigation.
      if (state.direction === "exit" && !state.returned && normalizePortfolioPath(location.pathname + location.search) === state.returnSource) {
        state.returned = true;
      } else cancelCoverTransition();
    },
    pointerdown: event => {
      if (state.direction === "exit" && !(event.target instanceof Element && event.target.closest(".detailClose"))) cancelCoverTransition();
    },
  };
  return state;
}

function move(state: CoverTransition, target: Rect, duration: number) {
  clearTimeout(state.timer);
  state.overlay.dataset.phase = "moving";
  const from = state.overlay.style;
  const animation = state.overlay.animate([
    { left: from.left, top: from.top, width: from.width, height: from.height, borderRadius: from.borderRadius, opacity: state.proxy ? 0 : 1 },
    { ...frame(target), opacity: 1 },
  ], { duration, easing, fill: "forwards" });
  state.animations.push(animation);
  void animation.finished.then(() => { if (active === state) cancelCoverTransition(); }, () => {});
}

export function beginCoverTransition(id: string, source: HTMLElement, navigate: () => void) {
  cancelCoverTransition();
  if (!supported()) return false;
  const image = source.querySelector("img");
  if (!image?.complete || !image.naturalWidth) return false;
  const box = image.getBoundingClientRect();
  if (box.bottom <= 0 || box.top >= innerHeight) return false;
  const overlay = imageLayer(image, paintedRect(image, source), id, "enter");
  const state = stateFor("enter", id, source, overlay);
  const copy = source.parentElement?.querySelector<HTMLElement>(".previewInfo");
  if (copy) {
    state.copy = copy;
    state.copyVisibility = copy.style.visibility;
    const rect = copy.getBoundingClientRect(), clone = copy.cloneNode(true) as HTMLElement;
    clone.classList.add("coverTransitionCopy"); clone.setAttribute("aria-hidden", "true");
    Object.assign(clone.style, { left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.width}px` });
    state.copyLayer = clone;
    document.body.append(clone);
    const fade = clone.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 160, easing: "ease-out", fill: "forwards" });
    state.animations.push(fade);
    void fade.finished.then(() => clone.remove(), () => clone.remove());
    copy.style.visibility = "hidden";
  }
  source.style.visibility = "hidden";
  attach(state);
  navigate();
  return true;
}

export function completeCoverTransition(id: string, destination: HTMLElement) {
  const state = active;
  if (!state || state.direction !== "enter" || state.id !== id || state.destination) return;
  state.destination = destination;
  state.destinationVisibility = destination.style.visibility;
  destination.style.visibility = "hidden";
  const image = destination.querySelector("img");
  void (image?.decode() || Promise.resolve()).catch(() => {}).then(() => {
    if (active !== state) return;
    const box = destination.getBoundingClientRect();
    move(state, { left: box.left, top: box.top, width: box.width, height: box.height, borderRadius: "0px" }, 480);
  });
}

function freezeViewport(detail: HTMLElement, source: HTMLImageElement) {
  const viewport = document.createElement("div");
  viewport.className = "coverTransitionViewport";
  viewport.setAttribute("aria-hidden", "true");
  viewport.inert = true;
  const clone = detail.cloneNode(true) as HTMLElement;
  Object.assign(clone.style, { position: "absolute", top: `${detail.getBoundingClientRect().top}px`, left: "0px", width: `${innerWidth}px` });
  // Preserve the current painted viewport, without fetching offscreen media or
  // cloning interactive controls. Only presentation DOM survives the route.
  const pictures = clone.querySelectorAll("img");
  detail.querySelectorAll("img").forEach((image, index) => {
    const box = image.getBoundingClientRect(), picture = pictures[index];
    Object.assign(picture.style, { width: `${box.width}px`, height: `${box.height}px` });
    if (image === source || box.bottom <= 0 || box.top >= innerHeight || !image.complete || !image.naturalWidth) {
      picture.style.visibility = "hidden";
      picture.removeAttribute("src");
    } else picture.removeAttribute("loading");
  });
  clone.querySelectorAll(".detailClose,.floatingControlsGroup").forEach(node => node.remove());
  clone.querySelectorAll("video").forEach(video => { video.removeAttribute("src"); video.removeAttribute("autoplay"); });
  viewport.append(clone);
  return viewport;
}

export function beginCoverReturnTransition(entry: CaseListEntry, navigate: () => void) {
  if (isCoverReturnTransitionActive()) return true;
  if (!supported()) { cancelCoverTransition(); return false; }
  const detail = document.querySelector<HTMLElement>(".detailPage");
  if (!detail) { cancelCoverTransition(); return false; }
  // If Close interrupts an opening, use the actual moving picture's geometry.
  const moving = active?.direction === "enter" ? active.overlay.querySelector("img") : undefined;
  const visible = [...detail.querySelectorAll<HTMLImageElement>("img")].filter(image => image.complete && image.naturalWidth).map(image => {
    const box = image.getBoundingClientRect();
    const area = Math.max(0, Math.min(innerHeight, box.bottom) - Math.max(0, box.top)) * Math.max(0, Math.min(innerWidth, box.right) - Math.max(0, box.left));
    return { image, area };
  }).sort((a, b) => b.area - a.area)[0];
  const hero = detail.querySelector<HTMLImageElement>(".detailHero img");
  const proxy = !moving && !visible?.area;
  const image = moving || (visible?.area ? visible.image : hero);
  if (!image?.complete || !image.naturalWidth) { cancelCoverTransition(); return false; }
  const rect = proxy ? { left: 0, top: 0, width: innerWidth, height: innerHeight, borderRadius: "0px" } : paintedRect(image, image.parentElement!);
  const overlay = imageLayer(image, rect, entry.caseId, "exit");
  const viewport = freezeViewport(detail, image);
  cancelCoverTransition();
  const state = stateFor("exit", entry.caseId, image, overlay);
  state.viewport = viewport;
  state.proxy = proxy;
  state.returnSource = entry.source;
  image.style.visibility = "hidden";
  document.body.append(viewport);
  attach(state);
  // The unchanged formal Close path runs immediately, behind the frozen view.
  navigate();
  return true;
}

export function completeCoverReturnTransition(caseId: string, card: HTMLElement) {
  const state = active;
  if (!state || state.direction !== "exit" || state.id !== caseId || state.destination) return;
  const cover = card.querySelector<HTMLElement>(".previewCover"), image = cover?.querySelector("img");
  if (!cover || !image) { cancelCoverTransition(); return; }
  state.destination = cover;
  state.destinationVisibility = cover.style.visibility;
  cover.style.visibility = "hidden";
  void image.decode().then(() => {
    requestAnimationFrame(() => {
      if (active !== state) return;
      const target = paintedRect(image, cover);
      const duration = 400;
      const picture = state.overlay.querySelector("img")!;
      // Next or a visible body image can differ from the original A cover.
      // Blend inside the same bounds; the real list cover stays hidden throughout.
      if (picture.src !== image.src) {
        const landing = image.cloneNode() as HTMLImageElement;
        landing.removeAttribute("loading");
        landing.className = "coverTransitionLanding";
        landing.style.visibility = "";
        state.overlay.append(landing);
        const blend = { duration, fill: "forwards" as const };
        state.animations.push(picture.animate([{ opacity: 1, offset: 0 }, { opacity: 1, offset: .6 }, { opacity: 0, offset: 1 }], blend));
        state.animations.push(landing.animate([{ opacity: 0, offset: 0 }, { opacity: 0, offset: .6 }, { opacity: 1, offset: 1 }], blend));
      }
      move(state, target, duration);
      if (state.viewport) state.animations.push(state.viewport.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200, easing: "ease-out", fill: "forwards" }));
    });
  }, () => { if (active === state) cancelCoverTransition(); });
}
