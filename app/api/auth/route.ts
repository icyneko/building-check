import {env} from 'cloudflare:workers';
import {authenticate,authCookie,authJson,isSameOrigin,readCookie,verifyGoogleToken} from '@/lib/google-auth';

export async function GET(request:Request) {
  if (!env.GOOGLE_CLIENT_ID) return authJson({error:'Google sign-in is not configured yet.'},503);
  return authJson({user:await authenticate(request,env.GOOGLE_CLIENT_ID)});
}
export async function POST(request:Request) {
  if (!isSameOrigin(request)) return authJson({error:'Invalid origin.'},403);
  if (!env.GOOGLE_CLIENT_ID) return authJson({error:'Google sign-in is not configured yet.'},503);
  if (!request.headers.get('content-type')?.startsWith('application/json')) return authJson({error:'Expected JSON.'},415);
  try {
    const text = await request.text();
    if (text.length > 5000) return authJson({error:'Invalid sign-in.'},400);
    const {credential} = JSON.parse(text);
    const nonce = readCookie(request,'nonce');
    if (typeof credential !== 'string' || !nonce) return authJson({error:'Sign-in expired. Please try again.'},401);
    const user = await verifyGoogleToken(credential,env.GOOGLE_CLIENT_ID,nonce);
    const response = authJson({user});
    response.headers.append('Set-Cookie',authCookie(request,'session',credential,(user.expiresAt-Date.now())/1000));
    response.headers.append('Set-Cookie',authCookie(request,'nonce','',0));
    return response;
  } catch {
    return authJson({error:'Google sign-in could not be verified. Please try again.'},401);
  }
}
export async function DELETE(request:Request) {
  if (!isSameOrigin(request)) return authJson({error:'Invalid origin.'},403);
  const response = authJson({signedOut:true});
  response.headers.append('Set-Cookie',authCookie(request,'session','',0));
  response.headers.append('Set-Cookie',authCookie(request,'nonce','',0));
  return response;
}
