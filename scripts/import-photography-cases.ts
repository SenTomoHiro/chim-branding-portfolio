import { promises as fs } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import type { AssetProvenance, ContentData, PortfolioCase } from "../lib/types";

type AuditCase = { case_id:string; name:string; industry_primary:string; industry_tags:string[]; design_primary:string; design_tags:string[]; source_asset_status:string; website_assets_ready:boolean; cover_asset:string; hero_asset:string; body_assets:string[] };
type AuditAsset = { case_id:string; asset_id:string; file:string; width:number; height:number; sha256:string; source_type:string; source_file:string; source_locator:{artboard:number;xref:number} };

const order=["L021","L023","L015","L018","L025","L017","L028","L013","L022","L020","L027","L029","L024","L019","L030","L026","L014","L016"];
const slugs:Record<string,string>={L013:"l013-jiaomu-wellness-tea",L014:"l014-jiaomu-goji",L015:"l015-hogood-coffee",L016:"l016-gangjiu-berry",L017:"l017-gangjiu-tea",L018:"l018-pavomea-cookies",L019:"l019-pavomea-chestnut",L020:"l020-pavomea-madeleine",L021:"l021-alassis",L022:"l022-mosanana",L023:"l023-miwu-home",L024:"l024-ct-bee",L025:"l025-zilu",L026:"l026-li-dama",L027:"l027-wutong-tea",L028:"l028-wutong-silver",L029:"l029-longshang-apple",L030:"l030-chunlai-photo"};
const root=process.cwd();

function provenance(asset:AuditAsset):AssetProvenance{
  if(asset.source_file!=="旧案例/摄影作品集.ai"||asset.source_type!=="illustrator_pdf_compatible_embedded_image")throw new Error(`Invalid photography source: ${asset.asset_id}`);
  return {assetId:asset.asset_id,sourceType:"ai",sourceAi:asset.source_file,sourceArtboard:asset.source_locator.artboard,sourceXref:asset.source_locator.xref,extractionMethod:asset.source_type,width:asset.width,height:asset.height,sha256:asset.sha256,classification:"final_design",finalWorkVerified:true};
}
async function optimize(source:string,destination:string,kind:"cover"|"content"){
  await fs.mkdir(path.dirname(destination),{recursive:true});
  const info=await sharp(source).rotate().resize(kind==="cover"?{width:1400,height:1800,fit:"inside",withoutEnlargement:true}:{width:2200,height:2600,fit:"inside",withoutEnlargement:true}).webp({quality:kind==="cover"?84:87,smartSubsample:true}).toFile(destination);
  return {src:`/${path.relative(path.join(root,"public"),destination).split(path.sep).join("/")}`,width:info.width,height:info.height};
}
async function main(){
  const contentPath=path.join(root,"data/content.json");const content=JSON.parse(await fs.readFile(contentPath,"utf8")) as ContentData;
  const inventory=JSON.parse(await fs.readFile(path.join(root,"case-audit-v2/case-inventory-v2.json"),"utf8")) as {cases:AuditCase[]};
  const manifest=JSON.parse(await fs.readFile(path.join(root,"case-audit-v2/asset-manifest.json"),"utf8")) as {assets:AuditAsset[]};
  const caseById=new Map(inventory.cases.map((item)=>[item.case_id,item]));const assetByFile=new Map(manifest.assets.map((item)=>[item.file,item]));const currentById=new Map(content.cases.map((item)=>[item.id,item]));const imported:PortfolioCase[]=[];
  for(const id of order){
    const audit=caseById.get(id);if(!audit||!audit.website_assets_ready||audit.source_asset_status!=="READY_FROM_SOURCE"||audit.design_primary!=="Photography")throw new Error(`${id} is not a ready photography case`);
    const current=currentById.get(id);const coverAsset=assetByFile.get(audit.cover_asset);const heroAsset=assetByFile.get(audit.hero_asset);if(!coverAsset||!heroAsset||audit.body_assets.length<1)throw new Error(`${id} is missing cover, hero, or body assets`);
    const mediaDir=path.join(root,"public/media/cases",id);const cover=await optimize(path.join(root,coverAsset.file),path.join(mediaDir,"photo-cover.webp"),"cover");const hero=await optimize(path.join(root,heroAsset.file),path.join(mediaDir,"photo-hero.webp"),"content");const bodyAssets=[];
    for(const [index,file] of audit.body_assets.entries()){const asset=assetByFile.get(file);if(!asset)throw new Error(`Missing ${file}`);const media=await optimize(path.join(root,file),path.join(mediaDir,`photo-body-${String(index+1).padStart(2,"0")}.webp`),"content");bodyAssets.push({id:asset.asset_id,type:"image" as const,src:media.src,layout:index>0&&index<5?"half" as const:"full" as const,provenance:provenance(asset)});}
    imported.push({id,slug:current?.slug??slugs[id],name:current?.name??audit.name,intro:current?.intro??`${audit.name}商业摄影与美术指导案例。`,industryPrimary:current?.industryPrimary??audit.industry_primary,industryTags:current?.industryTags??audit.industry_tags,designPrimary:"Photography",designTags:current?.designTags??audit.design_tags,cover:cover.src,coverWidth:cover.width,coverHeight:cover.height,hero:hero.src,coverProvenance:provenance(coverAsset),heroProvenance:provenance(heroAsset),bodyAssets,published:true});
  }
  const importedById=new Map(imported.map((item)=>[item.id,item]));const cases=content.cases.map((item)=>importedById.get(item.id)??item);for(const item of imported)if(!cases.some((entry)=>entry.id===item.id))cases.push(item);
  const result:ContentData={...content,cases,photographyCaseOrder:order};const temporary=`${contentPath}.tmp`;await fs.writeFile(temporary,`${JSON.stringify(result,null,2)}\n`);await fs.rename(temporary,contentPath);console.log(`Imported ${imported.length} published Photography cases from formal Illustrator source assets.`);
}
main().catch((error)=>{console.error(error);process.exitCode=1});
