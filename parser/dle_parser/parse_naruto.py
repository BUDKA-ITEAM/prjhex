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

    # 3. СКЛЕИВАЕМ дебют из полей manga и anime
    debut_parts = []
    if "manga" in data:
        debut_parts.append(data["manga"])
    if "anime" in data:
        debut_parts.append(data["anime"])
        
    if debut_parts:
        data["debut"] = ", ".join(debut_parts)

    return data


# ============================================================
# НОРМАЛИЗАТОРЫ
# ============================================================

def _appearance(raw: str | None) -> dict | None:
    if not raw: return None
    raw = _clean(raw)
    # Добавлена поддержка # (например, "Chapter #129")
    chapters = [int(n) for n in re.findall(r"Chapter\s*#?\s*(\d+)", raw)]
    episodes = [int(n) for n in re.findall(r"Episode\s*#?\s*(\d+)", raw)]
    if not chapters and not episodes:
        return None
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


# ============================================================
# ФИЛЬТР КАНОНА (отсеиваем Боруто и фильмы)
# ============================================================

def _is_valid_canon(fields: dict, raw_fields: dict) -> tuple[bool, str]:
    """
    Проверяет, подходит ли персонаж.
    Возвращает (True, "") если подходит, иначе (False, "причина").
    """
    debut = fields.get("debut")
    raw_debut = raw_fields.get("debut", "").lower()

    # 1. Отсеиваем тех, кто появился только в фильмах/играх/OVA (нет глав и серий)
    if not debut:
        if "movie" in raw_debut or "film" in raw_debut:
            return False, "movie_only"
        if "game" in raw_debut or "ova" in raw_debut or "special" in raw_debut:
            return False, "non-canon_only"
        return False, "no_valid_debut"

    # 2. Отсеиваем Боруто (по сырому тексту дебюта)
    if "boruto" in raw_debut:
        return False, "boruto"

    chapter = debut.get("chapter")
    episode = debut.get("episode")

    # 3. Отсеиваем поздние главы (Наруто закончился на 700)
    if chapter and chapter > 699:
        return False, f"late_chapter_{chapter}"

    # 4. Отсеиваем поздние серии (Наруто: Шиппуден закончился на 500)
    if episode and episode > 499:
        return False, f"late_episode_{episode}"

    return True, ""


# ============================================================
# ГЛАВНАЯ
# ============================================================

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

    # ПРИМЕНЯЕМ ФИЛЬТР
    is_valid, reason = _is_valid_canon(fields, raw_fields)
    if not is_valid:
        return None, reason

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