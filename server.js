import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { randomUUID, randomInt } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const rooms = new Map();
const colors = ['#a6ff65','#8f9dff','#ff9f74','#f78bcd','#67e4ee','#ffe080'];
function roomFor(code) {
  if (!rooms.has(code)) rooms.set(code, { players: new Map(), coins: Array.from({length:24},()=>coin()), ends: Date.now()+90000, round:1 });
  return rooms.get(code);
}
function coin() { return {x:30+randomInt(940),y:30+randomInt(540)}; }
function snapshot(r) { return {players:[...r.players.values()].map(({id,name,x,y,score,color})=>({id,name,x,y,score,color})),coins:r.coins,remaining:Math.max(0,Math.ceil((r.ends-Date.now())/1000)),round:r.round}; }
function send(res, status, data) { res.writeHead(status,{'Content-Type':'application/json'}); res.end(JSON.stringify(data)); }
const files = {'/':'index.html','/app.js':'app.js','/api-client.js':'api-client.js','/style.css':'style.css'};
export const server = http.createServer(async(req,res)=>{
  try {
    const url = new URL(req.url,'http://localhost');
    if (req.method==='POST' && url.pathname==='/api/join') {
      let body=''; for await (const chunk of req) { body+=chunk; if(body.length>4096) return send(res,413,{error:'Request too large'}); }
      const data=JSON.parse(body); const code=String(data.room||'PUBLIC').toUpperCase().replace(/[^A-Z0-9-]/g,'').slice(0,16)||'PUBLIC';
      const r=roomFor(code); if(r.players.size>=12) return send(res,409,{error:'Room is full. Try another room.'});
      const id=randomUUID(); const p={id,name:String(data.name||'Explorer').trim().slice(0,18)||'Explorer',x:100+randomInt(800),y:100+randomInt(400),score:0,color:colors[r.players.size%colors.length],dx:0,dy:0,last:Date.now(),stream:null};
      r.players.set(id,p); return send(res,200,{id,room:code});
    }
    const r=rooms.get(url.searchParams.get('room')); const p=r?.players.get(url.searchParams.get('id'));
    if(url.pathname==='/api/events' && req.method==='GET') {
      if(!p) return send(res,404,{error:'Session expired. Please rejoin.'});
      p.stream?.end(); res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-cache','Connection':'keep-alive','X-Accel-Buffering':'no'}); p.stream=res; p.last=Date.now();
      res.write(`data: ${JSON.stringify(snapshot(r))}\n\n`); res.on('close',()=>{if(p.stream===res) p.stream=null;}); return;
    }
    if(url.pathname==='/api/move' && req.method==='POST') {
      if(!p) return send(res,404,{error:'Session expired'});
      p.dx=Math.max(-1,Math.min(1,Number(url.searchParams.get('x'))||0)); p.dy=Math.max(-1,Math.min(1,Number(url.searchParams.get('y'))||0)); p.last=Date.now(); return send(res,200,{ok:true});
    }
    if(url.pathname==='/api/leave' && req.method==='POST') { if(p) {p.stream?.end();r.players.delete(p.id);} return send(res,200,{ok:true}); }
    if(req.method==='GET' && files[url.pathname]) {
      const file=files[url.pathname]; const body=await readFile(fileURLToPath(new URL(`./public/${file}`,import.meta.url)));
      res.writeHead(200,{'Content-Type':file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html','X-Content-Type-Options':'nosniff'}); return res.end(body);
    }
    send(res,404,{error:'Not found'});
  } catch { if(!res.headersSent) send(res,400,{error:'Invalid request'}); else res.end(); }
});
const tick=setInterval(()=>{
  const now=Date.now();
  for(const [code,r] of rooms) {
    if(now>=r.ends) {r.ends=now+90000;r.round++;for(const p of r.players.values())p.score=0;}
    for(const [id,p] of r.players) {
      if(now-p.last>15000) {p.stream?.end();r.players.delete(id);continue;}
      const length=Math.max(1,Math.hypot(p.dx,p.dy));
      p.x=Math.max(16,Math.min(984,p.x+p.dx/length*11));p.y=Math.max(16,Math.min(584,p.y+p.dy/length*11));
      r.coins=r.coins.map(c=>{if(Math.hypot(c.x-p.x,c.y-p.y)<25){p.score+=10;return coin();}return c;});
    }
    if(!r.players.size){rooms.delete(code);continue;}
    const event=`data: ${JSON.stringify(snapshot(r))}\n\n`;
    for(const p of r.players.values())if(p.stream&&!p.stream.writableNeedDrain)p.stream.write(event);
  }
},50);
server.on('close',()=>clearInterval(tick));
if(process.argv[1]===fileURLToPath(import.meta.url))server.listen(Number(process.env.PORT)||3000,'0.0.0.0',()=>console.log('Orbit Arena listening on port '+(process.env.PORT||3000)));
