import { z } from 'zod';
const id = z.string().min(1).max(100);
const item = z.object({id,label:z.string().trim().min(1).max(200),category:z.string().trim().min(1).max(80)});
const legacyRoom = z.object({id,name:z.string().trim().min(1).max(100),location:z.string().max(100),masterIds:z.array(id).max(500),custom:z.array(item).max(500),checked:z.array(id).max(1000)});
const legacyState = z.object({masters:z.array(item).max(500),rooms:z.array(legacyRoom).max(500)});
export const checkInSchema=z.object({id,name:z.string().trim().min(1).max(100),date:z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value=>{const d=new Date(value+'T00:00:00Z');return !Number.isNaN(d.getTime())&&d.toISOString().slice(0,10)===value;},'Enter a valid date'),time:z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),timeZone:z.string().min(1).max(100),recordedAt:z.string().datetime(),completed:z.number().int().nonnegative(),total:z.number().int().nonnegative()}).refine(c=>c.completed<=c.total,'Invalid checklist counts');
export const workspaceSchema = z.object({
  version:z.literal(4),
  progressDate:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  resetTimeZone:z.literal('America/New_York'),
  masters:z.array(item).max(500),
  buildings:z.array(z.object({id,name:z.string().trim().min(1).max(100),defaultMasterIds:z.array(id).max(500)})).min(1).max(100),
  rooms:z.array(legacyRoom.extend({buildingId:id,checkIns:z.array(checkInSchema).max(1000)})).max(500),
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
export function normalizeWorkspace(value:unknown,now=new Date()):State {
  const daily={progressDate:dayInZone(now),resetTimeZone:'America/New_York'};
  if(value && typeof value==='object' && 'version' in value){
    const versioned=value as {version:unknown;rooms?:unknown};
    if(versioned.version===3)return workspaceSchema.parse({...value,...daily,version:4});
    if(versioned.version===2&&Array.isArray(versioned.rooms))return workspaceSchema.parse({...value,...daily,version:4,rooms:versioned.rooms.map(r=>({...r,checkIns:[]}))});
    return workspaceSchema.parse(value);
  }
  const old=legacyState.parse(value ?? {masters:[],rooms:[]});
  return workspaceSchema.parse({...daily,version:4,masters:old.masters,buildings:[{id:'main-building',name:'Main building',defaultMasterIds:old.masters.map(i=>i.id)}],rooms:old.rooms.map(r=>({...r,buildingId:'main-building',checkIns:[]}))});
}

export function dayInZone(now=new Date(),timeZone='America/New_York'){const parts=new Intl.DateTimeFormat('en-US',{timeZone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);return ['year','month','day'].map(type=>parts.find(p=>p.type===type)!.value).join('-');}
export function resetForNewDay(state:State,now=new Date()):State{const today=dayInZone(now,state.resetTimeZone);if(state.progressDate>=today)return state;return {...state,progressDate:today,rooms:state.rooms.map(room=>({...room,checked:[]}))};}
