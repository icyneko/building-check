import {createRemoteJWKSet, jwtVerify} from 'jose';
import type {JWTVerifyGetKey} from 'jose';

export type GoogleUser = {id:string; name:string; email:string; expiresAt:number};
const googleKeys = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'));

// Only Google's signed identity is trusted; browser-supplied profile fields are ignored.
export async function verifyGoogleToken(token:string, clientId:string, nonce?:string, keys:JWTVerifyGetKey=googleKeys):Promise<GoogleUser> {
  if (!clientId || !token || token.length > 3800) throw Error('Invalid sign-in');
  const {payload} = await jwtVerify(token, keys, {
    algorithms:['RS256'], audience:clientId,
    issuer:['https://accounts.google.com','accounts.google.com'],
    requiredClaims:['sub','exp','iat','email'], maxTokenAge:'2h',
  });
  if (typeof payload.sub !== 'string' || !payload.sub ||
      typeof payload.email !== 'string' || !payload.email || payload.email_verified !== true ||
      (payload.azp !== undefined && payload.azp !== clientId) ||
      (nonce !== undefined && (!nonce || payload.nonce !== nonce))) throw Error('Invalid sign-in');
  const name = typeof payload.name === 'string' ? payload.name.trim() : '';
  return {id:payload.sub, name:(name || payload.email).slice(0,100), email:payload.email, expiresAt:payload.exp! * 1000};
}

export function cookieName(request:Request, kind:'session'|'nonce') {
  return (new URL(request.url).protocol === 'https:' ? '__Host-rr-' : 'rr-local-') + kind;
}
export function readCookie(request:Request, kind:'session'|'nonce') {
  const name = cookieName(request,kind) + '=';
  return (request.headers.get('cookie') || '').split(';').map(s=>s.trim()).find(s=>s.startsWith(name))?.slice(name.length) || '';
}
export function authCookie(request:Request, kind:'session'|'nonce', value:string, maxAge:number) {
  return `${cookieName(request,kind)}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${Math.max(0,Math.floor(maxAge))}${new URL(request.url).protocol === 'https:' ? '; Secure' : ''}`;
}
export function isSameOrigin(request:Request) {
  return request.headers.get('origin') === new URL(request.url).origin &&
    request.headers.get('sec-fetch-site') !== 'cross-site';
}
export function authJson(body:unknown, status=200) {
  return Response.json(body,{status,headers:{'Cache-Control':'no-store','Vary':'Cookie'}});
}
export async function authenticate(request:Request, clientId:string):Promise<GoogleUser|null> {
  const token = readCookie(request,'session');
  if (!token || !clientId) return null;
  try { return await verifyGoogleToken(token,clientId); } catch { return null; }
}
