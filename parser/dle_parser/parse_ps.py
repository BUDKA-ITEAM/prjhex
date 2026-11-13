"""Парсер для вики Школы тюрьмы (Prison School, Portable Infobox)."""
from __future__ import annotations

import re
from bs4 import BeautifulSoup


def parse_infobox(html: str) -> dict:
    """Извлекает сырые данные из Fandom Portable Infobox (<aside class="portable-infobox ...">)."""
    if not html:
        return {}

    soup = BeautifulSoup(html, "html.parser")
    infobox = soup.find("aside", class_=lambda c: c and "portable-infobox" in c)
    if not infobox:
        return {}

    data: dict = {}

    # Заголовок
    title_tag = infobox.find("h2", class_="pi-title")
    if title_tag:
        data["name"] = title_tag.get_text(strip=True)

    # Картинка
    img_tag = infobox.find("img")
    if img_tag:
        img_url = img_tag.get("data-src") or img_tag.get("src")
        if img_url and img_url.startswith("//"):
            img_url = "https:" + img_url
        data["image_url"] = img_url

    # Строки данных
    for item in infobox.find_all("div", class_="pi-item"):
        label_tag = item.find("h3", class_="pi-data-label")
        value_tag = item.find("div", class_="pi-data-value")
        if not (label_tag and value_tag):
            continue

        label = label_tag.get_text(strip=True).lower()

        if label in data:
            continue

        for br in value_tag.find_all("br"):
            br.replace_with(", ")
        for sup in value_tag.find_all("sup"):
            sup.decompose()

        val_text = value_tag.get_text(" ", strip=True)
        val_text = re.sub(r"\s+", " ", val_text).strip()
        if val_text:
            data[label] = val_text

    return data


def _split_list(value: str | None) -> list[str]:
    """Разбивает строку на список по запятым/точкам с запятой."""
    if not value:
        return []
    parts = re.split(r"[,;]\s*", value)
    return [p.strip() for p in parts if p.strip()]


def normalize_character(
    title: str,
    infobox: dict,
    config: dict,
    wiki: str,
) -> tuple[dict | None, str | None]:
    """Превращает сырые данные в нормализованную запись."""
    if not infobox:
        return None, "empty_infobox"

    name = infobox.get("name") or title
    name_ja = infobox.get("kanji")
    romaji = infobox.get("romaji")

    gender = infobox.get("gender")
    hair_color = infobox.get("hair color")
    school_raw = infobox.get("school")
    occupation_raw = infobox.get("occupation")

    # Если ни одно из значимых полей не заполнено — пропускаем
    if not any([gender, hair_color, school_raw, occupation_raw]):
        return None, "no_data"

    page_id = title.replace(" ", "_")
    url = f"https://{wiki}.fandom.com/wiki/{page_id}"

    record = {
        "id": page_id,
        "name": name,
        "name_ja": name_ja,
        "romaji": romaji,
        "aliases": [name],
        "url": url,
        "image_url": infobox.get("image_url"),
        "fields": {
            "gender": gender,
            "hair_color": hair_color,
            "school": _split_list(school_raw),
            "occupation": _split_list(occupation_raw),
        },
        "raw": {
            "gender": gender,
            "hair color": hair_color,
            "school": school_raw,
            "occupation": occupation_raw,
        },
    }

    return record, None