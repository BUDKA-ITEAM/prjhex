"""Парсинг portable-infobox и нормализация под конфиг dle (One Piece)."""

from __future__ import annotations
import re
from bs4 import BeautifulSoup

_REF_RE = re.compile(r"\[\s*\d+(?:\s*\]\s*\[\s*\d+)*\s*\]")
_WS_RE = re.compile(r"\s+")


def _clean(s: str) -> str:
    if not s: return ""
    s = _REF_RE.sub(" ", s)
    s = re.sub(r"<[^>]+>", " ", s)
    s = _WS_RE.sub(" ", s)
    return s.strip()


def _clean_name(raw: str) -> str:
    if not raw: return ""
    raw = _clean(raw)
    if " (" in raw: raw = raw.split(" (")[0]
    if ";" in raw: raw = raw.split(";")[0]
    return raw.strip()


# ============================================================
# ПАРСИНГ ИНФОБОКСА И ХАКИ
# ============================================================

def _extract_name_direct(item) -> str:
    direct = "".join(str(t) for t in item.find_all(string=True, recursive=False)).strip()
    return _clean(direct)


def parse_infobox(html: str) -> dict[str, str]:
    soup = BeautifulSoup(html, "lxml")
    aside = soup.select_one("aside.portable-infobox")
    
    data: dict[str, str] = {}

    # 1. Парсим инфобокс (если он есть)
    if aside:
        for sel in ("sup.reference", ".mw-editsection", "h2.pi-title small", ".cs.vde", ".pi-navigation"):
            for el in aside.select(sel):
                el.decompose()

        for item in aside.select("[data-source]"):
            source = item["data-source"]
            if source == "name":
                raw = _extract_name_direct(item)
                if not raw:
                    value_el = item.select_one(".pi-data-value")
                    raw = value_el.get_text(" ", strip=True) if value_el else item.get_text(" ", strip=True)
            else:
                value_el = item.select_one(".pi-data-value")
                raw = value_el.get_text(" ", strip=True) if value_el else item.get_text(" ", strip=True)
            
            raw = _clean(raw)
            if raw:
                data[source] = raw

        img = aside.select_one("figure.pi-image img")
        if img is not None and img.get("src"):
            url = re.sub(r"/revision/latest/scale-to-width-down/\d+", "/revision/latest", img["src"])
            data["image_url"] = url

    # 2. Парсим Хаки из заголовков по всей странице
    haki_types = set()
    for heading in soup.find_all(["h2", "h3", "h4", "h5"]):
        # Сносим "[edit]" из заголовков
        for edit in heading.select(".mw-editsection"):
            edit.decompose()
            
        text = heading.get_text(strip=True)
        # Если в заголовке есть слово Haki, сохраняем его
        if "haki" in text.lower():
            # Убираем лишние скобки и сноски, если остались
            text = re.sub(r"\[\d+\]", "", text).strip()
            if text:
                haki_types.add(text)
                
    if haki_types:
        data["haki"] = ", ".join(haki_types)

    return data


# ============================================================
# НОРМАЛИЗАТОРЫ
# ============================================================

def _appearance(raw: str | None) -> dict | None:
    if not raw: return None
    raw = _clean(raw)
    chapters = [int(n) for n in re.findall(r"Chapter\s+(\d+)", raw)]
    episodes = [int(n) for n in re.findall(r"Episode\s+(\d+)", raw)]
    if not chapters and not episodes: return None
    return {"chapter": min(chapters) if chapters else None, "episode": min(episodes) if episodes else None}


def _occupation_type(raw: str | None) -> str | None:
    """Сводит все занятия к одной базовой категории."""
    if not raw: return None
    raw = raw.lower()
    
    if "pirate" in raw: return "Pirate"
    if "marine" in raw: return "Marine"
    if "revolutionary" in raw: return "Revolutionary"
    if "world noble" in raw or "tenryuubito" in raw: return "World Noble"
    if "cipher pol" in raw or re.search(r"\bcp\d", raw): return "Cipher Pol"
    if "warlord" in raw or "shichibukai" in raw: return "Warlord"
    if "king" in raw or "queen" in raw or "prince" in raw or "princess" in raw: return "Royal"
    if "scientist" in raw: return "Scientist"
    if "doctor" in raw: return "Doctor"
    if "bounty hunter" in raw: return "Bounty Hunter"
    if "bandit" in raw or "thief" in raw: return "Criminal"
    
    # Если ничего не совпало, берем первое слово
    first_word = re.split(r"[;, ]", raw)[0]
    return first_word.capitalize()


def _list(raw: str | None) -> list[str]:
    if not raw: return []
    raw = _clean(raw)
    parts = re.split(r"[;,]", raw)
    out: list[str] = []
    seen: set[str] = set()
    for p in parts:
        is_former = "(former)" in p.lower()
        p = re.sub(r"\([^)]*\)", "", p).strip().lower()
        if not p or p.isdigit() or len(p) < 3: continue
        if is_former: p = f"{p} (former)"
        if p not in seen:
            seen.add(p)
            out.append(p)
    return out


def _region(raw: str | None) -> dict | None:
    if not raw: return None
    raw = _clean(raw)
    m = re.match(r"^(.+?)\s*\((.+)\)\s*$", raw)
    if m:
        return {"region": m.group(1).strip().lower(), "detail": m.group(2).strip().lower()}
    return {"region": raw.strip().lower(), "detail": None}


def _number_last(raw: str | None) -> int | None:
    if not raw: return None
    raw = _clean(raw)
    nums = re.findall(r"\d[\d,]*", raw)
    return int(nums[-1].replace(",", "")) if nums else None


def _number_first(raw: str | None) -> int | None:
    if not raw: return None
    raw = _clean(raw)
    nums = re.findall(r"\d[\d,]*", raw)
    return int(nums[0].replace(",", "")) if nums else None


def _enum(raw: str | None, allowed: list[str]) -> str | None:
    if not raw: return None
    raw = _clean(raw)
    main = raw.split("(")[0].strip()
    for v in allowed:
        if v.lower() == main.lower(): return v
    return None


def _normalize_field(col: dict, raw: str | None):
    kind = col["type"]
    if kind == "appearance": return _appearance(raw)
    if kind == "occupation_type": return _occupation_type(raw)
    if kind == "list": return _list(raw)
    if kind == "region": return _region(raw)
    if kind == "enum": return _enum(raw, col["values"])
    if kind == "number":
        return _number_first(raw) if col["key"] == "bounty" else _number_last(raw)
    raise ValueError(f"Неизвестный type: {kind}")


def _extract_aliases(raw: str | None) -> list[str]:
    if not raw: return []
    raw = _clean(raw)
    text = re.sub(r"\([^)]*\)", ",", raw)
    parts = re.split(r"[,;]", text)
    out: list[str] = []
    seen: set[str] = set()
    for p in parts:
        p = p.strip().strip('"').strip("'")
        if not p or p.isdigit() or len(p) < 2: continue
        if p.lower() in seen: continue
        seen.add(p.lower())
        out.append(p)
    return out


def normalize_character(page_title: str, infobox: dict[str, str], config: dict, wiki: str) -> tuple[dict | None, str | None]:
    if not infobox: return None, "empty_infobox"
    if not infobox.get("first"): return None, "no_debut"

    guess_cfg = config["guess"]
    name_raw = infobox.get(guess_cfg["source"]) or infobox.get(guess_cfg["fallback"]) or page_title
    name = _clean_name(name_raw) or page_title

    fields: dict = {}
    raw_fields: dict = {}
    for col in config["columns"]:
        raw = infobox.get(col["source"])
        raw_fields[col["key"]] = raw
        try:
            fields[col["key"]] = _normalize_field(col, raw)
        except Exception as e:
            return None, f"normalize_error:{e}"

    aliases: list[str] = []
    seen: set[str] = set()

    def _push(val: str | None):
        if not val: return
        val = val.strip()
        if not val or len(val) < 2 or val.isdigit(): return
        if val.lower() in seen: return
        seen.add(val.lower())
        aliases.append(val)

    _push(page_title)
    _push(infobox.get("rname"))
    for a in _extract_aliases(infobox.get("alias")):
        _push(a)

    record = {
        "id": page_title.replace(" ", "_"),
        "name": name,
        "name_ja": infobox.get("jname"),
        "aliases": aliases[:6],
        "url": f"https://{wiki}.fandom.com/wiki/{page_title.replace(' ', '_')}",
        "image_url": infobox.get("image_url"),
        "fields": fields,
        "raw": raw_fields,
    }
    return record, None