/* app.js — scripts compartidos por todas las páginas de davizgarziamusic.com
   Cada bloque comprueba que su elemento existe antes de tocarlo, así ninguna
   página falla por no tener una sección concreta. */

// ── LENIS SMOOTH SCROLL ───────────────────────────────────────────────────
// Respeta "prefers-reduced-motion" (quien lo tenga activado sigue con el
// scroll nativo del navegador, sin animación) y no rompe el resto del JS: el
// scroll sigue disparando 'scroll'/window.scrollY con normalidad, solo se
// suaviza el movimiento. Si el CDN falla, el sitio sigue funcionando igual
// con scroll nativo (Lenis queda undefined y este bloque no hace nada).
(function(){
  if(typeof Lenis==='undefined')return;
  var lenis=new Lenis();
  window.__lenis=lenis;
  function raf(time){lenis.raf(time);requestAnimationFrame(raf);}
  requestAnimationFrame(raf);
})();

// ── PAUSAR ANIMACIONES (control para el visitante, recordado en el navegador) ──
(function(){
  var KEY='fx_pause',root=document.documentElement;
  function guardado(){try{return localStorage.getItem(KEY)==='1'}catch(e){return false}}
  function guardar(v){try{localStorage.setItem(KEY,v?'1':'0')}catch(e){}}
  function aplicar(p){
    root.classList.toggle('fx-pause',p);
    [].forEach.call(document.querySelectorAll('video[data-scroll-video]'),function(v){if(p){v.pause()}});
    var b=document.getElementById('fx-toggle');if(b){b.textContent=p?'Reanudar animaciones':'Pausar animaciones';b.setAttribute('aria-pressed',p?'true':'false')}
  }
  document.addEventListener('DOMContentLoaded',function(){
    var cont=document.querySelector('.foot-links');if(!cont)return;
    var b=document.createElement('button');b.type='button';b.id='fx-toggle';b.className='fx-toggle';
    b.addEventListener('click',function(){var p=!root.classList.contains('fx-pause');guardar(p);aplicar(p)});
    cont.appendChild(b);aplicar(guardado());
  });
})();

// ── SCROLL INTERACTIVO (todas las páginas) ───────────────────────────────────
// Parallax en el hero, cintas que aceleran con el scroll, cifras que
// cuentan, imágenes que se asientan al entrar y títulos/tarjetas que aparecen.
// No se apaga con "prefers-reduced-motion": decisión de David (22 oct 2026).
(function(){
  document.documentElement.classList.add('js-sc');
  var q=function(s){return [].slice.call(document.querySelectorAll(s))};

  // elementos que aún no tienen animación de entrada la reciben aquí
  q('.section-eye,.section-h,.section-p,.scard,.slist-row,.rel-item,.about-photo-card,.cdwn-wrap,.cc').forEach(function(el){
    if(!el.hasAttribute('data-anim')&&!el.closest('[data-anim]'))el.setAttribute('data-anim','');
  });
  // las imágenes de contenido se asientan (zoom suave) al entrar
  q('section img,.rel-item img').forEach(function(im){
    if(im.closest('.hero-photo-area')||im.id==='lightbox-img')return;
    im.classList.add('sc-zoom');
  });
  var zio=new IntersectionObserver(function(es){es.forEach(function(e){
    if(e.isIntersecting){e.target.classList.add('sc-in');zio.unobserve(e.target)}})},{threshold:.15});
  q('.sc-zoom').forEach(function(im){zio.observe(im)});

  var hero=document.querySelector('.hero'),img=document.querySelector('.hero-photo-area img');
  if(img){img.style.willChange='transform';img.style.transformOrigin='center top'}
  var lastY=window.scrollY,rate=1,marq=[],corriendo=false;
  setTimeout(function(){marq=document.getAnimations().filter(function(a){return a.animationName==='runMarquee'})},500);
  function frame(){
    var y=window.scrollY,v=Math.abs(y-lastY);lastY=y;
    if(document.documentElement.classList.contains('fx-pause')){if(img)img.style.transform='none';for(var q=0;q<marq.length;q++)marq[q].playbackRate=1;corriendo=false;return}
    if(img&&hero&&y<hero.offsetHeight)img.style.transform='translate3d(0,'+(y*0.18).toFixed(1)+'px,0) scale(1.1)';
    rate+=((1+Math.min(v*0.35,7))-rate)*0.12;
    for(var i=0;i<marq.length;i++)marq[i].playbackRate=rate;
    // se detiene cuando ya no hay scroll y las cintas han vuelto a su ritmo
    if(v>0||Math.abs(rate-1)>0.02&&!document.hidden)requestAnimationFrame(frame);
    else{corriendo=false;for(var j=0;j<marq.length;j++)marq[j].playbackRate=1}
  }
  function arrancar(){if(!corriendo){corriendo=true;requestAnimationFrame(frame)}}
  window.addEventListener('scroll',arrancar,{passive:true});
  arrancar();

  // texto gigante: cada línea entra desde abajo
  var spans=q('.giant-foot span');
  spans.forEach(function(el,i){el.style.transitionDelay=(i*0.12)+'s'});
  // cifras que cuentan hasta su valor
  function contar(el){
    var t=el.textContent.trim(),m=t.match(/^([\d.,]+)(.*)$/);if(!m)return;
    var dec=(m[1].split('.')[1]||'').length,fin=parseFloat(m[1].replace(',','.')),suf=m[2];
    if(isNaN(fin))return;
    var t0=null;
    function paso(ts){if(!t0)t0=ts;var k=Math.min((ts-t0)/1400,1),e=1-Math.pow(1-k,3);
      el.textContent=(fin*e).toFixed(dec)+suf;if(k<1)requestAnimationFrame(paso);else el.textContent=t}
    requestAnimationFrame(paso);
  }
  var io=new IntersectionObserver(function(es){es.forEach(function(e){
    if(!e.isIntersecting)return;
    if(e.target.classList.contains('h-stat-num'))contar(e.target);else e.target.classList.add('gf-in');
    io.unobserve(e.target);
  })},{threshold:.35});
  q('.h-stat-num').forEach(function(el){io.observe(el)});
  var gio=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){spans.forEach(function(s){s.classList.add('gf-in')});gio.disconnect()}})},{threshold:.2});
  q('.giant-foot').forEach(function(el){gio.observe(el)});
})();

// ── NAV SCROLLED + REVEAL ANIM + COOKIE CHECK ────────────────────────────────
(function(){
  var nav=document.getElementById('navbar');
  if(nav)window.addEventListener('scroll',function(){nav.classList.toggle('scrolled',window.scrollY>60);},{passive:true});

  var io=new IntersectionObserver(function(entries){
    entries.forEach(function(e){if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target);}});
  },{threshold:0.1,rootMargin:'0px 0px -50px 0px'});
  document.querySelectorAll('[data-anim]').forEach(function(el){io.observe(el);});

  var cb=document.getElementById('cookie-banner');
  if(cb&&localStorage.getItem('cookies_ok'))cb.classList.add('hidden');
})();

// ── GOOGLE ANALYTICS (solo se carga tras aceptar cookies, no antes) ──────────
(function(){
  if(typeof gtag!=='function')return; // la página no incluye el stub de GA (ej. privacidad.html)
  var GA_ID='G-BJWT1W9HER';
  function loadGA(){
    if(window.gaLoaded)return;
    window.gaLoaded=true;
    var s=document.createElement('script');
    s.async=true;
    s.src='https://www.googletagmanager.com/gtag/js?id='+GA_ID;
    document.head.appendChild(s);
    gtag('config',GA_ID,{anonymize_ip:true});
  }
  if(localStorage.getItem('cookies_ok'))loadGA();
  var acceptBtn=document.querySelector('#cookie-banner .cookie-btn');
  if(acceptBtn)acceptBtn.addEventListener('click',loadGA);
})();

// ── MENÚ MÓVIL (hamburguesa) ─────────────────────────────────────────────────
(function(){
  var toggle=document.getElementById('nav-toggle'),menu=document.getElementById('nav-menu');
  if(!toggle||!menu)return;
  toggle.addEventListener('click',function(){menu.classList.toggle('open');});
  menu.querySelectorAll('a').forEach(function(a){a.addEventListener('click',function(){menu.classList.remove('open');});});
})();

// ── LANG SWITCHER ────────────────────────────────────────────────────────────
(function(){
  var T={
    es:{
      hero_lema:'Música para romper el club.<br>Sets hechos para bailar.', home_book_h2:'¿Hacemos algo juntos?', home_book_p:'Clubs, festivales y fiestas privadas. Cuéntame tu idea y te respondo en menos de 24h.', btn_book:'Contratar ahora', btn_spotify:'Escuchar en Spotify ↗',
      stat_ig:'Seguidores IG', stat_tik:'Likes TikTok', stat_yt:'Vistas YouTube', stat_rel:'Lanzamientos',
      about_eye:'Sobre mí', soc_eye:'Sígueme', cd_eye:'¡Nos vemos pronto!',
      shows_eye:'Próximas fechas', hist_eye:'Historial',
      hist_p:'DJ Cantabria con actuaciones en Santander, Torrelavega, Solares, Logroño, Ávila, Palencia y Barcelona — más de 10 salas en toda España.',
      music_eye:'Música', yt_eye:'YouTube', yt_p:'Canciones originales y sesiones completas. Todo en YouTube.',
      tnl_eye:'Sello Discográfico', tnl_p:'Recursos para DJs. Sample packs, mashup packs y herramientas de producción hechas por DJs, para DJs.',
      book_eye:'Contrataciones', book_p:'Contratar DJ en Cantabria y toda España. Disponible para clubs, fiestas privadas y festivales. Respuesta en menos de 24h.',
      about_h2:'Música pensada para romper el club', soc_h2:'Encuentra mi música en todas partes',
      cd_h2:'Cuenta atrás al próximo show', music_h2:'Discografía &amp; Spotify',
      yt_h2:'Dos canales, un artista', yt_ch1:'Canal Oficial', yt_ch2:'Canal de Sesiones',
      shows_h2:'Actuaciones confirmadas', book_h2:'¿Quieres que pinche en tu evento?', tnl_h2:'The North Record Label'
    },
    en:{
      hero_lema:'Music to break the club.<br>Sets made to dance.', home_book_h2:'Shall we do something together?', home_book_p:'Clubs, festivals and private parties. Tell me your idea and I will reply within 24h.', btn_book:'Book now', btn_spotify:'Listen on Spotify ↗',
      stat_ig:'IG Followers', stat_tik:'TikTok Likes', stat_yt:'YouTube Views', stat_rel:'Releases',
      about_eye:'About me', soc_eye:'Follow me', cd_eye:'See you soon!',
      shows_eye:'Upcoming shows', hist_eye:'History',
      hist_p:'DJ from Cantabria with shows in Santander, Torrelavega, Solares, Logroño, Ávila, Palencia and Barcelona — 10+ venues across Spain.',
      music_eye:'Music', yt_eye:'YouTube', yt_p:'Original tracks and full sessions. All on YouTube.',
      tnl_eye:'Record Label', tnl_p:'Resources for DJs. Sample packs, mashup packs and production tools made by DJs, for DJs.',
      book_eye:'Booking', book_p:'Book a DJ in Cantabria and all over Spain. Available for clubs, festivals and private events. Reply within 24h.',
      about_h2:'Music built to break the club', soc_h2:'Find my music everywhere',
      cd_h2:'Countdown to the next show', music_h2:'Discography &amp; Spotify',
      yt_h2:'Two channels, one artist', yt_ch1:'Official Channel', yt_ch2:'Sessions Channel',
      shows_h2:'Confirmed shows', book_h2:'Want me to DJ your event?', tnl_h2:'The North Record Label'
    },
    fr:{
      hero_lema:'De la musique pour enflammer le club.<br>Des sets faits pour danser.', home_book_h2:'On fait quelque chose ensemble ?', home_book_p:'Clubs, festivals et fêtes privées. Raconte-moi ton idée et je réponds sous 24h.', btn_book:'Réserver', btn_spotify:'Écouter sur Spotify ↗',
      stat_ig:'Abonnés IG', stat_tik:'Likes TikTok', stat_yt:'Vues YouTube', stat_rel:'Sorties',
      about_eye:'À propos', soc_eye:'Suivez-moi', cd_eye:'À bientôt !',
      shows_eye:'Prochains shows', hist_eye:'Historique',
      hist_p:'DJ de Cantabrie avec des shows à Santander, Torrelavega, Solares, Logroño, Ávila, Palencia et Barcelone — plus de 10 salles en Espagne.',
      music_eye:'Musique', yt_eye:'YouTube', yt_p:'Titres originaux et sessions complètes. Tout sur YouTube.',
      tnl_eye:'Label Discographique', tnl_p:'Ressources pour DJs. Sample packs, mashup packs et outils de production créés par des DJs, pour des DJs.',
      book_eye:'Booking', book_p:'Réserver un DJ en Cantabrie et dans toute l\'Espagne. Disponible pour clubs, festivals et événements privés. Réponse sous 24h.',
      about_h2:'Une musique pensée pour enflammer le club', soc_h2:'Retrouve ma musique partout',
      cd_h2:'Compte à rebours avant le prochain show', music_h2:'Discographie &amp; Spotify',
      yt_h2:'Deux chaînes, un artiste', yt_ch1:'Chaîne officielle', yt_ch2:'Chaîne Sessions',
      shows_h2:'Dates confirmées', book_h2:'Tu veux que je mixe à ton événement ?', tnl_h2:'The North Record Label'
    }
  };
  function setLang(lang){
    if(!T[lang])return;
    document.querySelectorAll('[data-i18n]').forEach(function(el){
      var k=el.getAttribute('data-i18n');
      if(T[lang][k]!==undefined)el.innerHTML=T[lang][k];
    });
    document.querySelectorAll('.lang-btn').forEach(function(b){b.classList.toggle('active',b.getAttribute('data-lang')===lang);});
    localStorage.setItem('lang',lang);
    document.documentElement.lang=lang;
  }
  document.querySelectorAll('.lang-btn').forEach(function(b){b.addEventListener('click',function(){setLang(this.getAttribute('data-lang'));});});
  var savedLang=localStorage.getItem('lang');
  if(savedLang&&savedLang!=='es')setLang(savedLang);
})();

// ── SCROLL PROGRESS BAR ──────────────────────────────────────────────────────
(function(){
  var bar=document.getElementById('scroll-progress');
  if(!bar)return;
  window.addEventListener('scroll',function(){
    var s=document.documentElement.scrollTop||document.body.scrollTop;
    var h=document.documentElement.scrollHeight-document.documentElement.clientHeight;
    bar.style.width=(h>0?Math.min(100,s/h*100):0)+'%';
  },{passive:true});
})();

// ── BACK TO TOP ──────────────────────────────────────────────────────────────
(function(){
  var btn=document.getElementById('back-top');
  if(!btn)return;
  window.addEventListener('scroll',function(){btn.classList.toggle('visible',window.scrollY>500);},{passive:true});
  btn.addEventListener('click',function(){
    if(window.__lenis)window.__lenis.scrollTo(0);
    else window.scrollTo({top:0,behavior:'smooth'});
  });
})();

// ── GALLERY LIGHTBOX ─────────────────────────────────────────────────────────
(function(){
  var lb=document.getElementById('lightbox');
  if(!lb)return;
  var lbImg=document.getElementById('lightbox-img'),lbCap=document.getElementById('lightbox-caption');
  var lbClose=document.getElementById('lightbox-close'),lbPrev=document.getElementById('lightbox-prev'),lbNext=document.getElementById('lightbox-next');
  var items=[],cur=0;
  function openAt(i){cur=i;var item=items[cur];lbImg.src=item.src;lbImg.alt=item.alt;lbCap.textContent=item.caption;lb.classList.add('open');document.body.style.overflow='hidden';}
  function close(){lb.classList.remove('open');document.body.style.overflow='';}
  function prev(){openAt((cur-1+items.length)%items.length);}
  function next(){openAt((cur+1)%items.length);}
  function init(){
    items=[];
    document.querySelectorAll('.gal-item img').forEach(function(img,i){
      var label=img.closest('.gal-item').querySelector('.gal-label');
      items.push({src:img.src,caption:label?label.textContent:'',alt:img.alt||''});
      img.closest('.gal-item').addEventListener('click',function(){openAt(i);});
    });
  }
  init();
  var galleryGrid=document.querySelector('.gallery-grid');
  if(galleryGrid)new MutationObserver(init).observe(galleryGrid,{childList:true,subtree:true});
  if(lbClose)lbClose.addEventListener('click',close);
  lb.addEventListener('click',function(e){if(e.target===lb)close();});
  if(lbPrev)lbPrev.addEventListener('click',prev);
  if(lbNext)lbNext.addEventListener('click',next);
  document.addEventListener('keydown',function(e){
    if(!lb.classList.contains('open'))return;
    if(e.key==='Escape')close();
    if(e.key==='ArrowLeft')prev();
    if(e.key==='ArrowRight')next();
  });
})();

// ── COPY EMAIL TOAST ─────────────────────────────────────────────────────────
(function(){
  var toast=document.getElementById('toast');
  if(!toast)return;
  function showToast(msg){toast.textContent=msg;toast.classList.add('show');setTimeout(function(){toast.classList.remove('show');},2500);}
  document.querySelectorAll('a[href="mailto:hola@davizgarziamusic.com"]').forEach(function(a){
    a.addEventListener('click',function(e){
      e.preventDefault();
      navigator.clipboard.writeText('hola@davizgarziamusic.com').then(function(){showToast('Email copiado al portapapeles!');}).catch(function(){window.location.href='mailto:hola@davizgarziamusic.com';});
    });
  });
})();

// ── FORMULARIOS WEB3FORMS (envío directo por email, sin cliente de correo) ───
(function(){
  var toast=document.getElementById('toast');
  function notify(msg,ms){if(!toast)return;toast.textContent=msg;toast.classList.add('show');setTimeout(function(){toast.classList.remove('show');},ms||3000);}
  document.querySelectorAll('form[data-web3forms]').forEach(function(form){
    form.addEventListener('submit',function(e){
      e.preventDefault();
      var btn=form.querySelector('button[type="submit"]');
      var btnTxt=btn?btn.textContent:'';
      if(btn){btn.disabled=true;btn.textContent='Enviando…';}
      fetch(form.action,{method:'POST',headers:{'Accept':'application/json'},body:new FormData(form)})
        .then(function(r){return r.json();})
        .then(function(data){
          if(data.success){
            notify(form.getAttribute('data-ok')||'¡Enviado! Te contestamos en menos de 24h.',3500);
            form.reset();
          } else {
            throw new Error(data.message||'Error');
          }
        })
        .catch(function(){
          notify('Error al enviar. Escríbenos a hola@davizgarziamusic.com',4500);
        })
        .finally(function(){
          if(btn){btn.disabled=false;btn.textContent=btnTxt;}
        });
    });
  });
})();

// ── STAT COUNTER ANIMATION ───────────────────────────────────────────────────
(function(){
  function animCount(el,end,suffix){
    var start=0,dur=1400,startTime=null;
    function step(ts){if(!startTime)startTime=ts;var p=Math.min((ts-startTime)/dur,1);var eased=1-Math.pow(1-p,3);el.textContent=Math.round(start+(end-start)*eased)+suffix;if(p<1)requestAnimationFrame(step);}
    requestAnimationFrame(step);
  }
  var io=new IntersectionObserver(function(entries){
    entries.forEach(function(entry){
      if(!entry.isIntersecting)return;
      var el=entry.target,raw=el.getAttribute('data-count');
      if(!raw)return;
      io.unobserve(el);
      var num=parseFloat(raw),suffix=raw.replace(/[\d.]/g,'');
      animCount(el,num,suffix);
    });
  },{threshold:.5});
  document.querySelectorAll('.h-stat-num').forEach(function(el){var txt=el.textContent.trim();el.setAttribute('data-count',txt);el.textContent='0';io.observe(el);});
})();

// ── COUNTDOWN (solo si existe el bloque) ──────────────────────────────────────
(function(){
  var events=window.davizShows||[];
  var el={d:document.getElementById('cdwn-d'),h:document.getElementById('cdwn-h'),m:document.getElementById('cdwn-m'),s:document.getElementById('cdwn-s'),event:document.getElementById('cdwn-event'),venue:document.getElementById('cdwn-venue'),cta:document.getElementById('cdwn-cta')};
  if(!el.event)return;
  function pad(n){return String(n).padStart(2,'0');}
  function tick(){
    var now=Date.now(),next=null;
    for(var i=0;i<events.length;i++){if(events[i].date.getTime()>now){next=events[i];break;}}
    if(!next){el.event.textContent='Próximas fechas en camino...';el.d.textContent=el.h.textContent=el.m.textContent=el.s.textContent='00';return;}
    el.event.textContent=next.name;
    el.venue.textContent=next.venue;
    if(next.url&&!el.cta.innerHTML)el.cta.innerHTML='<a href="'+next.url+'" target="_blank" rel="noopener noreferrer" class="btn-orange" style="display:inline-block;margin-top:8px;">Entradas ↗</a>';
    var diff=next.date.getTime()-now;
    el.d.textContent=pad(Math.floor(diff/86400000));
    el.h.textContent=pad(Math.floor((diff%86400000)/3600000));
    el.m.textContent=pad(Math.floor((diff%3600000)/60000));
    el.s.textContent=pad(Math.floor((diff%60000)/1000));
  }
  tick();setInterval(tick,1000);
})();

// ── CUENTA ATRÁS PEQUEÑA EN CADA FILA DE LA LISTA ─────────────────────────────
(function(){
  var rows=document.querySelectorAll('.slist-row[data-date]');
  if(!rows.length)return;
  function daysUntil(dateStr){
    var target=new Date(dateStr+'T00:00:00');
    var today=new Date();
    today.setHours(0,0,0,0);
    target.setHours(0,0,0,0);
    return Math.round((target-today)/86400000);
  }
  function fmt(days){
    if(days<0)return'';
    if(days===0)return'Hoy';
    if(days===1)return'Mañana';
    return'En '+days+' días';
  }
  rows.forEach(function(row){
    var el=row.querySelector('.slist-countdown');
    if(!el)return;
    el.textContent=fmt(daysUntil(row.getAttribute('data-date')));
  });
})();

// ── FLOATING SHOW PILL (solo si existe) ──────────────────────────────────────
(function(){
  var events=window.davizShows||[];
  var pill=document.getElementById('show-pill');
  if(!pill||!events.length)return;
  var eName=document.getElementById('sp-evt'),eCd=document.getElementById('sp-cd'),eDt=document.getElementById('sp-dt');
  function pad(n){return String(n).padStart(2,'0');}
  function tick(){
    var now=Date.now(),next=null;
    for(var i=0;i<events.length;i++){if(events[i].date.getTime()>now){next=events[i];break;}}
    if(!next){pill.style.display='none';return;}
    eName.textContent=next.name;
    var diff=next.date.getTime()-now,d=Math.floor(diff/86400000),h=pad(Math.floor((diff%86400000)/3600000)),m=pad(Math.floor((diff%3600000)/60000));
    eCd.textContent=d>0?d+'d '+h+'h ':h+'h '+m+'m';
    eDt.textContent=(next.venue||'').replace('📍 ','');
  }
  tick();setInterval(tick,30000);
  window.addEventListener('scroll',function(){pill.classList.toggle('visible',window.scrollY>400);},{passive:true});
})();

// ── OCULTAR BOTONES FLOTANTES CERCA DEL FOOTER (para que no se amontonen) ────
(function(){
  var footer=document.querySelector('footer');
  if(!footer)return;
  var io=new IntersectionObserver(function(entries){
    entries.forEach(function(e){document.body.classList.toggle('footer-in-view',e.isIntersecting);});
  },{rootMargin:'0px 0px -40px 0px'});
  io.observe(footer);
})();

// ── CURSOR GLOW ──────────────────────────────────────────────────────────────
(function(){
  var el=document.getElementById('cursor-glow');
  if(!el)return;
  document.addEventListener('mousemove',function(e){el.style.left=e.clientX+'px';el.style.top=e.clientY+'px';},{passive:true});
})();

// ── VIDEO MASHUP EMBED (solo si existe) ──────────────────────────────────────
(function(){
  var vm=document.getElementById('video-mashup');
  if(!vm)return;
  vm.addEventListener('click',function(){
    this.innerHTML='<iframe width="100%" height="100%" src="https://www.youtube.com/embed/8MTWzI7FjH8?autoplay=1&rel=0" allow="autoplay;encrypted-media;picture-in-picture" allowfullscreen style="border:none;display:block;border-radius:0"></iframe>';
  });
})();

// ── SPOTIFY EMBED (solo si existe — carga el iframe al hacer clic, no antes) ─
(function(){
  var el=document.getElementById('spotify-embed');
  if(!el)return;
  function load(){
    el.outerHTML='<iframe src="https://open.spotify.com/embed/artist/6kuKoUwoqmzqP0vXmkgOH1?utm_source=generator&theme=0" width="100%" height="352" frameborder="0" title="Daviz Garzia en Spotify — Discografía completa" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" style="border:none;display:block"></iframe>';
  }
  el.addEventListener('click',load);
  el.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();load();}});
})();

// ── SOUNDCLOUD EMBED (solo si existe — carga el iframe al hacer clic, no antes) ─
(function(){
  var el=document.getElementById('soundcloud-embed');
  if(!el)return;
  function load(){
    el.outerHTML='<iframe width="100%" height="300" scrolling="no" frameborder="no" allow="autoplay" src="https://w.soundcloud.com/player/?url=https%3A//soundcloud.com/the-north-record-label/reggaeton-mashup-pack-2026-the&color=%23FF6B00&auto_play=false&hide_related=false&show_comments=false&show_user=true&show_reposts=false&show_teaser=true&visual=true" title="Reggaeton Mashup Pack 2026 Vol.02 — The North Record Label" style="display:block"></iframe>';
  }
  el.addEventListener('click',load);
  el.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();load();}});
})();
