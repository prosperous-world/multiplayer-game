import {test,after,before} from 'node:test';
import assert from 'node:assert/strict';
import {server} from '../server.js';
let base;
before(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));base=`http://127.0.0.1:${server.address().port}`;});
after(()=>new Promise(r=>server.close(r)));
test('serves game and rejects unknown paths',async()=>{const r=await fetch(base);assert.equal(r.status,200);assert.match(await r.text(),/Orbit Arena/);assert.equal((await fetch(base+'/missing')).status,404);});
test('players share a room, move, and leave',{timeout:5000},async()=>{
 const join=async(name,room)=>{const r=await fetch(base+'/api/join',{method:'POST',body:JSON.stringify({name,room})});assert.equal(r.status,200);return r.json();};
 const a=await join('Alice','TEST'),b=await join('Bob','TEST'),other=await join('Other','ELSE');
 const controller=new AbortController();const response=await fetch(`${base}/api/events?${new URLSearchParams(a)}`,{signal:controller.signal});const reader=response.body.getReader();let buffer='';
 const next=async()=>{while(!buffer.includes('\n\n')){const {value}=await reader.read();buffer+=new TextDecoder().decode(value);}const pos=buffer.indexOf('\n\n'),line=buffer.slice(0,pos);buffer=buffer.slice(pos+2);return JSON.parse(line.slice(6));};
 let state=await next();assert.equal(state.players.length,2);assert.equal(state.coins.length,24);const x=state.players.find(p=>p.id===a.id).x;
 await fetch(`${base}/api/move?${new URLSearchParams({...a,x:1,y:0})}`,{method:'POST'});
 for(let i=0;i<5;i++){state=await next();if(state.players.find(p=>p.id===a.id).x>x)break;}
 assert.ok(state.players.find(p=>p.id===a.id).x>x);
 await fetch(`${base}/api/leave?${new URLSearchParams(b)}`,{method:'POST'});
 do{state=await next();}while(state.players.length!==1);
 assert.equal(state.players[0].name,'Alice');controller.abort();
 for(const s of [a,other])await fetch(`${base}/api/leave?${new URLSearchParams(s)}`,{method:'POST'});
});
test('malformed joins and missing sessions fail cleanly',async()=>{assert.equal((await fetch(base+'/api/join',{method:'POST',body:'bad'})).status,400);assert.equal((await fetch(base+'/api/move',{method:'POST'})).status,404);});
