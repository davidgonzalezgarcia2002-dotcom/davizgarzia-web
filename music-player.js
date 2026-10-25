/* Progressive enhancement: release links become in-page listening controls. */
(() => {
  const panel = document.getElementById('music-player');
  if (!panel) return;
  const status = document.getElementById('music-player-status');
  const selectedLink = document.getElementById('music-player-external');
  let controller = null, selected = -1, uri = 'spotify:artist:6kuKoUwoqmzqP0vXmkgOH1';
  let wantsPlayback = false;
  let apiRef = null, initializing = false, generation = 0;
  const releases = [];
  document.querySelectorAll('.rel-list a.rel-item').forEach(link => {
    const url = new URL(link.href);
    const match = url.pathname.match(/^\/(?:intl-[a-z]+\/)?(album|track)\/([A-Za-z0-9]{22})\/?$/);
    if (url.hostname !== 'open.spotify.com' || !match) return;
    const button = document.createElement('button');
    button.type = 'button'; button.className = link.className;
    button.innerHTML = link.innerHTML;
    const title = link.querySelector('.rel-thumb')?.alt || link.textContent.trim();
    button.setAttribute('aria-label', 'Escuchar ' + title + ' aquí');
    button.setAttribute('aria-pressed', 'false');
    button.querySelector('.rel-play-btn')?.setAttribute('aria-hidden', 'true');
    const index = releases.length;
    releases.push({button, title, url: url.href, uri: 'spotify:' + match[1] + ':' + match[2]});
    button.addEventListener('click', () => select(index));
    link.replaceWith(button);
  });
  function frame() { return panel.querySelector('iframe'); }
  function embedUrl() { return 'https://open.spotify.com/embed/' + uri.split(':').slice(1).join('/') + '?theme=0'; }
  function entityUrl() { return 'https://open.spotify.com/' + uri.split(':').slice(1).join('/') + '?theme=0'; }
  function nativeLoad() {
    const el = frame();
    if (el) el.src = embedUrl();
  }
  function load() {
    if (controller) {
      try { const play = wantsPlayback; wantsPlayback = false; controller.loadEntity(entityUrl()); if (play) controller.play(); return; }
      catch (_) { rebuild(); return; }
    }
    if (!initializing) nativeLoad();
  }
  function select(index) {
    if (!releases.length) return;
    selected = (index + releases.length) % releases.length;
    const release = releases[selected]; uri = release.uri; wantsPlayback = true;
    releases.forEach((r, i) => r.button.setAttribute('aria-pressed', String(i === selected)));
    status.textContent = 'Seleccionado: ' + release.title + '. Pulsa ▶ en el reproductor si no empieza.';
    selectedLink.href = release.url;
    load();
    const rect = panel.getBoundingClientRect();
    if (rect.top < 90 || rect.bottom > innerHeight) panel.scrollIntoView({block: 'center', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'});
  }
  document.getElementById('music-prev').addEventListener('click', () => select(selected < 0 ? releases.length - 1 : selected - 1));
  document.getElementById('music-next').addEventListener('click', () => select(selected + 1));
  document.getElementById('music-retry').addEventListener('click', () => {
    wantsPlayback = false; rebuild();
    status.textContent = 'Reproductor recargado. Pulsa ▶ para escuchar.';
  });
  document.querySelector('.music-player-controls').hidden = !releases.length;
  function rebuild() {
    const previous = controller; controller = null; initializing = false; generation++;
    if (previous) { try { previous.destroy(); } catch (_) {} }
    const el = document.createElement('iframe');
    el.src = embedUrl(); el.width = '100%'; el.height = '352'; el.loading = 'eager';
    el.title = 'Daviz Garzia — Escuchar dentro de la web';
    el.allow = 'autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture';
    el.allowFullscreen = true; el.style.cssText = 'border:0;display:block;border-radius:12px';
    panel.replaceChildren(el);
    if (apiRef) connect(apiRef);
  }
  function connect(api) {
    const el = frame(); if (!el) return;
    const ticket = ++generation; initializing = true;
    try { api.createController(el, {url: entityUrl(), width: '100%', height: 352}, instance => {
      if (ticket !== generation) { try { instance.destroy(); } catch (_) {} return; }
      initializing = false;
      controller = instance;
      const currentFrame = frame();
      if (currentFrame) { currentFrame.title = 'Daviz Garzia — Escuchar dentro de la web'; currentFrame.loading = 'eager'; }
      instance.addListener('ready', () => {
        if (wantsPlayback && controller === instance && ticket === generation) load();
      });
    }); } catch (_) { initializing = false; nativeLoad(); }
  }
  window.onSpotifyIframeApiReady = api => { apiRef = api; connect(api); };
  const script = document.createElement('script');
  script.src = 'https://open.spotify.com/embed/iframe-api/v1'; script.async = true;
  document.body.append(script);
})();
