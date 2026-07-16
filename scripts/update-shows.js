// Automation: reads shows from Notion → updates shows.html
// Runs automatically every Monday via GitHub Actions
// Notion database: Control de Ingresos David (306a485045d780c3ad62f6ac5a907da7)

const fs = require('fs');
const path = require('path');

const NOTION_TOKEN = process.env.NOTION_TOKEN;
const DB_ID = '306a485045d780c3ad62f6ac5a907da7';

const MONTHS_SHORT = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
const MONTHS_FULL  = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
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
    url:    props['URL Entradas']?.url || '',
    estado: props['Estado de Pago']?.select?.name || ''
  };
}

// ── SANEADO PARA LA WEB PÚBLICA ──────────────────────────────────────────────
// Regla de oro: nunca notas internas, nombres de clientes ni eventos cancelados.

const PRIVATE_KEYWORDS = /graduaci|cumple|boda|comuni[oó]n|privad|particular|jard[ií]n|despedida|aniversario/i;
const CANCELLED_RE = /cancelad/i;

// Fuera cualquier nota entre paréntesis o tras guiones dobles: "(Cancelado me debe otra)" etc.
function cleanTitle(str) {
  return (str || '')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isCancelled(show) {
  return CANCELLED_RE.test(show.estado) || CANCELLED_RE.test(show.name);
}

// Nombre apto para publicar: eventos privados → "Evento privado"; resto limpio y capitalizado
function publicName(show) {
  if (PRIVATE_KEYWORDS.test(show.name) || PRIVATE_KEYWORDS.test(show.venue)) return 'Evento privado';
  const cleaned = cleanTitle(show.name);
  if (!cleaned) return 'Evento privado';
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

// Ciudad limpia y con primera letra en mayúscula por palabra
function publicCity(str) {
  const cleaned = cleanTitle(str);
  if (!cleaned) return '';
  return cleaned.split(' ').map(w => w.length > 2 ? w.charAt(0).toUpperCase() + w.slice(1) : w).join(' ');
}

// Solo URLs http(s) reales; cualquier otro texto en el campo se descarta
function validUrl(url) {
  return /^https?:\/\//i.test(url || '') ? url : '';
}

function parseDate(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr + 'T12:00:00');
  return { d, day: d.getDate(), mon: MONTHS_SHORT[d.getMonth()], monFull: MONTHS_FULL[d.getMonth()], yr: d.getFullYear(), yr2: String(d.getFullYear()).slice(2) };
}

function esc(str) { return str.replace(/'/g, "\\'").replace(/"/g, '&quot;'); }

// ── UPCOMING SHOWS — formato lista compacta (.slist-row) ─────────────────────

function htmlSlistRow(show, delay) {
  const dt = parseDate(show.date);
  if (!dt) return '';
  // Solo ciudad en la ubicación pública — nunca el nombre del cliente
  const loc = publicCity(show.city);
  const url = validUrl(show.url);
  const ticket = url
    ? `<a href="${url}" target="_blank" rel="noopener noreferrer" class="slist-ticket">Entradas →</a>`
    : `<span class="slist-ticket is-soon">Próximamente</span>`;
  return `
    <div class="slist-row" data-anim data-delay="${delay}">
      <div class="slist-date">${dt.day} ${dt.monFull} ${dt.yr}</div>
      <div class="slist-info">
        <div class="slist-name">${publicName(show)}</div>
        <div class="slist-loc">${loc ? '📍 ' + loc : ''}</div>
      </div>
      ${ticket}
    </div>`;
}

function buildShowsHTML(shows) {
  if (!shows.length) {
    return `
    <div style="text-align:center;padding:60px 0;color:var(--muted2);">
      <p style="font-size:16px;margin-bottom:18px;">Próximas fechas en camino...</p>
      <a href="contacto.html" class="btn-orange">¿Quieres contratarme? →</a>
    </div>`;
  }
  return shows.map((s, i) => htmlSlistRow(s, i)).join('');
}

function buildCountdownEvents(shows) {
  if (!shows.length) return '';
  return shows.map(s => {
    const dt = parseDate(s.date);
    if (!dt) return null;
    const isoDate = new Date(s.date + 'T22:00:00').toISOString();
    const loc = publicCity(s.city);
    return `    {date:new Date('${isoDate}'),name:'${esc(publicName(s))}',venue:'📍 ${esc(loc)}',url:'${validUrl(s.url)}'}`;
  }).filter(Boolean).join(',\n');
}

// ── STRUCTURED DATA (JSON-LD) — solo shows con nombre público real ──────────
// Los eventos anonimizados como "Evento privado" no aportan nada a un buscador
// y no deben salir aquí (misma regla que en la web visible).

function buildEventsJsonLd(shows) {
  const events = shows
    .map(s => ({ show: s, name: publicName(s) }))
    .filter(x => x.name !== 'Evento privado')
    .map(({ show: s, name }) => {
      const city = publicCity(s.city);
      const url = validUrl(s.url);
      const ev = {
        '@type': 'MusicEvent',
        name: `Daviz Garzia en ${name}`,
        startDate: new Date(s.date + 'T20:00:00').toISOString(),
        location: {
          '@type': 'Place',
          name: name,
          address: { '@type': 'PostalAddress', addressLocality: city, addressCountry: 'ES' }
        },
        performer: { '@type': 'MusicGroup', name: 'Daviz Garzia' }
      };
      if (url) ev.url = url;
      return ev;
    });
  const graph = { '@context': 'https://schema.org', '@graph': events };
  return `<script type="application/ld+json">\n${JSON.stringify(graph, null, 2)}\n  </script>`;
}

// ── MAIN ─────────────────────────────────────────────────────────────────────

async function main() {
  if (!NOTION_TOKEN) throw new Error('NOTION_TOKEN is not set');

  const today = new Date().toISOString().split('T')[0];

  // --- Upcoming shows ---
  console.log('Querying upcoming shows...');
  const upcomingPages = await queryNotion(
    { and: [
      { property: 'Anunciado', checkbox: { equals: true } },
      { property: 'Fecha', date: { on_or_after: today } }
    ]},
    [{ property: 'Fecha', direction: 'ascending' }]
  );
  const upcomingShows = upcomingPages.map(parseShow).filter(s => s.date && !isCancelled(s));
  console.log(`Found ${upcomingShows.length} upcoming show(s):`);
  upcomingShows.forEach(s => console.log(`  • ${s.date}  ${s.name}  |  ${s.venue}  |  ${s.city}`));

  const htmlPath = path.join(__dirname, '..', 'shows.html');
  let html = fs.readFileSync(htmlPath, 'utf8');

  // --- Update upcoming shows section ---
  const showsBlock = buildShowsHTML(upcomingShows);
  const newHtml1 = html.replace(
    /<!-- AUTO-SHOWS:START -->[\s\S]*?<!-- AUTO-SHOWS:END -->/,
    `<!-- AUTO-SHOWS:START -->${showsBlock}\n    <!-- AUTO-SHOWS:END -->`
  );
  if (newHtml1 === html) {
    console.warn('WARNING: AUTO-SHOWS markers not found in shows.html');
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
      console.warn('WARNING: AUTO-COUNTDOWN markers not found in shows.html');
    } else {
      html = newHtml2;
      console.log('Countdown section updated.');
    }
  }

  // --- Update structured data (JSON-LD) ---
  const eventsBlock = buildEventsJsonLd(upcomingShows);
  const newHtml3 = html.replace(
    /<!-- AUTO-EVENTS:START -->[\s\S]*?<!-- AUTO-EVENTS:END -->/,
    `<!-- AUTO-EVENTS:START -->\n  ${eventsBlock}\n  <!-- AUTO-EVENTS:END -->`
  );
  if (newHtml3 === html) {
    console.warn('WARNING: AUTO-EVENTS markers not found in shows.html');
  } else {
    html = newHtml3;
    console.log('Events JSON-LD updated.');
  }

  fs.writeFileSync(htmlPath, html, 'utf8');
  console.log('shows.html saved successfully.');
}

main().catch(err => { console.error('ERROR:', err.message); process.exit(1); });
