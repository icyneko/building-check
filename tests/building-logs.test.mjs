import assert from 'node:assert/strict';
import {buildingLogs} from '../lib/building-logs.ts';
const entry=(id,name,recordedAt,date='2026-09-26')=>({id,name,recordedAt,date,time:'09:00',timeZone:'America/New_York',completed:1,total:2});
const room=(id,buildingId,checkIns)=>({id,buildingId,name:id,location:'',masterIds:[],custom:[],checked:[],checkIns});
const state={version:3,masters:[],buildings:[{id:'a',name:'A',defaultMasterIds:[]},{id:'b',name:'B',defaultMasterIds:[]},{id:'c',name:'Empty',defaultMasterIds:[]}],rooms:[room('one','a',[entry('new','Alex','2026-09-26T12:00:00Z','2026-09-24'),entry('old','Sam','2026-09-25T12:00:00Z')]),room('two','a',[]),room('three','b',[entry('other','Jo','2026-09-27T12:00:00Z')])]};
const before=JSON.stringify(state);const logs=buildingLogs(state);
assert.equal(logs[0].latest.name,'Alex');assert.equal(logs[0].latest.roomName,'one');assert.equal(logs[0].rooms[1].latest,undefined);assert.deepEqual(logs[0].history.map(c=>c.id),['new','old']);assert.equal(logs[1].latest.name,'Jo');assert.equal(logs[2].latest,undefined);assert.equal(logs[2].rooms.length,0);assert.equal(JSON.stringify(state),before);
console.log('PASS: correct building grouping, latest saved record, complete ordered history, unchecked rooms, empty buildings, no mutation.');
