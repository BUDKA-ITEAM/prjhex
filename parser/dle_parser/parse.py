"""Парсинг portable-infobox и нормализация под конфиг dle."""

from __future__ import annotations

import re

from bs4 import BeautifulSoup


# Сноски Fandom: "[ 1 ]", "[12]", "[ 3 ][ 4 ]" и т.п.
_REF_RE = re.compile(r"\[\s*\d+(?:\s*\]\s*\[\s*\d+)*\s*\]")
_WS_RE = re.compile(r"\s+")


def _clean(s: str) -> str:
    """Убирает сноски, HTML-остатки и лишние пробелы."""
    if not s:
        return ""
    s = _REF_RE.sub(" ", s)
    s = re.sub(r"<[^>]+>", " ", s)
    s = _WS_RE.sub(" ", s)
    return s.strip()


def _clean_name(raw: str) -> str:
    """Обрезает VIZ/FUNimation подписи в title."""
    if not raw:
        return ""
    raw = _clean(raw)
    if " (" in raw:
        raw = raw.split(" (")[0]
    if ";" in raw:
        raw = raw.split(";")[0]
    return raw.strip()


# ============================================================
# ПАРСИНГ ИНФОБОКСА
# ============================================================

def _extract_name_direct(item) -> str:
    """
    Для h2.pi-title (data-source="name") берём только прямые
    текстовые узлы, чтобы не зацепить <small> с подписями VIZ/FUNimation.
    """
    direct = "".join(
        str(t) for t in item.find_all(string=True, recursive=False)
    ).strip()
    return _clean(direct)


def parse_infobox(html: str) -> dict[str, str]:
    soup = BeautifulSoup(html, "lxml")
    aside = soup.select_one("aside.portable-infobox")
    if not aside:
        return {}

    # сносим служебные элементы ДО извлечения текста
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
        source = item["data-source"]

        if source == "name":
            raw = _extract_name_direct(item)
            if not raw:
                value_el = item.select_one(".pi-data-value")
                if value_el is not None:
                    raw = value_el.get_text(" ", strip=True)
                else:
                    raw = item.get_text(" ", strip=True)
                raw = _clean(raw)
        else:
            value_el = item.select_one(".pi-data-value")
            if value_el is not None:
                raw = value_el.get_text(" ", strip=True)
            else:
                raw = item.get_text(" ", strip=True)
            raw = _clean(raw)

        if raw:
            data[source] = raw

    img = aside.select_one("figure.pi-image img")
    if img is not None and img.get("src"):
        url = img["src"]
        url = re.sub(
            r"/revision/latest/scale-to-width-down/\d+",
            "/revision/latest",
            url,
        )
        data["image_url"] = url

    return data


# ============================================================
# НОРМАЛИЗАТОРЫ
# ============================================================

def _appearance(raw: str | None) -> dict | None:
    if not raw:
        return None
    raw = _clean(raw)
    chapters = [int(n) for n in re.findall(r"Chapter\s+(\d+)", raw)]
    episodes = [int(n) for n in re.findall(r"Episode\s+(\d+)", raw)]
    if not chapters and not episodes:
        return None
    return {"chapter": min(chapters) if chapters else None,
            "episode": min(episodes) if episodes else None}


def _list(raw: str | None) -> list[str]:
    """
    Список значений. Бывшие элементы сохраняются с пометкой "(former)"
    и идут ПОСЛЕ текущих — чтобы в игре первым показывалось актуальное.

    Пример:
      "Fake Straw Hat Crew (Former); His own crew"
      → ["his own crew", "fake straw hat crew (former)"]
    """
    if not raw:
        return []
    raw = _clean(raw)
    parts = re.split(r"[;,]", raw)

    current: list[str] = []
    former: list[str] = []
    seen: set[str] = set()

    for p in parts:
        is_former = "(former)" in p.lower()
        # убираем ВСЕ скобки с содержимым: "(Billions)", "(former)", и т.п.
        p = re.sub(r"\([^)]*\)", "", p).strip().lower()
        if not p or p.isdigit() or len(p) < 3:
            continue
        if p in seen:
            continue
        seen.add(p)
        if is_former:
            former.append(f"{p} (former)")
        else:
            current.append(p)

    return current + former


def _region(raw: str | None) -> dict | None:
    if not raw:
        return None
    raw = _clean(raw)
    m = re.match(r"^(.+?)\s*\((.+)\)\s*$", raw)
    if m:
        return {
            "region": m.group(1).strip().lower(),
            "detail": m.group(2).strip().lower(),
        }
    return {"region": raw.strip().lower(), "detail": None}


def _number_last(raw: str | None) -> int | None:
    """Последнее число (актуальное значение для age)."""
    if not raw:
        return None
    raw = _clean(raw)
    nums = re.findall(r"\d[\d,]*", raw)
    if not nums:
        return None
    return int(nums[-1].replace(",", ""))


def _number_first(raw: str | None) -> int | None:
    """Первое число (актуальное значение для bounty)."""
    if not raw:
        return None
    raw = _clean(raw)
    nums = re.findall(r"\d[\d,]*", raw)
    if not nums:
        return None
    return int(nums[0].replace(",", ""))


def _enum(raw: str | None, allowed: list[str]) -> str | None:
    if not raw:
        return None
    raw = _clean(raw)
    main = raw.split("(")[0].strip()
    for v in allowed:
        if v.lower() == main.lower():
            return v
    return None


def _normalize_field(col: dict, raw: str | None):
    kind = col["type"]
    if kind == "appearance":
        return _appearance(raw)
    if kind == "list":
        return _list(raw)
    if kind == "region":
        return _region(raw)
    if kind == "enum":
        return _enum(raw, col["values"])
    if kind == "number":
        if col["key"] == "bounty":
            return _number_first(raw)
        return _number_last(raw)
    raise ValueError(f"Неизвестный type: {kind}")


def _extract_aliases(raw: str | None) -> list[str]:
    if not raw:
        return []
    raw = _clean(raw)
    text = re.sub(r"\([^)]*\)", ",", raw)
    parts = re.split(r"[,;]", text)
    out: list[str] = []
    seen: set[str] = set()
    for p in parts:
        p = p.strip().strip('"').strip("'")
        if not p or p.isdigit() or len(p) < 2:
            continue
        if p.lower() in seen:
            continue
        seen.add(p.lower())
        out.append(p)
    return out


# ============================================================
# ГЛАВНАЯ
# ============================================================

def normalize_character(
    page_title: str,
    infobox: dict[str, str],
    config: dict,
    wiki: str,
) -> tuple[dict | None, str | None]:
    """
    Возвращает (record, reason).
    reason = None при успехе, иначе строка с причиной пропуска:
      "empty_infobox"        — на странице нет portable-infobox
      "no_debut"             — нет поля first (Chapter/Episode) → не персонаж
      "normalize_error:..."  — исключение в нормализаторе

    Недостающие поля не отсеивают персонажа — они остаются
    None (скаляры) или [] (списки).
    """
    # 1) нет инфобокса — это не страница персонажа
    if not infobox:
        return None, "empty_infobox"

    guess_cfg = config["guess"]
    name_raw = (
        infobox.get(guess_cfg["source"])
        or infobox.get(guess_cfg["fallback"])
        or page_title
    )
    name = _clean_name(name_raw)
    if not name:
        name = page_title

    # 2) нормализация полей — недостающие становятся None / []
    fields: dict = {}
    raw_fields: dict = {}
    for col in config["columns"]:
        raw = infobox.get(col["source"])
        raw_fields[col["key"]] = raw
        try:
            fields[col["key"]] = _normalize_field(col, raw)
        except Exception as e:
            return None, f"normalize_error:{e}"

    # 2.5) нет дебюта — это не персонаж (локации/группы/события)
    if not infobox.get("first"):
        return None, "no_debut"

    # 3) aliases
    aliases: list[str] = []
    seen: set[str] = set()

    def _push(val: str | None):
        if not val:
            return
        val = val.strip()
        if not val or len(val) < 2 or val.isdigit():
            return
        if val.lower() in seen:
            return
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