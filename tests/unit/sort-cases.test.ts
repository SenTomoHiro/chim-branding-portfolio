import { describe, expect, it } from "vitest";
import { getPublishedCases, sortPublishedCases } from "../../lib/sort-cases";
import type { PortfolioCase } from "../../lib/types";
const item=(id:string,published=true,categories:PortfolioCase["categories"]=["other"]):PortfolioCase=>({id,brandName:id,projectName:"",intro:"",business:"branding",categories,primaryIndustry:"",cover:"",coverWidth:1400,coverHeight:1050,hero:"",bodyAssets:[],published,includeInPortfolioPdf:published,portfolioPdfImageIds:[]});
describe("sortPublishedCases",()=>{
  it("uses default order and appends new published cases",()=>expect(sortPublishedCases([item('A'),item('B'),item('C')],['B','A']).map(x=>x.id)).toEqual(['B','A','C']));
  it("ignores unpublished, duplicate and missing ids",()=>expect(sortPublishedCases([item('A'),item('B',false),item('C')],['B','missing','A','A','C']).map(x=>x.id)).toEqual(['A','C']));
  it("filters categories without changing default relative order",()=>expect(getPublishedCases([item('A',true,['food']),item('B',true,['drinks']),item('C',true,['food','ip'])],{defaultOrder:['C','B','A'],photographyCaseOrder:[]},{business:'branding',category:'food'}).map(x=>x.id)).toEqual(['C','A']));
});
