import { z } from 'zod';
const id = z.string().min(1).max(100);
const item = z.object({id,label:z.string().trim().min(1).max(200),category:z.string().trim().min(1).max(80)});
const legacyRoom = z.object({id,name:z.string().trim().min(1).max(100),location:z.string().max(100),masterIds:z.array(id).max(500),custom:z.array(item).max(500),checked:z.array(id).max(1000)});
const legacyState = z.object({masters:z.array(item).max(500),rooms:z.array(legacyRoom).max(500)});
export const workspaceSchema = z.object({
  version:z.literal(2),
  masters:z.array(item).max(500),
  buildings:z.array(z.object({id,name:z.string().trim().min(1).max(100),defaultMasterIds:z.array(id).max(500)})).min(1).max(100),
  rooms:z.array(legacyRoom.extend({buildingId:id})).max(500),
}).superRefine((state,ctx)=>{
  const issue=(message:string)=>ctx.addIssue({code:z.ZodIssueCode.custom,message});
  for(const list of [state.buildings,state.rooms,state.masters])if(new Set(list.map(x=>x.id)).size!==list.length)issue('Identifiers must be unique.');
  const buildings=new Set(state.buildings.map(b=>b.id));
  const masters=new Set(state.masters.map(m=>m.id));
  if(state.buildings.some(b=>b.defaultMasterIds.some(id=>!masters.has(id))))issue('Building defaults must refer to master items.');
  if(state.rooms.some(r=>!buildings.has(r.buildingId)))issue('Each room must belong to an existing building.');
  if(state.rooms.some(r=>r.masterIds.some(id=>!masters.has(id))))issue('Room master items must exist.');
});
export type State=z.infer<typeof workspaceSchema>;
export type Room=State['rooms'][number];
export type Building=State['buildings'][number];
export type Item=State['masters'][number];
// Upgrade legacy data in memory. The next successful revision-checked save persists it.
export function normalizeWorkspace(value:unknown):State {
  if(value && typeof value==='object' && 'version' in value)return workspaceSchema.parse(value);
  const old=legacyState.parse(value ?? {masters:[],rooms:[]});
  return workspaceSchema.parse({version:2,masters:old.masters,buildings:[{id:'main-building',name:'Main building',defaultMasterIds:old.masters.map(i=>i.id)}],rooms:old.rooms.map(r=>({...r,buildingId:'main-building'}))});
}
