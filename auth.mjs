import {createHmac,randomBytes,timingSafeEqual} from 'node:crypto';
export const COOKIE='dealhunter_session';
const equal=(a,b)=>{const x=Buffer.from(a),y=Buffer.from(b);return x.length===y.length && timingSafeEqual(x,y);};
export const checkPassword=(value,secret)=>Boolean(secret) && typeof value==='string' && equal(value,secret);
export function createSession(secret,remember,now=Date.now()){
  const expires=now+(remember?30*86400000:12*3600000);
  const payload=expires+'.'+randomBytes(24).toString('hex');
  return payload+'.'+createHmac('sha256',secret).update('session:'+payload).digest('hex');
}
export function validSession(value,secret,now=Date.now()){
  if(!secret || typeof value!=='string' || !/^\d{13}\.[a-f0-9]{48}\.[a-f0-9]{64}$/.test(value))return false;
  const [expires,nonce,signature]=value.split('.');
  if(Number(expires)<=now || Number(expires)>now+30*86400000)return false;
  return equal(signature,createHmac('sha256',secret).update('session:'+expires+'.'+nonce).digest('hex'));
}
export function sessionCookie(value,remember,production,clear=false){
  return COOKIE+'='+value+'; Path=/; HttpOnly; SameSite=Strict'+(production?'; Secure':'')+(clear?'; Max-Age=0':remember?'; Max-Age=2592000':'');
}
export function sessionFrom(req){
  return (req.headers.cookie || '').split(';').map(s=>s.trim()).find(s=>s.startsWith(COOKIE+'='))?.slice(COOKIE.length+1) || '';
}
