import { describe, expect, it } from "vitest";
import { sortPublishedCases } from "../../lib/sort-cases";
import type { PortfolioCase } from "../../lib/types";
const item=(id:string,published=true):PortfolioCase=>({id,slug:id.toLowerCase(),name:id,intro:"",industryPrimary:"",industryTags:[],designPrimary:"",designTags:[],cover:"",coverWidth:1400,coverHeight:1050,hero:"",bodyAssets:[],published});
describe("sortPublishedCases",()=>{
  it("uses default order and appends new published cases",()=>expect(sortPublishedCases([item('A'),item('B'),item('C')],['B','A']).map(x=>x.id)).toEqual(['B','A','C']));
  it("puts valid priorities first and deduplicates",()=>expect(sortPublishedCases([item('A'),item('B'),item('C')],['A','B','C'],['C','C','A']).map(x=>x.id)).toEqual(['C','A','B']));
  it("ignores unpublished and missing ids",()=>expect(sortPublishedCases([item('A'),item('B',false),item('C')],['B','missing','A','C'],['B','missing']).map(x=>x.id)).toEqual(['A','C']));
});
