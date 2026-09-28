import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPair,exportJWK,createLocalJWKSet,SignJWT} from 'jose';
import {verifyGoogleToken,authenticate,authCookie,readCookie,isSameOrigin} from '../lib/google-auth.ts';

const {privateKey,publicKey}=await generateKeyPair('RS256');
const jwk=await exportJWK(publicKey);jwk.kid='test';jwk.alg='RS256';
const keys=createLocalJWKSet({keys:[jwk]});
const client='example.apps.googleusercontent.com';
const claims={sub:'google-user-1',email:'person@example.com',email_verified:true,name:'Alex Person',nonce:'browser-nonce'};
const token=(overrides={},key=privateKey)=>new SignJWT({...claims,...overrides}).setProtectedHeader({alg:'RS256',kid:'test'}).setIssuer('https://accounts.google.com').setAudience(client).setIssuedAt().setExpirationTime('1h').sign(key);
const verify=(value,nonce='browser-nonce')=>verifyGoogleToken(value,client,nonce,keys);

test('verified Google profile supplies name and stable identity',async()=>{
  const user=await verify(await token());assert.equal(user.name,'Alex Person');assert.equal(user.id,'google-user-1');
  const fallback=await verify(await token({name:''}));assert.equal(fallback.name,claims.email);
});
test('rejects forged signatures, wrong audience, issuer, expiry, nonce and unverified email',async()=>{
  const other=await generateKeyPair('RS256');
  await assert.rejects(verify(await token({},other.privateKey)));
  const base=new SignJWT(claims).setProtectedHeader({alg:'RS256',kid:'test'}).setIssuedAt();
  await assert.rejects(verify(await base.setIssuer('https://accounts.google.com').setAudience('another-app').setExpirationTime('1h').sign(privateKey)));
  await assert.rejects(verify(await base.setAudience(client).setIssuer('https://attacker.example').sign(privateKey)));
  await assert.rejects(verify(await base.setIssuer('https://accounts.google.com').setExpirationTime(1).sign(privateKey)));
  await assert.rejects(verify(await token(),'different-browser'));
  await assert.rejects(verify(await token(),''));
  await assert.rejects(verify(await token({email_verified:false})));
  await assert.rejects(verify(await token({azp:'another-app'})));
  await assert.rejects(verify('not-a-token'));
  await assert.rejects(verifyGoogleToken(await token(),'',undefined,keys));
});
test('unauthenticated and spoofed platform identity cannot access the app',async()=>{
  assert.equal(await authenticate(new Request('https://app.example/api/state'),client),null);
  assert.equal(await authenticate(new Request('https://app.example/api/state',{headers:{'oai-authenticated-user-id':'forged','oai-authenticated-user-email':'fake@example.com'}}),client),null);
});
test('cookies are host-only, HttpOnly, Secure and bounded; logout expires them',()=>{
  const request=new Request('https://app.example/api/auth',{headers:{cookie:'__Host-rr-session=abc; unrelated=x'}});
  assert.equal(readCookie(request,'session'),'abc');
  assert.equal(authCookie(request,'session','abc',60),'__Host-rr-session=abc; Path=/; HttpOnly; SameSite=Lax; Max-Age=60; Secure');
  assert.match(authCookie(request,'session','',0),/Max-Age=0/);
});
test('mutation origin must match, including missing origin and cross-site requests',()=>{
  const req=(headers={})=>new Request('https://app.example/api/state',{method:'PUT',headers});
  assert.equal(isSameOrigin(req({origin:'https://app.example'})),true);
  assert.equal(isSameOrigin(req()),false);
  assert.equal(isSameOrigin(req({origin:'https://attacker.example'})),false);
  assert.equal(isSameOrigin(req({origin:'https://app.example','sec-fetch-site':'cross-site'})),false);
});
