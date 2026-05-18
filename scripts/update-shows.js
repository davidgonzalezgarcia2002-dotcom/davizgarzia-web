// Automation: reads upcoming announced shows from Notion → updates index.html
// Runs automatically every Monday via GitHub Actions
// Notion database: Control de Ingresos David (306a485045d780c3ad62f6ac5a907da7)

const fs = require('fs');
const path = require('path');

const NOTION_TOKEN = process.env.NOTION_TOKEN;
const DB_ID = '306a485045d780c3ad62f6ac5a907da7';

const MONTHS_SHORT = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
const MONTHS_FULL  = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

async function queryNotion() {
  const today = new Date().toISOString().split('T')[0];
  const resp = await fetch(`https://api.notion.com/v1/databases/${DB_ID}/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${NOTION_TOKEN}`,
      'Content-Type': 'application/json',
      'Notion-Version': '2022-06-28'
    },
    body: JSON.stringify({
      filter: {
        and: [
          { property: 'Anunciado', checkbox: { equals: true } },
          { property: 'Fecha', date: { on_or_after: today } }
        ]
      },
      sorts: [{ property: 'Fecha', direction: 'ascending' }]
    })
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
  return `
      <div class="upcoming-card" data-anim data-delay="${delay}">
        <div class="uc-date"><div class="uc-day">${dt.day}</div><div class="uc-month">${dt.mon} ${dt.yr2}</div></div>
        <div class="uc-info">
          <div class="uc-venue">${show.name}</div>
          <div class="uc-loc">${loc ? '📍 ' + loc : ''}</div>
        </div>
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

async function main() {
  if (!NOTION_TOKEN) throw new Error('NOTION_TOKEN is not set');

  console.log('Querying Notion...');
  const pages = await queryNotion();
  const shows = pages.map(parseShow).filter(s => s.date);

  console.log(`Found ${shows.length} upcoming announced show(s):`);
  shows.forEach(s => console.log(`  • ${s.date}  ${s.name}  |  ${s.venue}  |  ${s.city}`));

  const htmlPath = path.join(__dirname, '..', 'index.html');
  let html = fs.readFileSync(htmlPath, 'utf8');

  // --- Update shows section ---
  const showsBlock = buildShowsHTML(shows);
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
  const cdwnBlock = buildCountdownEvents(shows);
  if (cdwnBlock) {
    const newHtml2 = html.replace(
      /\/\* AUTO-COUNTDOWN:START \*\/[\s\S]*?\/\* AUTO-COUNTDOWN:END \*\//,
      `/* AUTO-COUNTDOWN:START */\n${cdwnBlock}\n  /* AUTO-COUNTDOWN:END */`
    );
    if (newHtml2 === html) {
      console.warn('WARNING: AUTO-COUNTDOWN markers not found in index.html');
    } else {
      html = newHtml2;
      console.log('Countdown section updated.');
    }
  }

  fs.writeFileSync(htmlPath, html, 'utf8');
  console.log('index.html saved successfully.');
}

main().catch(err => { console.error('ERROR:', err.message); process.exit(1); });
