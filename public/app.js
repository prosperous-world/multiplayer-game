const $=id=>document.getElementById(id), canvas=$('game'),ctx=canvas.getContext('2d');
let session=null,stream=null,state={players:[],coins:[],remaining:90},solo=false,keys=new Set(),touch={x:0,y:0},lastRound=0;
$('room').value=new URLSearchParams(location.search).get('room')||'';
function draw(){
 ctx.clearRect(0,0,1000,600);ctx.fillStyle='#161b14';ctx.fillRect(0,0,1000,600);
 ctx.fillStyle='#34402b';for(let x=20;x<1000;x+=30)for(let y=15;y<600;y+=30){ctx.beginPath();ctx.arc(x,y,1,0,Math.PI*2);ctx.fill();}
 const coins=session?state.coins:Array.from({length:20},(_,i)=>({x:(i*197+47)%1000,y:(i*133+31)%600}));
 for(const c of coins){ctx.shadowBlur=16;ctx.shadowColor='#b6f57b';ctx.fillStyle='#b6f57b';ctx.beginPath();ctx.arc(c.x,c.y,4,0,Math.PI*2);ctx.fill();}ctx.shadowBlur=0;
 for(const p of state.players){ctx.shadowBlur=20;ctx.shadowColor=p.color;ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(p.x,p.y,13,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;if(p.id===session?.id){ctx.strokeStyle=p.color;ctx.lineWidth=1;ctx.beginPath();ctx.arc(p.x,p.y,20,0,Math.PI*2);ctx.stroke();}ctx.fillStyle='#f0f0e5';ctx.font='12px sans-serif';ctx.textAlign='center';ctx.fillText(p.name,p.x,p.y-29);}
 requestAnimationFrame(draw);
}draw();
function render(){
 $('count').textContent=`${state.players.length} ${solo?'SOLO':'ONLINE'}`;
 $('timer').textContent=`${Math.floor(state.remaining/60)}:${String(state.remaining%60).padStart(2,'0')} REMAINING`;
 $('scores').replaceChildren(...[...state.players].sort((a,b)=>b.score-a.score).map((p,i)=>{const row=document.createElement('div');row.className='score-row';const name=document.createElement('span'),dot=document.createElement('i'),score=document.createElement('strong');dot.style.background=p.color;name.append(dot,`${i+1}. ${p.name}${p.id===session?.id?' (you)':''}`);score.textContent=p.score;row.append(name,score);return row;}));
 if(lastRound&&state.round!==lastRound)notice('New round! Scores reset.');lastRound=state.round;
}
function notice(text){$('game-notice').textContent=text;$('game-notice').hidden=false;setTimeout(()=>$('game-notice').hidden=true,3500);}
function activate(){ $('lobby').hidden=true;document.querySelector('.arena').classList.add('playing');$('session').hidden=false;$('touch').hidden=false;$('room-info').textContent=solo?'Practice · just you':`Room: ${session.room}`;$('arena-label').textContent=solo?'PRACTICE ARENA':'LIVE ARENA';$('invite').hidden=solo;lastRound=0;keys.clear(); }
$('join-form').addEventListener('submit',async e=>{e.preventDefault();$('join').disabled=true;$('error').textContent='';try{
 const response=await fetch('/api/join',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:$('name').value,room:$('room').value})});const data=await response.json();if(!response.ok)throw Error(data.error);session=data;solo=false;activate();stream=new EventSource(`/api/events?${new URLSearchParams(session)}`);stream.onmessage=e=>{state=JSON.parse(e.data);render();};stream.onerror=()=>notice('Connection interrupted. Reconnecting…');
 }catch(e){$('error').textContent=e.message||'Could not join. Please try again.';}finally{$('join').disabled=false;}});
$('practice').onclick=()=>{solo=true;session={id:'solo',room:'PRACTICE'};state={players:[{id:'solo',name:$('name').value||'Explorer',x:500,y:300,color:'#b6f57b',score:0}],coins:Array.from({length:24},()=>({x:30+Math.random()*940,y:30+Math.random()*540})),remaining:90,round:1};activate();render();};
function leave(){if(session&&!solo)fetch(`/api/leave?${new URLSearchParams(session)}`,{method:'POST',keepalive:true}).catch(()=>{});stream?.close();stream=null;session=null;solo=false;keys.clear();state={players:[],coins:[],remaining:90};$('lobby').hidden=false;$('session').hidden=true;$('touch').hidden=true;$('game-notice').hidden=true;document.querySelector('.arena').classList.remove('playing');$('scores').innerHTML='<div class="empty"><span>◎</span><p>A fresh arena.<br>Make the first move.</p></div>';$('count').textContent='0 ONLINE';$('timer').textContent='90 SECOND ROUNDS';$('arena-label').textContent='THE ARENA';}
$('leave').onclick=leave;window.addEventListener('pagehide',leave);
$('invite').onclick=async()=>{const url=new URL(location.href);url.searchParams.set('room',session.room);try{await navigator.clipboard.writeText(url.href);notice('Invite link copied. Send it to a friend!');}catch{notice(`Share this room code: ${session.room}`);}};
window.addEventListener('keydown',e=>{if(!session||e.target instanceof HTMLInputElement)return;if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','w','a','s','d'].includes(e.key)){e.preventDefault();keys.add(e.key);}});window.addEventListener('keyup',e=>keys.delete(e.key));window.addEventListener('blur',()=>{keys.clear();touch={x:0,y:0};});
for(const b of document.querySelectorAll('.touch button')){b.onpointerdown=e=>{b.setPointerCapture(e.pointerId);touch={x:Number(b.dataset.x),y:Number(b.dataset.y)};};b.onpointerup=b.onpointercancel=()=>touch={x:0,y:0};}
let elapsed=0,busy=false;setInterval(async()=>{if(!session)return;let x=Number(keys.has('d')||keys.has('ArrowRight'))-Number(keys.has('a')||keys.has('ArrowLeft'))+touch.x,y=Number(keys.has('s')||keys.has('ArrowDown'))-Number(keys.has('w')||keys.has('ArrowUp'))+touch.y;
 if(solo){const p=state.players[0],length=Math.max(1,Math.hypot(x,y));p.x=Math.max(16,Math.min(984,p.x+x/length*11));p.y=Math.max(16,Math.min(584,p.y+y/length*11));for(const c of state.coins)if(Math.hypot(c.x-p.x,c.y-p.y)<25){p.score+=10;c.x=30+Math.random()*940;c.y=30+Math.random()*540;}elapsed+=50;if(elapsed>=1000){elapsed=0;state.remaining--;if(state.remaining<=0){state.remaining=90;state.round++;p.score=0;}}render();}
 else if(!busy){busy=true;try{const r=await fetch(`/api/move?${new URLSearchParams({...session,x,y})}`,{method:'POST'});if(r.status===404){leave();$('error').textContent='Your session expired. Join again to play.';}}catch{}finally{busy=false;}}
},50);
