/* Fechas públicas: el histórico tiene su propia fuente, no todos los días pasados. */
document.addEventListener('DOMContentLoaded',function(){
 const box=document.getElementById('disp-cal');if(!box)return;
 const today=window.dgToday();
 const currentYear=Number(today.slice(0,4)),currentMonth=Number(today.slice(5,7))-1;
 const occupied=new Map(),past=new Map(),reserved=new Set();
 try{JSON.parse(document.getElementById('occupied-dates').textContent).forEach(function(date){if(/^\d{4}-\d{2}-\d{2}$/.test(date)&&date>=today)reserved.add(date);});}catch(e){}
 (window.davizShows||[]).forEach(function(show){
  const date=show.dateOnly||new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Madrid',year:'numeric',month:'2-digit',day:'2-digit'}).format(show.date);
  if(date>=today)occupied.set(date,show.name);
 });
 try{JSON.parse(document.getElementById('past-public-shows').textContent).forEach(function(show){
  if(/^\d{4}-\d{2}-\d{2}$/.test(show.date)&&show.date<today)past.set(show.date,show.city||'');
 });}catch(e){}
 const names=['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
 let offset=0;
 function render(){
  box.replaceChildren();
  for(let m=0;m<3;m++){
   const first=new Date(Date.UTC(currentYear,currentMonth+offset+m,1));
   const year=first.getUTCFullYear(),month=first.getUTCMonth();
   const group=document.createElement('div');group.className='dc-mes';
   const heading=document.createElement('h3');heading.className='dc-tit';heading.textContent=names[month]+' '+year;
   const grid=document.createElement('div');grid.className='dc-grid';
   ['L','M','X','J','V','S','D'].forEach(function(label){const el=document.createElement('span');el.className='dc-h';el.textContent=label;grid.append(el);});
   for(let j=0;j<(first.getUTCDay()+6)%7;j++)grid.append(document.createElement('span'));
   const days=new Date(Date.UTC(year,month+1,0)).getUTCDate();
   for(let day=1;day<=days;day++){
    const key=year+'-'+String(month+1).padStart(2,'0')+'-'+String(day).padStart(2,'0');
    let type,description;
    if(past.has(key)){type='dc-played';description='Actuación pasada'+(past.get(key)?' · '+past.get(key):'');}
    else if(key<today){type='dc-pas';description='Fecha pasada';}
    else if(occupied.has(key)){type='dc-ocu';description='Próximo show · '+occupied.get(key);}
    else if(reserved.has(key)){type='dc-reserved';description='Fecha ocupada';}
    else{type='dc-lib';description='Consultar disponibilidad';}
    const el=document.createElement(type==='dc-lib'?'a':(type==='dc-played'||type==='dc-reserved')?'button':'span');el.className='dc-d '+type;el.textContent=day;el.dataset.date=key;
    const label=day+' de '+names[month]+' de '+year+': '+description;el.setAttribute('aria-label',label);el.title=description;
    if(type==='dc-lib')el.href='contacto.html?fecha='+key+'#booking';
    if(type==='dc-played'||type==='dc-reserved'){el.type='button';el.addEventListener('click',function(){document.getElementById('dc-range').textContent=label;});}
    grid.append(el);
   }
   group.append(heading,grid);box.append(group);
  }
  const start=new Date(Date.UTC(currentYear,currentMonth+offset,1)),end=new Date(Date.UTC(currentYear,currentMonth+offset+2,1));
  document.getElementById('dc-range').textContent=names[start.getUTCMonth()]+' '+start.getUTCFullYear()+' — '+names[end.getUTCMonth()]+' '+end.getUTCFullYear();
  document.getElementById('dc-prev').disabled=offset<=-12;document.getElementById('dc-next').disabled=offset>=12;
 }
 document.getElementById('dc-prev').addEventListener('click',function(){offset=Math.max(-12,offset-1);render();});
 document.getElementById('dc-next').addEventListener('click',function(){offset=Math.min(12,offset+1);render();});
 render();
});
