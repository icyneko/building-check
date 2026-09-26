import assert from 'node:assert/strict';
import {normalizeWorkspace,checkInSchema} from '../lib/workspace.ts';
const legacy={version:2,masters:[],buildings:[{id:'b',name:'Building',defaultMasterIds:[]}],rooms:[{id:'r',buildingId:'b',name:'Room',location:'',masterIds:[],custom:[],checked:[]}]};
const migrated=normalizeWorkspace(legacy);assert.equal(migrated.version,4);assert.deepEqual(migrated.rooms[0].checkIns,[]);
const entry={id:'test-checkin',name:'Alex',date:'2026-09-26',time:'14:35',timeZone:'America/New_York',recordedAt:new Date().toISOString(),completed:0,total:0};
assert.equal(checkInSchema.safeParse({...entry,date:'2026-02-30'}).success,false);
assert.equal(checkInSchema.safeParse({...entry,name:'  '}).success,false);
assert.equal(checkInSchema.safeParse({...entry,time:'24:30'}).success,false);
assert.equal(checkInSchema.safeParse(entry).success,true);
const url=process.argv[2];
if(url){const get=async()=>await (await fetch(url)).json();const put=async(state,revision)=>fetch(url,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({state,revision})});
const initial=await get();const state=structuredClone(initial.state);const room=state.rooms[0];assert.ok(room,'Expected isolated sample room');room.checkIns.push(entry);
let res=await put(state,initial.revision);assert.equal(res.status,200);let saved=await get();assert.deepEqual(saved.state.rooms[0].checkIns.at(-1),entry);
saved.state.rooms[0].checked=[];res=await put(saved.state,saved.revision);assert.equal(res.status,200);saved=await get();assert.deepEqual(saved.state.rooms[0].checkIns.at(-1),entry);
assert.equal((await put({...saved.state,version:2},saved.revision)).status,409);
const invalid=structuredClone(saved.state);invalid.rooms[0].checkIns.at(-1).name=' ';assert.equal((await put(invalid,saved.revision)).status,400);
assert.equal((await put(initial.state,initial.revision)).status,409);
assert.deepEqual((await get()).state.rooms[0].checkIns.at(-1),entry);
}
console.log('PASS: legacy migration, valid date/time and name, saved check-in reload, history retained after reset, invalid and stale writes rejected.');

