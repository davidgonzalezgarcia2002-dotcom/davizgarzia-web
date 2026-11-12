/* gz.js: capa de scroll y movimiento. No toca el HTML ni los datos de fechas:
   lo añade todo al cargar, así que si falla algo la web original sigue funcionando. */
(function(){
 var d=document,root=d.documentElement,body=d.body,isHome=body.classList.contains('studio-home');
 var context=null,cleanups=[],building=false,enabled=false,generation=0;
 function listen(target,event,fn,options){target.addEventListener(event,fn,options);cleanups.push(function(){target.removeEventListener(event,fn,options)})}
 function fx(){var r=matchMedia('(prefers-reduced-motion: reduce)').matches;try{var v=localStorage.getItem('fx_pause');if(v!==null)r=v==='1'}catch(e){}return !r}
 function el(tag,cls,html){var e=d.createElement(tag);if(cls)e.className=cls;if(html!=null)e.innerHTML=html;if(building)cleanups.push(function(){e.remove()});return e}
 function safeUrl(u){try{var x=new URL(u,location.href);return x.protocol==='https:'?x.href:''}catch(e){return ''}}

 d.addEventListener('DOMContentLoaded',function(){
  chips();anchors();
  function update(){
   var active=fx()&&!!window.gsap&&!!window.ScrollTrigger;
   if(active===enabled)return;
   enabled=active;generation++;
   if(!active){if(context)context.revert();context=null;cleanups.splice(0).reverse().forEach(function(fn){fn()});root.classList.remove('gz-on');return}
   gsap.registerPlugin(ScrollTrigger);ScrollTrigger.config({ignoreMobileResize:true});
   if(window.__lenis){var lenis=window.__lenis;lenis.on('scroll',ScrollTrigger.update);cleanups.push(function(){lenis.off('scroll',ScrollTrigger.update)})}
   root.classList.add('gz-on');building=true;
   context=gsap.context(function(){cursor();if(isHome)home();else inner()});building=false;
   requestAnimationFrame(function(){if(enabled)ScrollTrigger.refresh()});
  }
  d.addEventListener('dg-fx-change',update);
  matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change',function(){d.dispatchEvent(new CustomEvent('dg-fx-change'))});
  update();
  addEventListener('load',function(){if(enabled)ScrollTrigger.refresh()},{once:true});
 });

 /* ---------- comunes ---------- */
 function chips(){
  var show=(window.davizShows||[]).filter(function(s){return window.dgUpcoming&&window.dgUpcoming(s)})[0];
  var hrefCta='contacto.html#booking',label='',url='shows.html';
  if(show){label=new Intl.DateTimeFormat('es-ES',{day:'2-digit',month:'short',timeZone:'Europe/Madrid'}).format(show.date).replace('.','').toUpperCase();url=safeUrl(show.url)||'shows.html'}
  function fill(a){a.href=url;if(url.indexOf('https:')===0){a.target='_blank';a.rel='noopener noreferrer'}}
  var bar=el('div','gz-bar');
  if(show){
   var n=el('a','gz-next');n.append(el('i'));var b=el('b');b.textContent=label;n.append(b);var s=d.createElement('span');s.textContent=show.name+' ↗';n.append(s);fill(n);body.append(n);
   var m=el('a','gz-bar-show');m.append(el('i'));var b2=el('b');b2.textContent=label;m.append(b2);var s2=d.createElement('span');s2.textContent=show.name;m.append(s2);fill(m);bar.append(m);
  }
  var c=el('a','gz-bar-cta','Hablemos ↗');c.href=hrefCta;bar.append(c);body.append(bar);
 }
 function anchors(){
  d.addEventListener('click',function(e){
   var a=e.target.closest&&e.target.closest('a[href^="#"]');if(!a||!window.__lenis||e.defaultPrevented||e.button!==0||e.ctrlKey||e.metaKey||e.shiftKey||e.altKey)return;
   var id=a.getAttribute('href'),t;try{t=d.getElementById(decodeURIComponent(id.slice(1)))}catch(error){}if(!t)return;
   e.preventDefault();if(enabled)ScrollTrigger.refresh();
   window.__lenis.scrollTo(t,{offset:-70,duration:1.1,onComplete:function(){
    var temporary=!t.hasAttribute('tabindex');if(temporary)t.tabIndex=-1;t.focus({preventScroll:true});
    if(temporary)t.addEventListener('blur',function(){t.removeAttribute('tabindex')},{once:true});
    if(location.hash!==id)history.pushState(null,'',id);
   }});
  });
 }
 function cursor(){
  if(!matchMedia('(hover:hover) and (pointer:fine)').matches)return;
  var c=el('div');c.id='gz-cursor';body.append(c);var x=gsap.quickTo(c,'x',{duration:.28,ease:'power3'}),y=gsap.quickTo(c,'y',{duration:.28,ease:'power3'});
  listen(window,'mousemove',function(e){c.classList.add('on');x(e.clientX);y(e.clientY);c.classList.toggle('big',!!(e.target.closest&&e.target.closest('a,button')))},{passive:true});
 }
 function reveal(sel){gsap.utils.toArray(sel).forEach(function(t){gsap.from(t,{clipPath:'inset(0 0 100% 0)',y:50,duration:1,ease:'power4.out',scrollTrigger:{trigger:t,start:'top 88%',once:true},clearProps:'clipPath,transform'})})}

 /* ---------- páginas interiores: scroll suave, títulos y fotos ---------- */
 function inner(){
  reveal('.section-h,.live-banner h2,.nl-feature h2,.nl-catalog h2');
  gsap.utils.toArray('.giant-foot').forEach(function(g){gsap.fromTo(g,{xPercent:-3},{xPercent:3,ease:'none',scrollTrigger:{trigger:g,start:'top bottom',end:'bottom top',scrub:true}})});
 }

 /* ---------- portada ---------- */
 function home(){
  var mobile=matchMedia('(max-width:600px)').matches;
  var hero=d.querySelector('.st-hero');
  if(!hero||!hero.querySelector('h1'))return;
  var gl=heroGL(hero),state={auto:0,scroll:0};
  function apply(){if(gl)gl.set(Math.max(state.auto,state.scroll))}

  // título letra a letra
  var h1=hero.querySelector('h1');
  var originalHeading=h1.innerHTML,originalLabel=h1.getAttribute('aria-label');
  h1.setAttribute('aria-label',h1.textContent.replace('↗','').trim());
  cleanups.push(function(){h1.innerHTML=originalHeading;if(originalLabel===null)h1.removeAttribute('aria-label');else h1.setAttribute('aria-label',originalLabel)});
  [].slice.call(h1.childNodes).forEach(function(n){if(n.nodeType===3&&n.textContent.trim()){var w=el('span');w.innerHTML=n.textContent.trim().split('').map(function(c){return '<span class="gz-ch">'+c+'</span>'}).join('');n.replaceWith(w)}else if(n.tagName==='SPAN'){n.innerHTML=n.textContent.split('').map(function(c){return '<span class="gz-ch">'+c+'</span>'}).join('')}});
  [].forEach.call(h1.querySelectorAll('.gz-ch'),function(span){span.setAttribute('aria-hidden','true')});
  var wait=.1;
  gsap.from('.st-hero .gz-ch',{yPercent:115,duration:1.1,stagger:.035,ease:'power4.out',delay:wait});
  // La información y los botones siguen visibles durante la entrada.
  gsap.from('.st-eyebrow,.st-intro,.st-actions,.st-hero-bottom',{y:12,duration:.65,stagger:.05,delay:wait,ease:'power2.out'});
  gsap.to(state,{auto:.3,duration:2.4,delay:wait,ease:'power2.out',onUpdate:apply});
  var arrow=hero.querySelector('.st-hero-bottom a span');if(arrow)arrow.classList.add('gz-scrollhint');

  // el retrato se forma al bajar
  var htl=gsap.timeline({scrollTrigger:{trigger:hero,start:'top top',end:'+='+(mobile?'80%':'100%'),pin:true,scrub:true,anticipatePin:1,onUpdate:function(s){state.scroll=.3+.7*Math.min(1,s.progress/.82);apply()}}});
  htl.to('.st-hero-copy',{opacity:0,y:-70,ease:'none',duration:.4},.12).to('.st-hero-bottom',{opacity:0,ease:'none',duration:.15},.05).to({},{duration:.45},.55);

  // palabras gigantes
  var words=[
   {at:'#escuchar',w:'ESCUCHA',video:'media/visuales/boca-con-nombre',pos:'50% 62%'},
   {at:'#proximas',w:'FECHAS',img:'photos/hero-bibe.webp',pos:'60% 50%'},
   {at:'.st-about',w:'CABINA',video:'media/visuales/daviz-sentado-v2',pos:'50% 40%'},
   {at:'#formatos',w:'SHOWS',img:'photos/bibe-2026-escenario.webp',pos:'55% 50%'}
  ];
  var fits=[];
  words.forEach(function(o){
   var tgt=d.querySelector(o.at);if(!tgt)return;
   var box=el('div','gz-word');box.setAttribute('aria-hidden','true');
   var media=el('div','gz-w-media'),m;
   if(o.video&&!mobile&&!(navigator.connection&&navigator.connection.saveData)){m=d.createElement('video');m.muted=true;m.loop=true;m.playsInline=true;m.setAttribute('playsinline','');m.preload='none';m.poster=o.video+'.jpg';m.src=o.video+'.mp4'}
   else{m=d.createElement('img');m.alt='';m.loading='lazy';m.src=o.video?o.video+'.jpg':o.img}
   m.style.objectPosition=o.pos;media.append(m);
   var mask=el('div','gz-w-mask'),sp=d.createElement('span');sp.textContent=o.w;mask.append(sp);box.append(media,mask);tgt.parentNode.insertBefore(box,tgt);
   fits.push(sp);
   cleanups.push(function(){if(m.tagName==='VIDEO'){m.pause();m.removeAttribute('src');m.load()}});
   var tl=gsap.timeline({scrollTrigger:{trigger:box,start:'top top',end:mobile?'+=60%':'+=80%',pin:true,scrub:true,anticipatePin:1,
    onToggle:function(s){if(m.tagName==='VIDEO'){if(s.isActive){var r=m.play();if(r&&r.catch)r.catch(function(){})}else m.pause()}}}});
   tl.fromTo(sp,{clipPath:'inset(46% 0 46% 0)'},{clipPath:'inset(0% 0 0% 0)',ease:'power2.inOut',duration:.3},0)
     .fromTo(media,{scale:1.22},{scale:1,ease:'none',duration:1},0)
     .to(mask,{scale:9,ease:'power2.in',duration:.42},.38)
     .to(mask,{opacity:0,ease:'none',duration:.1},.72)
     .to(media,{opacity:.3,ease:'none',duration:.14},.86);
  });
  function fit(){fits.forEach(function(s){s.style.fontSize='100px';var w=s.getBoundingClientRect().width||1;var f=100*(innerWidth*.94)/w;s.style.fontSize=Math.min(f,innerHeight*.72/(mobile?2.1:1))+'px'})}
  var ownGeneration=generation;
  fit();if(d.fonts&&d.fonts.ready)d.fonts.ready.then(function(){if(enabled&&generation===ownGeneration){fit();ScrollTrigger.refresh()}});listen(window,'resize',fit);

  // salas en movimiento
  var ven=[].slice.call(d.querySelectorAll('.st-venues li')).map(function(l){return l.textContent});
  var about=d.querySelector('.st-about');
  if(ven.length&&about){
   var band=el('div','gz-venues');band.setAttribute('aria-hidden','true');
   function row(list){return list.concat(list).map(function(v){return v+'<em>↗</em>'}).join(' ')}
   var r1=el('div','',row(ven)),r2=el('div','',row(ven.slice().reverse()));band.append(r1,r2);about.parentNode.insertBefore(band,about.nextSibling);
   gsap.fromTo(r1,{xPercent:-2},{xPercent:-28,ease:'none',scrollTrigger:{trigger:band,start:'top bottom',end:'bottom top',scrub:true}});
   gsap.fromTo(r2,{xPercent:-30},{xPercent:-4,ease:'none',scrollTrigger:{trigger:band,start:'top bottom',end:'bottom top',scrub:true}});
  }

  // títulos, filas y fotos
  reveal('.st-title,.st-about-copy h2,.st-north h2,.st-release h2');
  gsap.from('.st-event',{y:46,opacity:0,duration:.8,stagger:.09,ease:'power3.out',scrollTrigger:{trigger:'#st-events',start:'top 86%',once:true}});
  gsap.from('.st-venues li',{y:14,opacity:0,duration:.5,stagger:.04,scrollTrigger:{trigger:'.st-venues',start:'top 92%',once:true}});
  var live=d.querySelector('.st-live-image img');if(live)gsap.fromTo(live,{yPercent:-7},{yPercent:7,ease:'none',scrollTrigger:{trigger:'.st-live-image',start:'top bottom',end:'bottom top',scrub:true}});
  gsap.from('.st-about-photo',{clipPath:'inset(18% 12% 18% 12%)',ease:'none',scrollTrigger:{trigger:'.st-about-photo',start:'top 92%',end:'top 35%',scrub:true}});
  var mark=d.querySelector('.st-north-mark');if(mark)gsap.fromTo(mark,{yPercent:-18,xPercent:8},{yPercent:18,xPercent:-8,ease:'none',scrollTrigger:{trigger:'.st-north',start:'top bottom',end:'bottom top',scrub:true}});

  // formatos en horizontal
  var mm=gsap.matchMedia();
  cleanups.push(function(){mm.revert()});
  mm.add('(min-width:901px)',function(){
   var sec=d.querySelector('.st-formats'),track=d.querySelector('.st-format-grid');
   var tween=gsap.to(track,{x:function(){return -Math.max(0,track.scrollWidth-innerWidth)},ease:'none',scrollTrigger:{trigger:sec,start:'top top',end:function(){return '+='+Math.max(innerHeight*.9,track.scrollWidth-innerWidth)*1.1},pin:true,scrub:true,anticipatePin:1,invalidateOnRefresh:true}});
   function focusCard(e){var card=e.target.closest('.st-format');if(!card)return;var st=tween.scrollTrigger;var maximum=Math.max(1,track.scrollWidth-innerWidth);var progress=Math.max(0,Math.min(1,(card.offsetLeft-track.offsetLeft)/maximum));var y=st.start+progress*(st.end-st.start);requestAnimationFrame(function(){if(!enabled)return;sec.scrollLeft=0;if(window.__lenis)window.__lenis.scrollTo(y,{immediate:true});else window.scrollTo(0,y)})}
   track.addEventListener('focusin',focusCard);return function(){track.removeEventListener('focusin',focusCard)};
  });
  mm.add('(max-width:900px)',function(){gsap.from('.st-format',{y:40,opacity:0,duration:.7,stagger:.12,scrollTrigger:{trigger:'.st-format-grid',start:'top 85%',once:true}})});

  // contratar: se abre y se vuelve naranja
  var bk=d.querySelector('.st-booking');
  if(bk){
   var tl=gsap.timeline({scrollTrigger:{trigger:'#booking',start:'top top',end:mobile?'+=45%':'+=60%',pin:true,scrub:true,anticipatePin:1}});
   tl.fromTo(bk,{clipPath:'inset(14% 10% 14% 10% round 22px)'},{clipPath:'inset(0% 0% 0% 0% round 0px)',ease:'power2.out',duration:.45},0)
     .to(bk,{backgroundColor:'#ff6b00',color:'#0b0c0d',ease:'none',duration:.35},.25)
     .fromTo('.st-booking h2',{scale:.86,transformOrigin:'0 50%'},{scale:1,ease:'none',duration:.6},0)
     .to({},{duration:.25},.75);
  }
 }

 /* ---------- retrato con shader: manchas de luz naranja que acaban en la foto real ---------- */
 function heroGL(hero){
  var src=hero.querySelector('.st-portrait img');if(!src)return null;
  var cv=d.createElement('canvas');cv.id='gz-gl';cv.setAttribute('role','img');cv.setAttribute('aria-label',src.alt||'Daviz Garzia en directo');var g;
  try{g=cv.getContext('webgl',{antialias:false,alpha:false,powerPreference:'low-power'})}catch(e){}
  if(!g)return null;
  var vs='attribute vec2 a;varying vec2 v;void main(){v=a*.5+.5;gl_Position=vec4(a,0.,1.);}';
  var fs='#ifdef GL_FRAGMENT_PRECISION_HIGH\nprecision highp float;\n#else\nprecision mediump float;\n#endif\nvarying vec2 v;uniform sampler2D T;uniform vec2 R,I;uniform float P,U;'+
  'float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}'+
  'float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}'+
  'float fb(vec2 p){return .5*n(p)+.3*n(p*2.3+7.)+.2*n(p*5.1+3.);}'+
  'void main(){float ra=R.x/R.y,ri=I.x/I.y;vec2 s=ra>ri?vec2(1.,ri/ra):vec2(ra/ri,1.);float z=mix(.82,1.,P);'+
  'vec2 c=ra>ri?vec2(.58,.66):vec2(.62,.62);vec2 uv=(v-.5)*s*z+c;vec3 ph=texture2D(T,uv).rgb;float L=dot(ph,vec3(.3,.59,.11));'+
  'float rv=smoothstep(0.,.62,P);float th=mix(1.05,.2,rv);float nz=fb(v*vec2(ra,1.)*5.+vec2(U*.05,U*.03));float va=L*1.25+(nz-.5)*mix(.95,.22,rv);'+
  'float m=smoothstep(th,th+.05,va);vec3 bg=vec3(.043,.047,.051),am=vec3(1.,.42,0.),cr=vec3(1.,.9,.76);'+
  'vec3 duo=mix(bg,am,m);duo=mix(duo,cr,smoothstep(th+.2,th+.5,va));'+
  'vec3 col=mix(duo,ph*.95,smoothstep(.66,.96,P));'+
  'float side=ra>1.?smoothstep(.05,.62,v.x):smoothstep(.1,.5,v.y)*.7+.3;col*=mix(side,1.,smoothstep(.34,.6,P));'+
  'col+=(h(v*R+U)-.5)*.055;gl_FragColor=vec4(col,1.);}';
  function sh(t,s){var x=g.createShader(t);g.shaderSource(x,s);g.compileShader(x);return x}
  var pr=g.createProgram();g.attachShader(pr,sh(g.VERTEX_SHADER,vs));g.attachShader(pr,sh(g.FRAGMENT_SHADER,fs));g.linkProgram(pr);
  if(!g.getProgramParameter(pr,g.LINK_STATUS))return null;
  g.useProgram(pr);var buf=g.createBuffer();g.bindBuffer(g.ARRAY_BUFFER,buf);g.bufferData(g.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),g.STATIC_DRAW);var la=g.getAttribLocation(pr,'a');g.enableVertexAttribArray(la);g.vertexAttribPointer(la,2,g.FLOAT,false,0,0);
  var uR=g.getUniformLocation(pr,'R'),uI=g.getUniformLocation(pr,'I'),uP=g.getUniformLocation(pr,'P'),uU=g.getUniformLocation(pr,'U');
  var ready=false,p=0,visible=true,alive=true,frame=0,last=0,img=new Image();img.decoding='async';
  var texture=null;
  img.onload=function(){if(!alive||g.isContextLost())return;try{texture=g.createTexture();g.bindTexture(g.TEXTURE_2D,texture);g.pixelStorei(g.UNPACK_FLIP_Y_WEBGL,true);g.texImage2D(g.TEXTURE_2D,0,g.RGBA,g.RGBA,g.UNSIGNED_BYTE,img);[g.TEXTURE_WRAP_S,g.TEXTURE_WRAP_T].forEach(function(w){g.texParameteri(g.TEXTURE_2D,w,g.CLAMP_TO_EDGE)});g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MIN_FILTER,g.LINEAR);g.uniform2f(uI,img.naturalWidth,img.naturalHeight);ready=true;hero.insertBefore(cv,hero.firstChild);hero.classList.add('gz-gl');size();}catch(e){}};
  // Reutiliza la imagen elegida por el navegador, también si es AVIF.
  img.src=src.currentSrc||src.src;
  function size(){var dpr=Math.min(devicePixelRatio||1,innerWidth<700?1.25:1.5),w=Math.round(hero.clientWidth*dpr),h=Math.round(hero.clientHeight*dpr);if(cv.width!==w||cv.height!==h){cv.width=w;cv.height=h;g.viewport(0,0,w,h)}g.uniform2f(uR,w,h)}
  listen(window,'resize',function(){if(ready)size()});
  var observer=new IntersectionObserver(function(e){visible=e[0].isIntersecting});observer.observe(hero);
  listen(cv,'webglcontextlost',function(e){e.preventDefault();ready=false;hero.classList.remove('gz-gl');cv.remove()});
  (function loop(ts){if(!alive)return;frame=requestAnimationFrame(loop);if(!ready||!visible||d.hidden||ts-last<33)return;last=ts;g.uniform1f(uP,p);g.uniform1f(uU,(ts||0)/1000);g.drawArrays(g.TRIANGLES,0,3)})();
  cleanups.push(function(){alive=false;img.onload=null;cancelAnimationFrame(frame);observer.disconnect();hero.classList.remove('gz-gl');cv.remove();if(texture)g.deleteTexture(texture);g.deleteBuffer(buf);g.deleteProgram(pr)});
  return {set:function(v){p=v}};
 }
})();
