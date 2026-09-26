import {env} from 'cloudflare:workers';
import {z} from 'zod';
import {normalizeWorkspace,workspaceSchema,resetForNewDay} from '@/lib/workspace';
function db(){if(!env.DB)throw Error('Storage unavailable');return env.DB;}
async function readCurrent(){
 for(let attempt=0;attempt<5;attempt++){
  const row=await db().prepare('SELECT revision,data FROM workspace WHERE id=1').first<{revision:number,data:string}>();
  const state=normalizeWorkspace(row?JSON.parse(row.data):null);
  const current=resetForNewDay(state);
  if(!row)return {revision:0,state:current};
  // Persist day rollover and initial upgrade atomically; other readers retry on conflict.
  if(JSON.stringify(current)===row.data)return {revision:row.revision,state:current};
  const result=await db().prepare('UPDATE workspace SET data=?,revision=revision+1 WHERE id=1 AND revision=?').bind(JSON.stringify(current),row.revision).run();
  if(result.meta.changes)return {revision:row.revision+1,state:current};
 }
 throw Error('Concurrent updates; retry');
}
export async function GET(){try{return Response.json(await readCurrent(),{headers:{'Cache-Control':'no-store'}});}catch(e){console.error(e);return Response.json({error:'Unable to load your rooms. Please retry.'},{status:503});}}
export async function PUT(request:Request){try{
 const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)return Response.json({error:'Invalid origin'},{status:403});
 const body=await request.json() as {state?:{version?:number};revision?:unknown};
 if(body?.state?.version!==4)return Response.json({error:'This app has been updated. Reload the page before saving.'},{status:409});
 const state=workspaceSchema.parse(body.state),revision=z.number().int().nonnegative().parse(body.revision);
 const current=await readCurrent();
 if(revision!==current.revision||state.progressDate!==current.state.progressDate||state.resetTimeZone!==current.state.resetTimeZone)return Response.json({...current,error:state.progressDate!==current.state.progressDate?'A new day has started. Checkboxes were reset; please try your action again.':'Someone updated this workspace. The latest version has been loaded; please try again.'},{status:409});
 const result=revision===0?await db().prepare('INSERT INTO workspace(id,revision,data) VALUES(1,1,?) ON CONFLICT(id) DO NOTHING').bind(JSON.stringify(state)).run():await db().prepare('UPDATE workspace SET data=?,revision=revision+1 WHERE id=1 AND revision=?').bind(JSON.stringify(state),revision).run();
 if(!result.meta.changes)return Response.json({error:'Someone updated this workspace. Reload the latest version before trying again.'},{status:409});
 return Response.json({state,revision:revision+1});
}catch(e){if(e instanceof z.ZodError||e instanceof SyntaxError)return Response.json({error:'Please check the entered values.'},{status:400});console.error(e);return Response.json({error:'Changes could not be saved. Please retry.'},{status:503});}}
