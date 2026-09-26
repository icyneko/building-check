"use client";
import type {State} from '@/lib/workspace';
import {buildingLogs} from '@/lib/building-logs';
import {Table,TableBody,TableCell,TableHead,TableHeader,TableRow} from '@/components/ui/table';
export function AdminLogs({state,loaded}:{state:State;loaded:boolean}){
 const groups=buildingLogs(state);
 return <section className="admin-logs" aria-labelledby="admin-log-title">
   <div className="admin-log-heading"><div><h2 id="admin-log-title">Building check-in log</h2><p>All buildings · Latest logged check-in for each building and room.</p></div></div>
   <p className="log-note">Listed by when records were saved. Dates, times, and names are those entered at check-in. Rooms are grouped under their current building.</p>
   {!loaded?<p className="muted">Loading check-in records…</p>:groups.map(({building,rooms,history,latest})=><article key={building.id} className="building-log-card">
     <div className="building-log-heading"><h3>{building.name}</h3><span>{rooms.length} {rooms.length===1?'room':'rooms'} · {rooms.filter(r=>r.latest).length} with check-ins</span></div>
     <div className="building-last-check"><strong>Last logged check-in</strong>{latest?<p><b>{latest.name}</b> checked <b>{latest.roomName}</b> on {latest.date} at {latest.time} <span>({latest.timeZone})</span></p>:<p>No check-ins recorded for this building.</p>}</div>
     {rooms.length?<Table aria-label={'Latest room check-ins in '+building.name}><TableHeader><TableRow><TableHead>Room</TableHead><TableHead>Last check-in</TableHead><TableHead>Logged name</TableHead><TableHead>Items checked</TableHead></TableRow></TableHeader><TableBody>{rooms.map(({room,latest})=><TableRow key={room.id}><TableCell className="log-room-name">{room.name}{room.location&&<small>{room.location}</small>}</TableCell><TableCell>{latest?<>{latest.date} · {latest.time}<small>{latest.timeZone}</small></>:'Not checked yet'}</TableCell><TableCell>{latest?.name||'—'}</TableCell><TableCell>{latest?`${latest.completed} / ${latest.total}`:'—'}</TableCell></TableRow>)}</TableBody></Table>:<p className="log-empty">No rooms in this building yet.</p>}
     {history.length>0&&<details className="building-history"><summary>View all check-ins ({history.length})</summary><div className="log-history-scroll"><Table aria-label={'Check-in history for '+building.name}><TableHeader><TableRow><TableHead>Room</TableHead><TableHead>Check-in date / time</TableHead><TableHead>Logged name</TableHead><TableHead>Items checked</TableHead></TableRow></TableHeader><TableBody>{history.map((entry,index)=><TableRow key={entry.roomId+':'+entry.id+':'+index}><TableCell>{entry.roomName}</TableCell><TableCell>{entry.date} · {entry.time}<small>{entry.timeZone}</small></TableCell><TableCell>{entry.name}</TableCell><TableCell>{entry.completed} / {entry.total}</TableCell></TableRow>)}</TableBody></Table></div></details>}
   </article>)}
 </section>;
}
