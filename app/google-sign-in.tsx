'use client';
import {useEffect,useRef,useState} from 'react';
import {ClipboardCheck} from 'lucide-react';
import type {GoogleUser} from '@/lib/google-auth';

type GoogleIdentity = {
  initialize(options:{client_id:string;nonce:string;auto_select:boolean;callback:(result:{credential:string})=>void}):void;
  renderButton(element:HTMLElement,options:{theme:string;size:string;text:string;width:number}):void;
  disableAutoSelect():void;
};
declare global {interface Window {google?:{accounts:{id:GoogleIdentity}}}}
let googleScript:Promise<void>|undefined;
function loadGoogle() {
  if (window.google?.accounts.id) return Promise.resolve();
  if (!googleScript) googleScript = new Promise<void>((resolve,reject)=>{
    const script=document.createElement('script');
    script.src='https://accounts.google.com/gsi/client';script.async=true;
    script.onload=()=>resolve();script.onerror=()=>{script.remove();googleScript=undefined;reject(Error('Unable to load Google sign-in. Check your connection and retry.'));};
    document.head.appendChild(script);
  });
  return googleScript;
}

export function GoogleSignIn({onSignIn}:{onSignIn:(user:GoogleUser)=>void}) {
  const button=useRef<HTMLDivElement>(null);
  const [error,setError]=useState(''),[busy,setBusy]=useState(false),[ready,setReady]=useState(false),[attempt,setAttempt]=useState(0);
  useEffect(()=>{
    let cancelled=false;
    setError('');setReady(false);
    async function setup() {
      try {
        const response=await fetch('/api/auth/challenge',{cache:'no-store'});
        const data=await response.json() as {clientId:string;nonce:string;error?:string};
        if(!response.ok)throw Error(data.error);
        await loadGoogle();
        if(cancelled||!button.current)return;
        const identity=window.google!.accounts.id;
        identity.initialize({client_id:data.clientId,nonce:data.nonce,auto_select:false,callback:async result=>{
          if(cancelled)return;
          setBusy(true);setError('');
          try {
            const res=await fetch('/api/auth',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({credential:result.credential})});
            const body=await res.json() as {user:GoogleUser;error?:string};
            if(!res.ok)throw Error(body.error);
            if(!cancelled)onSignIn(body.user);
          }catch(e){if(!cancelled)setError((e as Error).message);}finally{if(!cancelled)setBusy(false);}
        }});
        button.current.replaceChildren();
        identity.renderButton(button.current,{theme:'outline',size:'large',text:'continue_with',width:250});
        setReady(true);
      }catch(e){if(!cancelled)setError((e as Error).message);}
    }
    void setup();return()=>{cancelled=true;};
  },[attempt,onSignIn]);
  return <main className="sign-in-page"><section className="sign-in-card"><div className="sign-in-mark"><ClipboardCheck size={32}/></div><p className="eyebrow">ROOM ROUNDS</p><h1>Welcome to Room Rounds</h1><p>Sign in with Google to check rooms and view the shared buildings. No ChatGPT account needed.</p><div className="google-button" ref={button}/><p role="status">{busy?'Signing you in…':!ready&&!error?'Loading Google sign-in…':''}</p>{error&&<p className="error" role="alert">{error}</p>}<button disabled={busy} onClick={()=>setAttempt(n=>n+1)}>Reload sign-in</button><small>Your Google name will fill in your check-in details. All signed-in users share the same rooms and configuration.</small></section></main>;
}
