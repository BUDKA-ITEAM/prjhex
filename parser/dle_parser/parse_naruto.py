"""Парсинг старого табличного инфобокса Наруто и нормализация под конфиг."""

from __future__ import annotations
import re
from bs4 import BeautifulSoup
from .parse import _clean, _clean_name


def parse_infobox(html: str) -> dict[str, str]:
    soup = BeautifulSoup(html, "lxml")
    
    table = soup.select_one("table.infobox")
    if not table:
        return {}

    data: dict[str, str] = {}

    # 1. Достаем картинку, ЖЕСТКО игнорируя все SVG-иконки Fandom
    img_url = None
    for img in table.select("img"):
        src = img.get("data-src") or img.get("src")
        if not src:
            continue
        # Пропускаем data:image, .svg и системные иконки
        if src.startswith("data:image") or ".svg" in src.lower():
            continue
        if "Camera_font" in src or "Browse_Information" in src:
            continue
            
        img_url = src
        break
            
    if img_url:
        img_url = re.sub(r"/revision/latest/scale-to-width-down/\d+", "/revision/latest", img_url)
        data["image_url"] = img_url

    # 2. Проходимся по строкам таблицы
    for row in table.select("tr"):
        th = row.select_one("th")
        td = row.select_one("td")
        if not th or not td:
            continue

        key = th.get_text(" ", strip=True).lower().replace(":", "").strip()
        
        for nested_th in td.select("th"):
            nested_th.decompose()
            
        links = td.select("a")
        if links:
            link_texts = [a.get_text(strip=True) for a in links if a.get_text(strip=True) and not a.get_text(strip=True).isdigit()]
            if link_texts:
                val = ", ".join(list(dict.fromkeys(link_texts)))
                if key and val and key not in data:
                    data[key] = val
                continue
                
        val = _clean(td.get_text(" ", strip=True))
        if key and val and key not in data:
            data[key] = val

    return data


# ============================================================
# НОРМАЛИЗАТОРЫ
# ============================================================

def _list(raw: str | None) -> list[str]:
    if not raw: return []
    raw = _clean(raw)
    raw = re.sub(r"\([^)]*\)", "", raw)
    # Разбиваем по запятым, переносам и союзу "and"
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

    # Безопасная проверка на пустоту
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