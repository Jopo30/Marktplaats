import {test} from 'node:test';
import assert from 'node:assert/strict';
import {checkPassword,createSession,validSession,sessionCookie} from './auth.mjs';
const secret='test-only-secret',now=1794200000000;
test('valid sessions survive restart but reject tampering, expiry and key rotation',()=>{
  const value=createSession(secret,true,now);
  assert.ok(validSession(value,secret,now+86400000));
  assert.ok(!validSession(value,secret,now+31*86400000));
  assert.ok(!validSession(value,'changed',now));
  assert.ok(!validSession(value.slice(0,-1)+'z',secret,now));
  assert.ok(!validSession(value,'',now));
  assert.ok(!validSession(createSession(secret,false,now),secret,now+13*3600000));
});
test('cookies protect credentials and persistence is opt-in',()=>{
  assert.ok(checkPassword(secret,secret));assert.ok(!checkPassword('', ''));
  assert.ok(!checkPassword('wrong',secret));
  const cookie=sessionCookie('signed-session',true,true);
  for(const flag of ['HttpOnly','Secure','SameSite=Strict','Max-Age=2592000'])assert.ok(cookie.includes(flag));
  assert.ok(!sessionCookie('value',false,true).includes('Max-Age'));
  assert.ok(sessionCookie('',false,true,true).includes('Max-Age=0'));
});
