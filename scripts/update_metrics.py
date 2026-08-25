#!/usr/bin/env python3
"""
Actualización semanal automática de davizgarziamusic.com
- Spotify: últimos lanzamientos + total de singles del artista
- YouTube: vistas del vídeo 8MTWzI7FjH8 + suscriptores canal oficial
- Instagram: seguidores scraping público
- TikTok: likes scraping og:description público
- HTML: actualiza data-metric y bloque AUTO-RELEASES

Variables de entorno requeridas:
  SPOTIFY_CLIENT_ID
  SPOTIFY_CLIENT_SECRET
  YT_API_KEY
"""

import sys
import os
import re
import json
import math
import urllib.request
import urllib.parse
import urllib.error
from datetime import datetime

if sys.stdout.encoding != 'utf-8':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

SPOTIFY_ARTIST_ID = "6kuKoUwoqmzqP0vXmkgOH1"
YT_VIDEO_ID = "8MTWzI7FjH8"
YT_CHANNEL_HANDLE = "Davizgarziamusic"
IG_USERNAME = "davizgarzia.music"
TIKTOK_USERNAME = "davizgarzia.music"
HTML_FILE = "index.html"
MUSICA_FILE = "musica.html"

ARTIST_SPOTIFY_URL = "https://open.spotify.com/intl-es/artist/6kuKoUwoqmzqP0vXmkgOH1"


# ── helpers ──────────────────────────────────────────────────────────────────

def http_get(url, headers=None):
    req = urllib.request.Request(url, headers=headers or {})
    with urllib.request.urlopen(req, timeout=15) as r:
        return json.loads(r.read().decode())


def fmt_number(n):
    """144200 → '144K', 2500 → '2.5K', 1200000 → '1.2M'"""
    if n >= 1_000_000:
        v = n / 1_000_000
        return f"{v:.1f}M".rstrip("0").rstrip(".") + "M" if "." in f"{v:.1f}M" else f"{int(v)}M"
    if n >= 1000:
        v = n / 1000
        s = f"{v:.1f}"
        if s.endswith(".0"):
            return f"{int(v)}K"
        return f"{s}K"
    return str(n)


# ── Spotify ───────────────────────────────────────────────────────────────────

def spotify_token():
    client_id = os.environ["SPOTIFY_CLIENT_ID"]
    client_secret = os.environ["SPOTIFY_CLIENT_SECRET"]
    creds = urllib.parse.urlencode({"grant_type": "client_credentials"}).encode()
    auth = (client_id + ":" + client_secret).encode()
    import base64
    b64 = base64.b64encode(auth).decode()
    req = urllib.request.Request(
        "https://accounts.spotify.com/api/token",
        data=creds,
        headers={"Authorization": f"Basic {b64}", "Content-Type": "application/x-www-form-urlencoded"},
    )
    with urllib.request.urlopen(req, timeout=15) as r:
        return json.loads(r.read().decode())["access_token"]


def spotify_albums(token):
    """Devuelve lista de álbumes/singles ordenados por fecha desc (máx 50)."""
    url = (
        f"https://api.spotify.com/v1/artists/{SPOTIFY_ARTIST_ID}/albums"
        f"?include_groups=single,album&market=ES&limit=50"
    )
    data = http_get(url, {"Authorization": f"Bearer {token}"})
    items = data.get("items", [])
    items.sort(key=lambda x: x.get("release_date", ""), reverse=True)
    return items


def build_release_html(album):
    name = album["name"]
    date = album.get("release_date", "2025")[:4]
    album_type = "Álbum" if album["album_type"] == "album" else "Sencillo"
    url = album["external_urls"]["spotify"]
    img = album["images"][-1]["url"] if album.get("images") else ""
    # mark newest
    badge = ' <span class="rel-badge-new">Nuevo</span>' if album == "_newest_" else ""
    return (
        f'          <a href="{url}" target="_blank" rel="noopener noreferrer" class="rel-item">\n'
        f'            <img class="rel-thumb" src="{img}" alt="{name}" loading="lazy">\n'
        f'            <div class="rel-inf"><div class="rel-inf-title">{name}{badge}</div>'
        f'<div class="rel-inf-meta">{album_type} · {date}</div></div>\n'
        f'            <span class="rel-play-btn">▶</span>\n'
        f'          </a>\n'
    )


# ── YouTube ───────────────────────────────────────────────────────────────────

def youtube_views(yt_key):
    url = (
        f"https://www.googleapis.com/youtube/v3/videos"
        f"?part=statistics&id={YT_VIDEO_ID}&key={yt_key}"
    )
    data = http_get(url)
    items = data.get("items", [])
    if not items:
        return None
    return int(items[0]["statistics"]["viewCount"])


def youtube_channel_subs(yt_key, handle="Davizgarziamusic"):
    url = (
        f"https://www.googleapis.com/youtube/v3/channels"
        f"?part=statistics&forHandle={handle}&key={yt_key}"
    )
    data = http_get(url)
    items = data.get("items", [])
    if not items:
        return None
    return int(items[0]["statistics"]["subscriberCount"])


# ── Instagram ─────────────────────────────────────────────────────────────────

def instagram_followers(username):
    url = f"https://www.instagram.com/{username}/"
    req = urllib.request.Request(url, headers={
        "User-Agent": "facebookexternalhit/1.1",
        "Accept-Language": "es-ES,es;q=0.9",
    })
    with urllib.request.urlopen(req, timeout=15) as r:
        html = r.read().decode("utf-8", errors="ignore")
    m = re.search(r'([\d][,\d]+)\s*[Ff]ollower', html)
    if not m:
        return None
    return int(m.group(1).replace(",", ""))


# ── TikTok ────────────────────────────────────────────────────────────────────

def tiktok_likes(username):
    url = f"https://www.tiktok.com/@{username}"
    req = urllib.request.Request(url, headers={
        "User-Agent": "facebookexternalhit/1.1",
        "Accept-Language": "es-ES,es;q=0.9",
    })
    with urllib.request.urlopen(req, timeout=15) as r:
        html = r.read().decode("utf-8", errors="ignore")
    # og:description: "@user N seguidores, N siguiendo, Xk me gusta: ..."
    m = re.search(r'content="[^"]*?([\d]+\.?[\d]*[kKmM]?)\s*me gusta', html)
    if not m:
        return None
    raw = m.group(1).lower()
    if 'm' in raw:
        return int(float(raw.replace('m', '')) * 1_000_000)
    if 'k' in raw:
        return int(float(raw.replace('k', '')) * 1_000)
    return int(raw)


# ── HTML patching ─────────────────────────────────────────────────────────────

def patch_hero_now_nuevo(html, release_name):
    """Fila 'Nuevo' del bloque 'Ahora' en index.html (bajo el botón Contratar).
    Estaba escrita a mano ('Baila Salvaje · Out Now') y nunca se tocaba desde
    aquí -- funcionaba de casualidad porque no habia salido single nuevo desde
    que se escribió. Detectado por David 20 ago 2026."""
    pattern = (
        r'(<a class="hero-now-row" href="musica\.html#musica">'
        r'<span class="hn-tag">Nuevo</span><span class="hn-title">)[^<]*(</span>)'
    )
    escaped = release_name.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')

    def replacer(m):
        return f"{m.group(1)}{escaped} · Out Now{m.group(2)}"

    return re.sub(pattern, replacer, html)


def patch_data_metric(html, metric, value):
    """Replace content of <... data-metric="X">...</...>"""
    def replacer(m):
        tag_open = m.group(1)
        tag_close = m.group(3)
        return f"{tag_open}{value}{tag_close}"

    pattern = rf'(<[^>]+data-metric="{re.escape(metric)}"[^>]*>)([^<]*)(</[^>]+>)'
    return re.sub(pattern, replacer, html)


def patch_releases_block(html, releases_html):
    start = "<!-- AUTO-RELEASES:START -->"
    end = "<!-- AUTO-RELEASES:END -->"
    if start not in html or end not in html:
        print("⚠️  Marcadores AUTO-RELEASES no encontrados en el HTML")
        return html
    pre = html[:html.index(start) + len(start)]
    post = html[html.index(end):]
    return pre + "\n" + releases_html + "          " + post


# ── main ─────────────────────────────────────────────────────────────────────

def main():
    # index.html = home corta (stats del hero) · musica.html = discografía/YouTube
    with open(HTML_FILE, encoding="utf-8") as f:
        html = f.read()
    with open(MUSICA_FILE, encoding="utf-8") as f:
        musica_html = f.read()

    changed = False
    musica_changed = False

    # ── Spotify ──
    try:
        token = spotify_token()
        albums = spotify_albums(token)
        total = len(albums)
        print(f"Spotify: {total} lanzamientos encontrados")

        # stat hero (index.html)
        releases_str = f"{total}+" if total >= 9 else str(total)
        new_html = patch_data_metric(html, "spotify_releases", releases_str)
        if new_html != html:
            html = new_html
            changed = True

        # encabezado de discografía (musica.html)
        new_musica = patch_data_metric(musica_html, "releases_heading",
                                        f"{total} singles · Producción propia")
        if new_musica != musica_html:
            musica_html = new_musica
            musica_changed = True

        # fila "Nuevo" del bloque "Ahora" en index.html
        if albums:
            new_html = patch_hero_now_nuevo(html, albums[0]["name"])
            if new_html != html:
                html = new_html
                changed = True

        # releases block (max 7 más recientes) — vive en musica.html
        top = albums[:7]
        lines = []
        for i, alb in enumerate(top):
            item_html = build_release_html(alb)
            if i == 0:
                # inject "Nuevo" badge
                item_html = item_html.replace(
                    f'<div class="rel-inf-title">{alb["name"]}',
                    f'<div class="rel-inf-title">{alb["name"]} <span class="rel-badge-new">Nuevo</span>'
                )
            lines.append(item_html)

        new_musica = patch_releases_block(musica_html, "".join(lines))
        if new_musica != musica_html:
            musica_html = new_musica
            musica_changed = True

    except Exception as e:
        print(f"⚠️  Spotify error: {e}")

    # ── YouTube ──
    try:
        yt_key = os.environ["YT_API_KEY"]
        views = youtube_views(yt_key)
        if views is not None:
            print(f"YouTube: {views:,} vistas")
            views_fmt = fmt_number(views)
            # stat hero (index.html)
            new_html = patch_data_metric(html, "yt_views", views_fmt)
            if new_html != html:
                html = new_html
                changed = True

            # detalle en musica.html
            new_musica = patch_data_metric(musica_html, "yt_views_fmt", f"🔥 {views_fmt} en un vídeo")
            # also patch inline text in video card
            new_musica = re.sub(
                r'(Daviz Garzia &middot; 🔥 )\d+[\d.,]*[KM]? vistas',
                rf'\g<1>{views_fmt} vistas',
                new_musica
            )
            if new_musica != musica_html:
                musica_html = new_musica
                musica_changed = True

        # suscriptores canal oficial (musica.html)
        subs = youtube_channel_subs(yt_key)
        if subs is not None:
            print(f"YouTube suscriptores: {subs:,}")
            subs_str = f"{subs} suscriptores"
            new_musica = patch_data_metric(musica_html, "yt_subs", subs_str)
            if new_musica != musica_html:
                musica_html = new_musica
                musica_changed = True

    except Exception as e:
        print(f"⚠️  YouTube error: {e}")

    # ── Instagram ──
    try:
        ig_followers = instagram_followers(IG_USERNAME)
        if ig_followers is not None:
            print(f"Instagram: {ig_followers:,} seguidores")
            ig_fmt = fmt_number(ig_followers)
            new_html = patch_data_metric(html, "ig_followers", ig_fmt)
            if new_html != html:
                html = new_html
                changed = True
    except Exception as e:
        print(f"⚠️  Instagram error: {e}")

    # ── TikTok ──
    try:
        tk_likes = tiktok_likes(TIKTOK_USERNAME)
        if tk_likes is not None:
            print(f"TikTok: {tk_likes:,} likes")
            tk_fmt = fmt_number(tk_likes)
            new_html = patch_data_metric(html, "tiktok_likes", tk_fmt)
            if new_html != html:
                html = new_html
                changed = True
    except Exception as e:
        print(f"⚠️  TikTok error: {e}")

    if changed:
        with open(HTML_FILE, "w", encoding="utf-8") as f:
            f.write(html)
    if musica_changed:
        with open(MUSICA_FILE, "w", encoding="utf-8") as f:
            f.write(musica_html)

    if changed or musica_changed:
        # Update sitemap lastmod for every page touched
        today = datetime.utcnow().strftime("%Y-%m-%d")
        sitemap_file = "sitemap.xml"
        if os.path.exists(sitemap_file):
            with open(sitemap_file, encoding="utf-8") as f:
                sm = f.read()
            sm_new = re.sub(r'(<loc>https://www\.davizgarziamusic\.com/</loc>\s*<lastmod>)[^<]*(</lastmod>)', rf'\g<1>{today}\2', sm)
            sm_new = re.sub(r'(<loc>https://www\.davizgarziamusic\.com/musica\.html</loc>\s*<lastmod>)[^<]*(</lastmod>)', rf'\g<1>{today}\2', sm_new)
            if sm_new != sm:
                with open(sitemap_file, "w", encoding="utf-8") as f:
                    f.write(sm_new)
        touched = ", ".join(f for f, c in [(HTML_FILE, changed), (MUSICA_FILE, musica_changed)] if c)
        print(f"✅  {touched} + sitemap.xml actualizados — {today}")
    else:
        print("ℹ️  Sin cambios detectados")


if __name__ == "__main__":
    main()
