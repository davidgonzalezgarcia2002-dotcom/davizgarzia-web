document.addEventListener('DOMContentLoaded',function(){
 const box=document.getElementById('st-events');if(!box)return;
 const shows=(window.davizShows||[]).filter(window.dgUpcoming).slice(0,3);
 shows.forEach(function(show){
 const row=document.createElement('a');row.className='st-event';row.href=show.url||'shows.html';if(show.url){row.target='_blank';row.rel='noopener noreferrer';}
 const date=document.createElement('span');date.className='st-event-date';date.textContent=new Intl.DateTimeFormat('es-ES',{day:'2-digit',month:'short',timeZone:'Europe/Madrid'}).format(show.date);
 const title=document.createElement('span');title.className='st-event-title';title.textContent=show.name;
 const city=document.createElement('span');city.className='st-event-city';city.textContent=(show.venue||'').replace('📍 ','');
 const arrow=document.createElement('span');arrow.className='st-event-arrow';arrow.textContent='↗';arrow.setAttribute('aria-hidden','true');row.append(date,title,city,arrow);box.append(row);
 });if(!shows.length)box.textContent='Próximas fechas en camino.';
});

