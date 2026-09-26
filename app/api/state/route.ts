import { env } from 'cloudflare:workers';
import { z } from 'zod';
import { normalizeWorkspace, workspaceSchema } from '@/lib/workspace';
function db(){if(!env.DB)throw new Error('Storage unavailable');return env.DB;}
export async function GET(){try {
 const row=await db().prepare('SELECT revision,data FROM workspace WHERE id=1').first<{revision:number,data:string}>();
 return Response.json({revision:row?.revision??0,state:normalizeWorkspace(row?JSON.parse(row.data):null)},{headers:{'Cache-Control':'no-store'}});
}catch(e){console.error(e);return Response.json({error:'Unable to load your buildings and rooms. Please retry.'},{status:503});}}
export async function PUT(request:Request){try {
 const origin=request.headers.get('origin');if(origin && origin!==new URL(request.url).origin)return Response.json({error:'Invalid origin'},{status:403});
 const body=await request.json() as {state?:{version?:number};revision?:unknown};
 // Older open tabs must reload; never let them strip buildings or check-in records from saved state.
 if(body?.state?.version!==3)return Response.json({error:'This app has been updated. Reload the page before saving.'},{status:409});
 const state=workspaceSchema.parse(body.state);const revision=z.number().int().nonnegative().parse(body.revision);
 const data=JSON.stringify(state);
 const result=revision===0?await db().prepare('INSERT INTO workspace(id,revision,data) VALUES(1,1,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data,revision=workspace.revision+1 WHERE workspace.revision=0').bind(data).run():await db().prepare('UPDATE workspace SET data=?,revision=revision+1 WHERE id=1 AND revision=?').bind(data,revision).run();
 if(!result.meta.changes)return Response.json({error:'Someone updated this workspace. Reload the latest version before trying again.'},{status:409});
 return Response.json({revision:revision+1,state});
}catch(e){if(e instanceof z.ZodError || e instanceof SyntaxError)return Response.json({error:'Please check the entered values and building assignments.'},{status:400});console.error(e);return Response.json({error:'Changes could not be saved. Please try again.'},{status:503});}}
