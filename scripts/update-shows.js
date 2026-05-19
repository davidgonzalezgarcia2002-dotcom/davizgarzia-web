// Automation: reads shows from Notion → updates index.html
// Runs automatically every Monday via GitHub Actions
// Notion database: Control de Ingresos David (306a485045d780c3ad62f6ac5a907da7)

const fs = require('fs');
const path = require('path');

const NOTION_TOKEN = process.env.NOTION_TOKEN;
const DB_ID = '306a485045d780c3ad62f6ac5a907da7';

const MONTHS_SHORT = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
const MONTHS_FULL  = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const HIST_COLORS  = [
  'linear-gradient(135deg,#7c3aed,#4f46e5)',
  'linear-gradient(135deg,#FF6B00,#FF9A00)',
  'linear-gradient(135deg,#0284c7,#06b6d4)',
  'linear-gradient(135deg,#059669,#10b981)',
  'linear-gradient(135deg,#ca8a04,#fbbf24)',
  'linear-gradient(135deg,#dc2626,#f97316)',
];

async function queryNotion(filter, sorts) {
  const resp = await fetch(`https://api.notion.com/v1/databases/${DB_ID}/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${NOTION_TOKEN}`,
      'Content-Type': 'application/json',
      'Notion-Version': '2022-06-28'
    },
    body: JSON.stringify({ filter, sorts })
  });
  if (!resp.ok) throw new Error(`Notion API error: ${resp.status} ${await resp.text()}`);
  const data = await resp.json();
  return data.results || [];
}

function parseShow(page) {
  const props = page.properties;
  return {
    name:   props['Nombre del Evento/Proyecto']?.title?.[0]?.plain_text || 'Show',
    date:   props['Fecha']?.date?.start || '',
    venue:  props['Cliente']?.rich_text?.[0]?.plain_text || '',
    city:   props['Ciudad']?.rich_text?.[0]?.plain_text || '',
    url:    props['URL Entradas']?.url || ''
  };
}

function parseDate(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr + 'T12:00:00');
  return { d, day: d.getDate(), mon: MONTHS_SHORT[d.getMonth()], monFull: MONTHS_FULL[d.getMonth()], yr: d.getFullYear(), yr2: String(d.getFullYear()).slice(2) };
}

function esc(str) { return str.replace(/'/g, "\\'").replace(/"/g, '&quot;'); }

// ── UPCOMING SHOWS ───────────────────────────────────────────────────────────

function htmlFeatured(show) {
  const dt = parseDate(show.date);
  if (!dt) return '';
  const loc = [show.venue, show.city].filter(Boolean).join(' · ');
  const btn = show.url ? `<a href="${show.url}" target="_blank" class="btn-orange">Entradas ↗</a>` : '';
  return `
    <div class="upcoming-featured" data-anim="scale">
      <div class="upcoming-featured-date"><div class="uf-day">${dt.day}</div><div class="uf-month">${dt.mon} ${dt.yr}</div></div>
      <div class="upcoming-featured-info">
        <div class="uf-event">${show.name}</div>
        <div class="uf-desc">${loc || 'Cantabria'}</div>
        <div class="uf-tags">${loc ? `<span class="uf-tag">📍 ${loc}</span>` : ''}</div>
      </div>
      ${btn}
    </div>`;
}

function htmlCard(show, delay) {
  const dt = parseDate(show.date);
  if (!dt) return '';
  const loc = [show.venue, show.city].filter(Boolean).join(', ');
  const ticket = show.url ? `<a href="${show.url}" target="_blank" class="uc-ticket">🎟️ Entradas</a>` : '';
  return `
      <div class="upcoming-card" data-anim data-delay="${delay}">
        <div class="uc-date"><div class="uc-day">${dt.day}</div><div class="uc-month">${dt.mon} ${dt.yr2}</div></div>
        <div class="uc-info">
          <div class="uc-venue">${show.name}</div>
          <div class="uc-loc">${loc ? '📍 ' + loc : ''}</div>
        </div>
        ${ticket}
      </div>`;
}

function buildShowsHTML(shows) {
  if (!shows.length) {
    return `
    <div style="text-align:center;padding:60px 0;color:var(--muted2);">
      <p style="font-size:16px;margin-bottom:18px;">Próximas fechas en camino...</p>
      <a href="#booking" class="btn-orange">¿Quieres contratarme? →</a>
    </div>`;
  }
  const [first, ...rest] = shows;
  let html = htmlFeatured(first);
  if (rest.length) {
    html += `\n    <div class="upcoming-grid" style="margin-top:16px;">`;
    rest.forEach((s, i) => { html += htmlCard(s, i + 1); });
    html += `\n    </div>`;
  }
  return html;
}

function buildCountdownEvents(shows) {
  if (!shows.length) return '';
  return shows.map(s => {
    const dt = parseDate(s.date);
    if (!dt) return null;
    const isoDate = new Date(s.date + 'T22:00:00').toISOString();
    const loc = [s.venue, s.city].filter(Boolean).join(', ');
    return `    {date:new Date('${isoDate}'),name:'${esc(s.name)}',venue:'📍 ${esc(loc)}',url:'${s.url}'}`;
  }).filter(Boolean).join(',\n');
}

// ── GALERÍA ──────────────────────────────────────────────────────────────────

const VENUE_LABELS = {
  'roxel-labrador': 'Roxel · Labrador',
  'feria-roxel':    'Feria de Abril · Roxel',
  'planb-live':     'Plan B · Palencia',
  'roxel':          'Roxel · Solares',
  'planb':          'Plan B · Palencia',
};

function buildGalleryHTML(photos) {
  const shuffled = [...photos].sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, Math.min(6, shuffled.length));
  return selected.map((photoPath, i) => {
    const base = path.basename(photoPath, path.extname(photoPath)).toLowerCase();
    let venue = 'En directo · 2026';
    for (const [key, label] of Object.entries(VENUE_LABELS)) {
      if (base.startsWith(key)) { venue = label; break; }
    }
    return `
      <div class="gal-item" data-anim data-delay="${i + 1}">
        <img src="${photoPath}" alt="Daviz Garzia DJ set" loading="lazy" style="width:100%;height:100%;object-fit:cover;display:block;transition:transform .5s ease">
        <div class="gal-overlay">
          <div><div class="gal-label">${venue}</div><div class="gal-sub">En directo · 2026</div></div>
        </div>
        <a href="https://www.instagram.com/davizgarzia.music/" target="_blank" class="gal-ig-link">📸 @davizgarzia.music</a>
      </div>`;
  }).join('');
}

// ── HISTORIAL ────────────────────────────────────────────────────────────────

function htmlHistorialCard(show, i) {
  const dt = parseDate(show.date);
  if (!dt) return '';
  const displayName = show.venue || show.name;
  const initial = displayName.slice(0, 2).toUpperCase();
  const color = HIST_COLORS[i % HIST_COLORS.length];
  const dateStr = `${dt.day} ${dt.monFull} ${dt.yr}`;
  return `
      <div class="show-card" data-anim data-delay="${(i % 6) + 1}">
        <div class="show-card-top">
          <div class="show-logo-placeholder" style="background:${color}">${initial}</div>
          <div>
            <div class="show-venue-name">${displayName}</div>
            <div class="show-date-badge">${dateStr}</div>
          </div>
        </div>
        <div class="show-bottom">
          ${show.city ? `<span class="show-loc-chip">📍 ${show.city}</span>` : ''}
        </div>
      </div>`;
}

function buildHistorialHTML(shows) {
  if (!shows.length) return '';
  return shows.map((s, i) => htmlHistorialCard(s, i)).join('');
}

// ── MAIN ─────────────────────────────────────────────────────────────────────

async function main() {
  if (!NOTION_TOKEN) throw new Error('NOTION_TOKEN is not set');

  const today = new Date().toISOString().split('T')[0];
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  // --- Upcoming shows ---
  console.log('Querying upcoming shows...');
  const upcomingPages = await queryNotion(
    { and: [
      { property: 'Anunciado', checkbox: { equals: true } },
      { property: 'Fecha', date: { on_or_after: today } }
    ]},
    [{ property: 'Fecha', direction: 'ascending' }]
  );
  const upcomingShows = upcomingPages.map(parseShow).filter(s => s.date);
  console.log(`Found ${upcomingShows.length} upcoming show(s):`);
  upcomingShows.forEach(s => console.log(`  • ${s.date}  ${s.name}  |  ${s.venue}  |  ${s.city}`));

  // --- Past shows (historial, last 90 days) ---
  console.log('Querying historial...');
  const histPages = await queryNotion(
    { and: [
      { property: 'Fecha', date: { before: today } },
      { property: 'Fecha', date: { on_or_after: ninetyDaysAgo } },
      { property: 'Categoría', multi_select: { contains: '🎧 DJ' } }
    ]},
    [{ property: 'Fecha', direction: 'descending' }]
  );
  const histShows = histPages.map(parseShow).filter(s => s.date);
  console.log(`Found ${histShows.length} past show(s) for historial:`);
  histShows.forEach(s => console.log(`  · ${s.date}  ${s.venue || s.name}  |  ${s.city}`));

  const htmlPath = path.join(__dirname, '..', 'index.html');
  let html = fs.readFileSync(htmlPath, 'utf8');

  // --- Update upcoming shows section ---
  const showsBlock = buildShowsHTML(upcomingShows);
  const newHtml1 = html.replace(
    /<!-- AUTO-SHOWS:START -->[\s\S]*?<!-- AUTO-SHOWS:END -->/,
    `<!-- AUTO-SHOWS:START -->${showsBlock}\n    <!-- AUTO-SHOWS:END -->`
  );
  if (newHtml1 === html) {
    console.warn('WARNING: AUTO-SHOWS markers not found in index.html');
  } else {
    html = newHtml1;
    console.log('Shows section updated.');
  }

  // --- Update countdown events array ---
  const cdwnBlock = buildCountdownEvents(upcomingShows);
  if (cdwnBlock) {
    const newHtml2 = html.replace(
      /\/\* AUTO-COUNTDOWN:START \*\/[\s\S]*?\/\* AUTO-COUNTDOWN:END \*\//,
      `/* AUTO-COUNTDOWN:START */\n${cdwnBlock}\n/* AUTO-COUNTDOWN:END */`
    );
    if (newHtml2 === html) {
      console.warn('WARNING: AUTO-COUNTDOWN markers not found in index.html');
    } else {
      html = newHtml2;
      console.log('Countdown section updated.');
    }
  }

  // --- Update historial section (only if Notion has data) ---
  if (histShows.length > 0) {
    const histBlock = buildHistorialHTML(histShows);
    const newHtml3 = html.replace(
      /<!-- AUTO-HISTORIAL:START -->[\s\S]*?<!-- AUTO-HISTORIAL:END -->/,
      `<!-- AUTO-HISTORIAL:START -->${histBlock}\n    <!-- AUTO-HISTORIAL:END -->`
    );
    if (newHtml3 === html) {
      console.warn('WARNING: AUTO-HISTORIAL markers not found in index.html');
    } else {
      html = newHtml3;
      console.log('Historial section updated.');
    }
  } else {
    console.log('No past DJ shows in last 90 days — keeping existing historial content.');
  }

  // --- Gallery photos (photos/live/) ---
  const liveDir = path.join(__dirname, '..', 'photos', 'live');
  let livePhotos = [];
  if (fs.existsSync(liveDir)) {
    livePhotos = fs.readdirSync(liveDir)
      .filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f))
      .map(f => `photos/live/${f}`);
  }
  console.log(`Found ${livePhotos.length} photo(s) in photos/live/`);
  if (livePhotos.length > 0) {
    const galleryBlock = buildGalleryHTML(livePhotos);
    const newHtml4 = html.replace(
      /<!-- AUTO-GALLERY:START -->[\s\S]*?<!-- AUTO-GALLERY:END -->/,
      `<!-- AUTO-GALLERY:START -->${galleryBlock}\n    <!-- AUTO-GALLERY:END -->`
    );
    if (newHtml4 === html) {
      console.warn('WARNING: AUTO-GALLERY markers not found in index.html');
    } else {
      html = newHtml4;
      console.log(`Gallery updated with ${Math.min(6, livePhotos.length)} random photos.`);
    }
  } else {
    console.log('No live photos found — keeping existing gallery.');
  }

  fs.writeFileSync(htmlPath, html, 'utf8');
  console.log('index.html saved successfully.');
}

main().catch(err => { console.error('ERROR:', err.message); process.exit(1); });
