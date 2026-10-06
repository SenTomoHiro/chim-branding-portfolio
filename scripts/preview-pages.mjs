// Serve an existing Pages production export locally with its real deployment subpath.
import { createServer } from "node:http";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
const root=path.resolve("out");
const base=(process.env.NEXT_PUBLIC_BASE_PATH || "/chim-branding-portfolio").replace(/\/$/,"");
const port=Number(process.env.PORT || 3300);
const types={".js":"text/javascript",".css":"text/css",".html":"text/html; charset=utf-8",".json":"application/json",".svg":"image/svg+xml",".woff2":"font/woff2",".xml":"application/xml",".txt":"text/plain"};
createServer(async(req,res)=>{
  try {
    const url=new URL(req.url,"http://localhost");
    if(url.pathname===base){res.writeHead(302,{Location:`${base}/`});res.end();return;}
    if(base && !url.pathname.startsWith(`${base}/`)){res.writeHead(404);res.end("Use the Pages subpath");return;}
    const relative=decodeURIComponent(url.pathname.slice(base.length)) || "/";
    const file=path.resolve(root,`.${path.extname(relative)?relative:`${relative.replace(/\/$/,"")}/index.html`}`);
    if(!file.startsWith(`${root}${path.sep}`) || !(await stat(file)).isFile()){res.writeHead(404);res.end();return;}
    res.setHeader("Content-Type",types[path.extname(file)] || "application/octet-stream");
    createReadStream(file).pipe(res);
  } catch {res.writeHead(404);res.end("Not found");}
}).listen(port,"127.0.0.1",()=>console.log(`Pages production preview: http://localhost:${port}${base}/`));
