import {env} from 'cloudflare:workers';
import {authCookie,authJson} from '@/lib/google-auth';

export async function GET(request:Request) {
  if (!env.GOOGLE_CLIENT_ID) return authJson({error:'Google sign-in is not configured yet.'},503);
  const nonce = crypto.randomUUID() + crypto.randomUUID();
  const response = authJson({clientId:env.GOOGLE_CLIENT_ID,nonce});
  response.headers.append('Set-Cookie',authCookie(request,'nonce',nonce,600));
  return response;
}
