import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {checkPassword,createSession,validSession,sessionCookie,sessionFrom} from './auth.mjs';
import {search,validate} from './provider.mjs';
const token = process.env.DEALHUNTER_ACCESS_TOKEN || '';
const enabled = process.env.SEARCH_ENABLED === 'true';
const production = process.env.NODE_ENV === 'production';
let lastAttempt = 0, busy = false;
let loginAttempts=0, loginWindow=Date.now();
const cache = new Map();
const send = (res,code,body) => {res.writeHead(code,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(body));};
function authorized(req) {
  if (!token) return !production;
  return validSession(sessionFrom(req),token);
}
http.createServer(async (req,res) => {
  try {
    const path = new URL(req.url,'http://localhost').pathname;
    if (req.method === 'GET' && path === '/health') return send(res,200,{ok:true});
    if (req.method === 'GET' && path === '/api/session') return send(res,200,{authenticated:authorized(req)});
    if (req.method === 'GET' && ['/','/app.js','/style.css','/categories.json'].includes(path)) {
      const file = path === '/' ? 'index.html' : path.slice(1);
      const content = await readFile(new URL(file,import.meta.url));
      res.writeHead(200,{'Content-Type':file.endsWith('.json')?'application/json; charset=utf-8':file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html; charset=utf-8',
        'Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'",
        'X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Cache-Control':'no-store'});
      return res.end(content);
    }
    if (!['/api/search','/api/login','/api/logout'].includes(path) || req.method !== 'POST') return send(res,404,{error:'Niet gevonden.'});
    // JSON-only requests and strict same-site cookies prevent cross-site form requests.
    if (!(req.headers['content-type'] || '').startsWith('application/json')) return send(res,415,{error:'JSON vereist.'});
    if(req.headers.origin && new URL(req.headers.origin).host !== req.headers.host) return send(res,403,{error:'Ongeldige herkomst.'});
    if(path==='/api/logout'){
      res.setHeader('Set-Cookie',sessionCookie('',false,production,true));
      return send(res,200,{ok:true});
    }
    if(path==='/api/search' && !authorized(req))return send(res,401,{error:'Log opnieuw in om te zoeken.'});
    let raw = '';
    for await (const chunk of req) {raw += chunk; if (raw.length > 4096) return send(res,413,{error:'Aanvraag te groot.'});}
    if(path==='/api/login'){
      if(Date.now()-loginWindow>900000){loginAttempts=0;loginWindow=Date.now();}
      if(loginAttempts>=10)return send(res,429,{error:'Te veel inlogpogingen. Probeer over 15 minuten opnieuw.'});
      loginAttempts++;
      let credentials;
      try{credentials=JSON.parse(raw);}catch{return send(res,400,{error:'Ongeldige aanvraag.'});}
      if(!checkPassword(credentials?.password,token))return send(res,401,{error:'Het wachtwoord klopt niet.'});
      loginAttempts=0;
      res.setHeader('Set-Cookie',sessionCookie(createSession(token,credentials.remember===true),credentials.remember===true,production));
      return send(res,200,{ok:true});
    }
    if (!enabled) return send(res,503,{error:'Live zoeken is nog niet ingeschakeld op deze server.'});
    let input;
    try {input = validate(JSON.parse(raw));} catch(e) {return send(res,400,{error:e.message});}
    const key = JSON.stringify(input), cached = cache.get(key);
    if (cached && Date.now()-Date.parse(cached.fetchedAt)<300000) return send(res,200,{...cached,cached:true});
    if (busy) return send(res,429,{error:'Er wordt nog een zoekopdracht opgehaald. Probeer het zo nog eens.'});
    const waitSeconds=Math.ceil((5000-(Date.now()-lastAttempt))/1000);
    if (waitSeconds>0) {
      res.setHeader('Retry-After',String(waitSeconds));
      return send(res,429,{error:'Wacht nog '+waitSeconds+' seconden voor een nieuwe zoekopdracht.'});
    }
    busy=true;lastAttempt=Date.now();
    try {
      const result=await search(input);
      for(const [oldKey,value] of cache)if(Date.now()-Date.parse(value.fetchedAt)>=300000)cache.delete(oldKey);
      if(cache.size>=20)cache.delete(cache.keys().next().value);
      cache.set(key,result);return send(res,200,{...result,cached:false});
    }
    catch(e) {return send(res,502,{error:e.name==='TimeoutError'?'Marktplaats reageert niet op tijd.':e.message});}
    finally {busy=false;}
  } catch {send(res,500,{error:'De aanvraag kon niet worden verwerkt.'});}
}).listen(Number(process.env.PORT || 3000),process.env.HOST || '127.0.0.1',()=>console.log('Dealhunter gestart.'));
