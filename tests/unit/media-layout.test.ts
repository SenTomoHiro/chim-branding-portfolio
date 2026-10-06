import { expect, it } from "vitest";
import { pairedHalfIds } from "../../lib/media-layout";
import type { CaseMedia } from "../../lib/types";
it("pairs Half without crossing Full or chapter boundaries, including final pairs and odd runs", () => {
  const media = [
    {id:"a",layout:"half"}, {id:"b",layout:"half"}, {id:"c",layout:"half"},
    {id:"d",layout:"half",section:{title:"New chapter"}}, {id:"e",layout:"full"},
    {id:"f",layout:"half"}, {id:"g",layout:"half"},
  ] as CaseMedia[];
  expect([...pairedHalfIds(media)]).toEqual(["a","b","f","g"]);
  expect(media.map(m=>m.layout)).toEqual(["half","half","half","half","full","half","half"]);
});
