"""Парсинг portable-infobox для Fairy Tail."""

from __future__ import annotations
import re
from bs4 import BeautifulSoup
from .parse import _clean, _clean_name


def parse_infobox(html: str) -> dict[str, str]:
    soup = BeautifulSoup(html, "lxml")
    aside = soup.select_one("aside.portable-infobox")
    if not aside:
        return {}

    # Сносим служебные элементы
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
        source = item["data-source"].lower().strip()
        if not source:
            continue

        # Извлекаем значение
        value_el = item.select_one(".pi-data-value")
        if value_el is not None:
            # Для списков (магия, аффилиации) собираем текст из ссылок
            links = value_el.select("a")
            if links:
                link_texts = [a.get_text(strip=True) for a in links if a.get_text(strip=True)]
                raw = ", ".join(list(dict.fromkeys(link_texts)))
            else:
                raw = value_el.get_text(" ", strip=True)
        else:
            raw = item.get_text(" ", strip=True)

        raw = _clean(raw)
        
        # Очистка пола от значков ♂/♀
        if source == "gender":
            raw = re.sub(r"[^\w\s]", "", raw).strip()

        if raw and source not in data:
            data[source] = raw

    # Склеиваем дебют (в викитексте они разделены)
    debut_parts = []
    if "manga debut" in data:
        debut_parts.append(data["manga debut"])
    if "anime debut" in data:
        debut_parts.append(data["anime debut"])
    
    if debut_parts:
        data["debut"] = ", ".join(debut_parts)

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

def _appearance(raw: str | None) -> dict | None:
    if not raw: return None
    raw = _clean(raw)
    chapters = [int(n) for n in re.findall(r"Chapter\s*#?\s*(\d+)", raw)]
    episodes = [int(n) for n in re.findall(r"Episode\s*#?\s*(\d+)", raw)]
    if not chapters and not episodes: return None
    return {
        "chapter": min(chapters) if chapters else None,
        "episode": min(episodes) if episodes else None,
    }

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

def _enum(raw: str | None, allowed: list[str]) -> str | None:
    if not raw: return None
    raw = _clean(raw).split("(")[0].strip()
    for v in allowed:
        if v.lower() == raw.lower(): return v
    return raw if raw in allowed else None

def _string(raw: str | None) -> str | None:
    if not raw: return None
    return _clean(raw)

def _normalize_field(col: dict, raw: str | None):
    kind = col["type"]
    if kind == "list": return _list(raw)
    if kind == "enum": return _enum(raw, col["values"])
    if kind == "appearance": return _appearance(raw)
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

    if isinstance(fields, dict) and not any(fields.values()):
        return None, "no_data"

    aliases = []
    if page_title: aliases.append(page_title)
    if infobox.get("rname"): aliases.append(infobox.get("rname"))
    
    seen = set()
    final_aliases = []
    for a in aliases:
        if a and a.lower() not in seen:
            seen.add(a.lower())
            final_aliases.append(a)

    record = {
        "id": page_title.replace(" ", "_"),
        "name": name,
        "name_ja": infobox.get("jname") or infobox.get("kanji"),
        "aliases": final_aliases[:6],
        "url": f"https://{wiki}.fandom.com/wiki/{page_title.replace(' ', '_')}",
        "image_url": infobox.get("image_url"),
        "fields": fields,
        "raw": raw_fields,
    }
    return record, None