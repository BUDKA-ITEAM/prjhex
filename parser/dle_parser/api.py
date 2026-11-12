"""Все сетевые запросы к Fandom MediaWiki API."""

from __future__ import annotations

import logging

import httpx
from tenacity import retry, stop_after_attempt, wait_exponential

log = logging.getLogger(__name__)

USER_AGENT = (
    "AnimeDleBot/0.1 "
    "(https://github.com/chikichumba; contact@example.com)"
)

BASE_HEADERS = {"User-Agent": USER_AGENT}


def make_client(timeout: float = 30.0) -> httpx.Client:
    return httpx.Client(
        headers=BASE_HEADERS,
        timeout=timeout,
        follow_redirects=True,
    )


@retry(
    stop=stop_after_attempt(4),
    wait=wait_exponential(min=1, max=15),
    reraise=True,
)
def fetch_category_members(
    client: httpx.Client,
    wiki: str,
    category: str,
) -> list[str]:
    """Возвращает список title страниц в указанной категории (с пагинацией)."""
    url = f"https://{wiki}.fandom.com/api.php"
    titles: list[str] = []
    cmcontinue: str | None = None

    while True:
        params = {
            "action": "query",
            "list": "categorymembers",
            "cmtitle": f"Category:{category}",
            "cmlimit": 500,
            "cmtype": "page",
            "cmnamespace": 0,
            "format": "json",
            "formatversion": 2,
        }
        if cmcontinue:
            params["cmcontinue"] = cmcontinue

        r = client.get(url, params=params)
        r.raise_for_status()
        data = r.json()

        if "error" in data:
            raise RuntimeError(f"API error: {data['error']}")

        members = data.get("query", {}).get("categorymembers", [])
        titles.extend(m["title"] for m in members)

        cmcontinue = data.get("continue", {}).get("cmcontinue")
        if not cmcontinue:
            break

    return titles


@retry(
    stop=stop_after_attempt(4),
    wait=wait_exponential(min=1, max=15),
    reraise=True,
)
def fetch_infobox_html(
    client: httpx.Client,
    wiki: str,
    page: str,
) -> str:
    """Возвращает HTML страницы целиком."""
    url = f"https://{wiki}.fandom.com/api.php"
    params = {
        "action": "parse",
        "page": page,
        "format": "json",
        "prop": "text",
        "formatversion": 2,
        "redirects": 1,
    }

    r = client.get(url, params=params)
    r.raise_for_status()
    data = r.json()

    if "error" in data:
        err = data["error"]
        raise RuntimeError(
            f"API error for {page}: {err.get('code')} {err.get('info')}"
        )

    return data["parse"]["text"]

@retry(
    stop=stop_after_attempt(4),
    wait=wait_exponential(min=1, max=15),
    reraise=True,
)
def fetch_wikitext(
    client: httpx.Client,
    wiki: str,
    page: str,
) -> str:
    """Возвращает сырой wikitext страницы."""
    url = f"https://{wiki}.fandom.com/api.php"
    params = {
        "action": "query",
        "prop": "revisions",
        "rvslots": "main",
        "rvprop": "content",
        "titles": page,
        "format": "json",
        "formatversion": 2,
    }
    r = client.get(url, params=params)
    r.raise_for_status()
    data = r.json()
    
    if "error" in data:
        raise RuntimeError(data["error"])

    pages_data = data["query"]["pages"]
    
    if isinstance(pages_data, list):
        page_data = pages_data[0]
    else:
        page_data = next(iter(pages_data.values()))

    if "missing" in page_data:
        print(f"DEBUG: Страница '{page}' не существует (missing).")
        return ""
    
    content = page_data["revisions"][0]["slots"]["main"]["content"]
    print(f"DEBUG: Получено {len(content)} символов для '{page}'.")
    return content