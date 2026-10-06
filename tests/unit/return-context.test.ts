import { describe, expect, it } from "vitest";
import { isCaseListRoute, normalizePortfolioPath, resolveCaseListSource } from "../../lib/return-context";

describe("portfolio return context paths", () => {
  it("normalizes trailing slashes and keeps filter routes", () => {
    expect(normalizePortfolioPath("/drinks/")).toBe("/drinks");
    expect(normalizePortfolioPath("/photo/?ignored=1")).toBe("/photo");
    expect(isCaseListRoute("/ip/")).toBe(true);
    expect(isCaseListRoute("/work/example/")).toBe(false);
    expect(normalizePortfolioPath("/work/?id=N013")).toBe("/work?id=N013");
  });

  it("keeps a compatible filter and chooses a visible list when the next case leaves it", () => {
    expect(resolveCaseListSource("/drinks", "branding", ["drinks", "ip"])).toBe("/drinks");
    expect(resolveCaseListSource("/drinks", "branding", ["food", "ip"])).toBe("/food");
    expect(resolveCaseListSource("/", "branding", ["other"])).toBe("/");
    expect(resolveCaseListSource("/drinks", "photography", [])).toBe("/photo");
  });
});

import { advanceCaseListEntry, clearCaseListEntry, readCaseListEntry, saveCaseListEntry, syncCaseListEntry } from "../../lib/return-context";
it("freezes first entry through category-changing Next, restores historical entries, and rejects stale direct visits", () => {
  const store = new Map<string,string>();
  Object.assign(globalThis, {
    sessionStorage: {getItem:(k:string)=>store.get(k)||null,setItem:(k:string,v:string)=>store.set(k,v),removeItem:(k:string)=>store.delete(k)},
    window: {location:{pathname:"/drinks",search:""},scrollY:2400,history:{length:3}},
    history: {state:{},replaceState(value:unknown){this.state=value as {}; }},
  });
  saveCaseListEntry("A","/work?id=A",{getBoundingClientRect:()=>({top:120})} as HTMLElement);
  window.location.pathname="/work"; window.location.search="?id=A";
  history.replaceState({},""); syncCaseListEntry("A","/work?id=A","branding",["drinks"]);
  const stateA=history.state;
  advanceCaseListEntry("B","/work?id=B","branding",["food"]);
  window.location.search="?id=B"; history.replaceState({},""); syncCaseListEntry("B","/work?id=B","branding",["food"]);
  expect(readCaseListEntry()).toMatchObject({source:"/drinks",caseId:"A",scrollY:2400,anchorTop:120,detailDepth:2,target:"/work?id=B"});
  history.replaceState(stateA,""); window.location.search="?id=A"; syncCaseListEntry("A","/work?id=A","branding",["drinks"]);
  expect(readCaseListEntry()?.detailDepth).toBe(1);
  history.replaceState({},""); syncCaseListEntry("A","/work?id=A","branding",["drinks"]);
  expect(readCaseListEntry()).toBeNull(); clearCaseListEntry();
});
