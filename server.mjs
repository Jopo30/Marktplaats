import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {timingSafeEqual} from 'node:crypto';
import {search,validate} from './provider.mjs';
const token = process.env.DEALHUNTER_ACCESS_TOKEN || '';
const enabled = process.env.SEARCH_ENABLED === 'true';
const production = process.env.NODE_ENV === 'production';
let lastAttempt = 0, busy = false;
const cache = new Map();
const send = (res,code,body) => {res.writeHead(code,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(body));};
function authorized(req) {
  if (!token) return !production;
  const given = Buffer.from(req.headers.authorization || ''), expected = Buffer.from('Bearer ' + token);
  return given.length === expected.length && timingSafeEqual(given,expected);
}
http.createServer(async (req,res) => {
  try {
    const path = new URL(req.url,'http://localhost').pathname;
    if (req.method === 'GET' && path === '/health') return send(res,200,{ok:true});
    if (req.method === 'GET' && ['/','/app.js','/style.css'].includes(path)) {
      const file = path === '/' ? 'index.html' : path.slice(1);
      const content = await readFile(new URL(file,import.meta.url));
      res.writeHead(200,{'Content-Type':file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html; charset=utf-8',
        'Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'",
        'X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Cache-Control':'no-store'});
      return res.end(content);
    }
    if (path !== '/api/search' || req.method !== 'POST') return send(res,404,{error:'Niet gevonden.'});
    if (!authorized(req)) return send(res,401,{error:'Een geldige dashboardtoegangscode is nodig.'});
    if (!enabled) return send(res,503,{error:'Live zoeken is nog niet ingeschakeld op deze server.'});
    let raw = '';
    for await (const chunk of req) {raw += chunk; if (raw.length > 4096) return send(res,413,{error:'Aanvraag te groot.'});}
    let input;
    try {input = validate(JSON.parse(raw));} catch(e) {return send(res,400,{error:e.message});}
    const key = JSON.stringify(input), cached = cache.get(key);
    if (cached && Date.now()-Date.parse(cached.fetchedAt)<300000) return send(res,200,{...cached,cached:true});
    if (busy || Date.now()-lastAttempt<300000) return send(res,429,{error:'Wacht vijf minuten tussen nieuwe zoekopdrachten.'});
    busy=true;lastAttempt=Date.now();
    try {const result=await search(input);cache.clear();cache.set(key,result);return send(res,200,{...result,cached:false});}
    catch(e) {return send(res,502,{error:e.name==='TimeoutError'?'Marktplaats reageert niet op tijd.':e.message});}
    finally {busy=false;}
  } catch {send(res,500,{error:'De aanvraag kon niet worden verwerkt.'});}
}).listen(Number(process.env.PORT || 3000),process.env.HOST || '127.0.0.1',()=>console.log('Dealhunter gestart.'));
