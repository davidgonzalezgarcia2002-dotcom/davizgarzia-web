#!/usr/bin/env python3
"""Actualiza las dos tarjetas de YouTube de musica.html con el ultimo video de cada canal.

Usa el feed publico de la lista "Videos" de cada canal (UULF + id del canal sin "UC"), que
solo contiene videos largos y nunca Shorts. Sin clave ni cuota. Escribe entre los marcadores AUTO-YT-*:START/END de musica.html.
Si un canal no responde, deja esa tarjeta como estaba.
Uso: python scripts/update_youtube.py
"""
import html
import re
import sys
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[1]
MUSICA = RAIZ / "musica.html"
CANALES = {
    "OFICIAL": ("UCBT7FcBeCjaj3mYYFHxxyyQ", "Daviz Garzia"),
    "SESIONES": ("UCJ3Tqy80qAzBUY_1vH9Gd2g", "Daviz Garzia Sessions"),
}
NS = {"a": "http://www.w3.org/2005/Atom", "yt": "http://www.youtube.com/xml/schemas/2015"}
MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"]


def ultimos_videos(channel_id, n=1):
    url = f"https://www.youtube.com/feeds/videos.xml?playlist_id=UULF{channel_id[2:]}"
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    datos = urllib.request.urlopen(req, timeout=30).read()
    if re.search(rb"<!(DOCTYPE|ENTITY)", datos, re.I):
        raise ValueError("feed con DTD, se descarta")
    raiz = ET.fromstring(datos)
    videos = []
    for e in raiz.findall("a:entry", NS):
        try:
            vid = e.find("yt:videoId", NS).text
            link = e.find("a:link", NS).get("href", "")
            titulo = e.find("a:title", NS).text or ""
            fecha = datetime.fromisoformat(e.find("a:published", NS).text)
        except (AttributeError, ValueError, TypeError):
            continue
        if not re.fullmatch(r"[A-Za-z0-9_-]{11}", vid or ""):
            continue
        videos.append({
            "id": vid,
            "titulo": titulo,
            "fecha": fecha,
            "short": "/shorts/" in link,
        })
    normales = [v for v in videos if not v["short"]]
    return normales[:n]


def fecha_es(d):
    return f"{d.day} {MESES[d.month - 1]} {d.year}"


def tarjeta(v, autor):
    t = html.escape(re.sub(r"\s*\|\s*Daviz Garzia.*$", "", v["titulo"]).strip(), quote=True)
    url = f"https://www.youtube.com/watch?v={v['id']}"
    return (
        f'<a href="{url}" target="_blank" rel="noopener noreferrer" style="position:relative;border-radius:0;overflow:hidden;aspect-ratio:16/9;flex-shrink:0;display:block">\n'
        f'          <img src="https://i.ytimg.com/vi/{v["id"]}/hqdefault.jpg" alt="{t}" loading="lazy" style="width:100%;height:100%;object-fit:cover;display:block">\n'
        '          <div style="position:absolute;inset:0;background:rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center">\n'
        '            <div style="width:60px;height:60px;background:rgba(255,107,0,.9);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:22px;padding-left:4px;box-shadow:0 6px 24px rgba(255,107,0,.5)">&#9654;</div>\n'
        '          </div>\n'
        '          <div style="position:absolute;bottom:10px;left:12px;right:12px">\n'
        f'            <div style="font-size:12px;font-weight:800;color:#fff;text-shadow:0 1px 4px rgba(0,0,0,.7)">{t}</div>\n'
        f'            <div style="font-size:10px;color:rgba(255,255,255,.7);margin-top:2px">{autor} &middot; {fecha_es(v["fecha"])} &middot; Ver en YouTube &rarr;</div>\n'
        '          </div>\n'
        '        </a>'
    )


def tarjeta_set(v):
    t = html.escape(re.sub(r"\s*\|\s*Daviz Garzia.*$", "", v["titulo"]).strip(), quote=True)
    return (
        f'<a class="set-card" href="https://www.youtube.com/watch?v={v["id"]}" target="_blank" rel="noopener noreferrer">'
        f'<div class="set-thumb"><img src="https://i.ytimg.com/vi/{v["id"]}/hqdefault.jpg" alt="{t}" loading="lazy" width="480" height="360">'
        '<div class="set-play"><i>&#9654;</i></div></div>'
        f'<div class="set-info"><b>{t}</b><span>{fecha_es(v["fecha"])} &middot; Ver en YouTube &rarr;</span></div></a>'
    )


def parchear(texto, marca, contenido):
    ini, fin = f"<!-- AUTO-YT-{marca}:START -->", f"<!-- AUTO-YT-{marca}:END -->"
    a, b = texto.find(ini), texto.find(fin)
    if a == -1 or b == -1 or b < a:
        print(f"Marcadores {marca} no encontrados o desordenados")
        return texto
    return texto[:a + len(ini)] + "\n        " + contenido + "\n        " + texto[b:]


def main():
    texto = MUSICA.read_text(encoding="utf-8")
    original = texto
    for marca, (canal, autor) in CANALES.items():
        try:
            lista = ultimos_videos(canal, 3 if marca == "SESIONES" else 1)
        except Exception as e:
            print(f"{marca}: no se pudo leer el canal ({e}), se deja como estaba")
            continue
        if not lista:
            continue
        v = lista[0]
        print(f"{marca}: {v['titulo']} ({fecha_es(v['fecha'])})")
        texto = parchear(texto, marca, tarjeta(v, autor))
        if marca == "SESIONES":
            texto = parchear(texto, "SETS", "\n      ".join(tarjeta_set(x) for x in lista))
            texto = parchear(texto, "FECHA", f'<span class="yt-stat">Publicada {fecha_es(v["fecha"])}</span>')
    if texto != original:
        MUSICA.write_text(texto, encoding="utf-8")
        print("musica.html actualizado")
    else:
        print("Sin cambios")


if __name__ == "__main__":
    sys.exit(main())
