// Developer-only production server; counters never record body/URL contents or report data.
import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const arg=(name,fallback)=>{const i=process.argv.indexOf(name);return i<0?fallback:process.argv[i+1];};
const root=path.resolve(arg('--root',fileURLToPath(new URL('../dist/',import.meta.url))));
const base=arg('--base','/'),port=Number(arg('--port','4175'));
if(!/^\/(?:[a-zA-Z0-9_-]+\/)*$/.test(base))throw new Error('Use a simple absolute base ending in /.');
const stats={requests:0,unexpectedMethods:0,unexpectedPaths:0,requestBodyBytes:0,modelRequests:0,workerRequests:0,runtimeRequests:0,imageRequests:0};
const types={'.html':'text/html','.js':'application/javascript','.mjs':'application/javascript','.css':'text/css','.json':'application/json','.wasm':'application/wasm','.task':'application/octet-stream','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.pdf':'application/pdf','.txt':'text/plain'};
http.createServer(async(req,res)=>{
 const pathname=new URL(req.url,'http://localhost').pathname;
 if(pathname===base+'__qa_stats'){res.setHeader('Content-Type','application/json');res.end(JSON.stringify(stats));return;}
 stats.requests++;req.on('data',chunk=>{stats.requestBodyBytes+=chunk.length;});
 if(!['GET','HEAD'].includes(req.method)){stats.unexpectedMethods++;res.writeHead(405).end();return;}
 const local=pathname.startsWith(base)?'/'+pathname.slice(base.length):'';
 const allowed=local==='/'||local==='/index.html'||local==='/favicon.svg'||/^\/(assets|vendor|models|licenses|hairstyles)\/[a-zA-Z0-9_./-]+$/.test(local);
 const target=path.resolve(root,'.'+(local==='/'?'/index.html':local));
 if(!allowed||!target.startsWith(root+path.sep)){stats.unexpectedPaths++;res.writeHead(404).end();return;}
 if(local.startsWith('/models/'))stats.modelRequests++;if(local.includes('face.worker-'))stats.workerRequests++;if(local.startsWith('/vendor/'))stats.runtimeRequests++;if(/^\/hairstyles\/.*\.(png|webp)$/.test(local))stats.imageRequests++;
 try{const data=await readFile(target);res.setHeader('Content-Type',types[path.extname(target)]||'application/octet-stream');res.setHeader('Cache-Control','no-store');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('Permissions-Policy','camera=(self), microphone=(), geolocation=()');res.setHeader('X-Content-Type-Options','nosniff');res.end(req.method==='HEAD'?undefined:data);}catch{res.writeHead(404).end();}
}).listen(port,'127.0.0.1',()=>console.log(`Local production QA: http://127.0.0.1:${port}${base} (aggregate counters only)`));
