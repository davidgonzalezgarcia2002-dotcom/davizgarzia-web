/* Recorrido público: scroll nativo, controles reales y un disco que responde al gesto.
   No hay renderizado continuo, shaders, escenas fijadas ni consultas privadas. */
(() => {
 'use strict';
 const root=document.documentElement,record=document.getElementById('record');
 if(!record)return;
 const state={pointerX:0,pointerY:0,selected:0};
 let objectVisible=false,frame=0,selectedShow=0;
 let paused=root.classList.contains('fx-pause')||matchMedia('(prefers-reduced-motion:reduce)').matches;
 function drawRecord(){
  frame=0;
  if(paused){record.style.transform='none';return;}
  const rect=record.parentElement.getBoundingClientRect();
  const progress=Math.max(0,Math.min(1,(innerHeight-rect.top)/(innerHeight+rect.height)));
  record.style.transform='rotateX('+(28-progress*12-state.pointerY*8)+'deg) rotateY('+(state.pointerX*10)+'deg) rotateZ('+(-18+progress*24+state.selected*4)+'deg)';
 }
 function queueRecord(){if(!frame)frame=requestAnimationFrame(drawRecord);}
 const dateList=document.getElementById('date-list'),ticket=document.getElementById('ticket');
 const safeURL=value=>{try{const u=new URL(value);return /^https?:$/.test(u.protocol)?u.href:'';}catch(e){return '';}};
 const shows=(window.davizShows||[]).filter(s=>window.dgUpcoming(s)).sort((a,b)=>a.date-b.date);
 const dateLabel=show=>new Intl.DateTimeFormat('es-ES',{day:'numeric',month:'short',timeZone:'Europe/Madrid'}).format(show.date).replace('.','');
 const city=show=>(show.venue||'').replace(/^📍\s*/, '');
 function selectShow(index,announce=true){
  const show=shows[index];if(!show)return;selectedShow=index;
  dateList.querySelectorAll('button').forEach((b,i)=>b.setAttribute('aria-pressed',String(i===index)));
  document.getElementById('ticket-kind').textContent=(show.type||'evento').toUpperCase();
  const [day,month]=dateLabel(show).split(' ');
  const display=document.getElementById('ticket-date');display.replaceChildren(document.createTextNode(day+' '));
  const mon=document.createElement('span');mon.textContent=month.toUpperCase()+' '+new Intl.DateTimeFormat('es-ES',{year:'numeric',timeZone:'Europe/Madrid'}).format(show.date);display.append(mon);
  document.getElementById('ticket-name').textContent=show.name;
  document.getElementById('ticket-location').textContent=show.location||city(show);
  const link=document.getElementById('ticket-url'),url=safeURL(show.url);link.hidden=!url;
  if(url)link.href=url;else link.removeAttribute('href');
  document.getElementById('ticket-note').textContent=url?city(show):'Entradas todavía sin enlace confirmado.';
  ticket.hidden=false;ticket.style.transform=paused?'none':'rotate('+((index%2?-1:1)*2)+'deg)';
  if(announce)document.getElementById('date-status').textContent='Fecha seleccionada: '+show.name+', '+dateLabel(show)+', '+city(show)+'. Detalle y entradas después de la lista.';
 }
 if(shows.length){
  dateList.replaceChildren();
  shows.forEach((show,index)=>{
   const row=document.createElement('button');row.type='button';row.className='date-row';row.setAttribute('aria-controls','ticket');
   const day=document.createElement('span');day.className='row-date';day.textContent=dateLabel(show).toUpperCase();
   const info=document.createElement('span'),name=document.createElement('b'),meta=document.createElement('small');
   name.textContent=show.name;meta.textContent=(show.type||'Evento')+' · '+city(show);info.append(name,meta);row.append(day,info);
   row.addEventListener('click',()=>selectShow(index));dateList.append(row);
  });selectShow(0,false);
  const next=document.getElementById('next-date');next.textContent=dateLabel(shows[0]).toUpperCase()+' · '+shows[0].name+' · '+city(shows[0]);
 }
 const trackList=document.getElementById('track-list');
 const tracks=[...trackList.querySelectorAll('a')].map(a=>({title:a.textContent,url:safeURL(a.href)})).filter(t=>/^https:\/\/open\.spotify\.com\/album\/[A-Za-z0-9]{22}$/.test(t.url));
 function selectTrack(index){
  const track=tracks[index];if(!track)return;
  trackList.querySelectorAll('button').forEach((b,i)=>b.setAttribute('aria-pressed',String(i===index)));
  document.getElementById('record-title').textContent=track.title;
  const a=document.getElementById('track-url');a.href=track.url;
  const player=document.getElementById('home-release-player'),embed=track.url.replace('/album/','/embed/album/')+'?theme=0';
  if(player.src!==embed)player.src=embed;
  player.title=track.title+' — Daviz Garzia';state.selected=index;queueRecord();
 }
 if(tracks.length){trackList.replaceChildren();tracks.forEach((track,index)=>{const b=document.createElement('button');b.type='button';b.textContent=track.title;b.setAttribute('aria-controls','home-release-player');b.addEventListener('click',()=>selectTrack(index));trackList.append(b);});selectTrack(0);}
 const live={bibe:{src:'photos/bibe-2026-escenario.webp',alt:'Escenario y público de BÏBE con Daviz Garzia en cabina',label:'BÏBE · ESCENARIO Y PÚBLICO'},gamoneo:{src:'photos/directo-gamoneo-2026.webp',alt:'Daviz Garzia en Gamoneo levantando el brazo desde la cabina',label:'GAMONEO · CONEXIÓN CON EL PÚBLICO'},planb:{src:'photos/musica-planb-2026.webp',alt:'Daviz Garzia mezclando en la cabina de Plan B',label:'PLAN B · DENTRO DE LA CABINA'}};
 document.querySelectorAll('[data-live]').forEach(b=>b.addEventListener('click',()=>{const selected=live[b.dataset.live],photo=document.getElementById('live-photo');photo.src=selected.src;photo.alt=selected.alt;document.getElementById('live-caption').textContent=selected.label;document.querySelectorAll('[data-live]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));}));
 document.addEventListener('dg-fx-change',event=>{paused=event.detail.paused;selectShow(selectedShow,false);queueRecord();});
 // Solo se solicita un frame tras scroll, toque o selección, nunca en reposo.
 const observer=new IntersectionObserver(entries=>{objectVisible=entries[0].isIntersecting;if(objectVisible&&!paused)queueRecord();});observer.observe(record.parentElement);
 addEventListener('scroll',()=>{if(objectVisible&&!paused)queueRecord();},{passive:true});
 if(matchMedia('(hover:hover) and (pointer:fine)').matches){
  const stage=record.parentElement;
  stage.addEventListener('pointermove',event=>{if(paused)return;const rect=stage.getBoundingClientRect();state.pointerX=(event.clientX-rect.left)/rect.width-.5;state.pointerY=(event.clientY-rect.top)/rect.height-.5;queueRecord();});
  stage.addEventListener('pointerleave',()=>{state.pointerX=state.pointerY=0;queueRecord();});
 }
})();
