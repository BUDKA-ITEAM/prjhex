"""Парсинг portable-infobox для Girls und Panzer."""

from __future__ import annotations
import re
from bs4 import BeautifulSoup
from .parse import _clean, _clean_name


def parse_infobox(html: str) -> dict[str, str]:
    soup = BeautifulSoup(html, "lxml")
    aside = soup.select_one("aside.portable-infobox")
    if not aside:
        return {}

    # cнос служебных элементоы
    for sel in (
        "sup.reference",
        ".mw-editsection",
        "h2.pi-title small",
        ".cs.vde",
        ".pi-navigation",
    ):
        for el in aside.select(sel):
            el.decompose()

    data: dict[str, str] = {}

    for item in aside.select("[data-source]"):
        # "Affiliation(s)" -> "affiliation"
        source = item["data-source"].lower().strip()
        source = source.replace("(s)", "").strip()  # УДАЛЯЕТ СКОБКИ
        
        if not source:
            continue

        # Извлекаем значение
        value_el = item.select_one(".pi-data-value")
        if value_el is not None:
            links = value_el.select("a")
            if links:
                link_texts = [a.get_text(strip=True) for a in links if a.get_text(strip=True)]
                raw = ", ".join(list(dict.fromkeys(link_texts)))
            else:
                raw = value_el.get_text(" ", strip=True)
        else:
            raw = item.get_text(" ", strip=True)

        raw = _clean(raw)
        if raw and source not in data:
            data[source] = raw

    # Картинка
    img = aside.select_one("figure.pi-image img")
    if img is not None:
        url = img.get("data-src") or img.get("src")
        if url and not url.startswith("data:image"):
            url = re.sub(r"/revision/latest/scale-to-width-down/\d+", "/revision/latest", url)
            data["image_url"] = url

    return data


# ============================================================
# НОРМАЛИЗАТОРЫ
# ============================================================

def _list(raw: str | None) -> list[str]:
    if not raw: return []
    raw = _clean(raw)
    raw = re.sub(r"\([^)]*\)", "", raw)
    parts = re.split(r"[;,\n]| and ", raw)
    out: list[str] = []
    seen: set[str] = set()
    for p in parts:
        p = p.strip().lower()
        if not p or p.isdigit() or len(p) < 2: continue
        if p not in seen:
            seen.add(p)
            out.append(p)
    return out

def _number(raw: str | None) -> int | None:
    if not raw: return None
    m = re.search(r"(\d+(?:\.\d+)?)", raw)
    if m:
        return int(float(m.group(1)))
    return None

def _string(raw: str | None) -> str | None:
    if not raw: return None
    return _clean(raw)

def _normalize_field(col: dict, raw: str | None):
    kind = col["type"]
    if kind == "list": return _list(raw)
    if kind == "number": return _number(raw)
    return _string(raw)


def normalize_character(
    page_title: str,
    infobox: dict[str, str],
    config: dict,
    wiki: str,
) -> tuple[dict | None, str | None]:
    if not infobox:
        return None, "empty_infobox"

    guess_cfg = config["guess"]
    name = (
        infobox.get(guess_cfg["source"])
        or infobox.get(guess_cfg["fallback"])
        or infobox.get("name")
        or infobox.get("romaji name")
        or page_title
    )
    name = _clean_name(name)
    if not name: name = page_title

    fields: dict = {}
    raw_fields: dict = {}
    for col in config["columns"]:
        source = col["source"].lower()
        raw = infobox.get(source)
        raw_fields[col["key"]] = raw
        try:
            fields[col["key"]] = _normalize_field(col, raw)
        except Exception:
            fields[col["key"]] = None

    # Отсеиваем только если вообще нет данных
    if isinstance(fields, dict) and not any(fields.values()):
        return None, "no_data"

    return {
        "id": page_title.replace(" ", "_"),
        "name": name,
        "name_ja": infobox.get("kanji name") or infobox.get("jname"),
        "aliases": [page_title],
        "url": f"https://{wiki}.fandom.com/wiki/{page_title.replace(' ', '_')}",
        "image_url": infobox.get("image_url"),
        "fields": fields,
        "raw": raw_fields,
    }, None