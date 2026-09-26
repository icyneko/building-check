import assert from 'node:assert/strict';
import {normalizeWorkspace,workspaceSchema} from '../lib/workspace.ts';
const old={masters:[{id:'light',label:'Check lights',category:'Safety'}],rooms:[{id:'room-a',name:'Room A',location:'Floor 1',masterIds:['light'],custom:[{id:'desk',label:'Clean desk',category:'Custom'}],checked:['light']}]};
const state=normalizeWorkspace(old);
assert.equal(state.buildings[0].name,'Main building');
assert.deepEqual(state.rooms[0],{...old.rooms[0],buildingId:'main-building',checkIns:[]});
assert.deepEqual(normalizeWorkspace(state),state);
assert.deepEqual(old.rooms[0].checked,['light']);
const second={id:'north',name:'North building',defaultMasterIds:[]};
state.buildings.push(second);
state.rooms.push({...state.rooms[0],id:'room-b',name:'Room B',buildingId:'north',checked:[]});
assert.equal(workspaceSchema.safeParse(state).success,true);
assert.equal(workspaceSchema.safeParse({...state,buildings:[second]}).success,false);
assert.equal(workspaceSchema.safeParse({...state,buildings:[...state.buildings,second]}).success,false);
assert.equal(workspaceSchema.safeParse({...state,rooms:[{...state.rooms[0],buildingId:'missing'}]}).success,false);
assert.equal(workspaceSchema.safeParse({...state,buildings:[{...second,defaultMasterIds:['missing']}]}).success,false);
assert.deepEqual(state.rooms[0].checked,['light']);
console.log('PASS: legacy upgrade preserves rooms and progress; upgrade is idempotent; building references and defaults validated.');
const url=process.argv[2];
if(url){
 const request=async(method,body)=>{const res=await fetch(url,{method,headers:{'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});return {status:res.status,data:await res.json()};};
 const initial=await request('GET');assert.equal(initial.status,200);assert.equal(initial.data.state.rooms.length,0,'Use an isolated empty test database');
 const saved=await request('PUT',{revision:initial.data.revision,state});assert.equal(saved.status,200);
 const loaded=await request('GET');assert.deepEqual(loaded.data.state,state);
 assert.equal((await request('PUT',{revision:saved.data.revision,state:old})).status,409,'Reject old tabs');
 assert.equal((await request('PUT',{revision:saved.data.revision,state:{...state,rooms:[{...state.rooms[0],buildingId:'missing'}]}})).status,400);
 assert.equal((await request('PUT',{revision:initial.data.revision,state})).status,409,'Reject stale saves');
 const moved=structuredClone(state);moved.rooms[0].buildingId='north';moved.buildings[1].name='North campus';
 assert.equal((await request('PUT',{revision:saved.data.revision,state:moved})).status,200);
 const latest=await request('GET');assert.equal(latest.data.state.rooms[0].buildingId,'north');assert.deepEqual(latest.data.state.rooms[0].checked,['light']);assert.deepEqual(latest.data.state.rooms[1].checked,[]);assert.equal(latest.data.state.buildings[1].name,'North campus');
 console.log('PASS: multiple buildings persist; room move preserves progress; clone has independent progress; old clients, invalid assignments, and stale saves rejected.');
}

