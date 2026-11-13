"""Асинхронные запросы к Fandom API."""
from __future__ import annotations
import logging
import httpx
from tenacity import (
    retry,
    stop_after_attempt,
    wait_exponential,
    retry_if_exception_type,
)

log = logging.getLogger(__name__)

USER_AGENT = "AnimeDleBot/0.1 (https://github.com/chikichumba; contact@example.com)"
BASE_HEADERS = {"User-Agent": USER_AGENT}


def make_async_client(timeout: float = 30.0) -> httpx.AsyncClient:
    return httpx.AsyncClient(
        headers=BASE_HEADERS,
        timeout=timeout,
        follow_redirects=True,
        limits=httpx.Limits(max_connections=20, max_keepalive_connections=10),
    )


@retry(
    stop=stop_after_attempt(4),
    wait=wait_exponential(min=1, max=15),
    retry=retry_if_exception_type((httpx.HTTPError, RuntimeError)),
    reraise=True,
)
async def fetch_category_members_async(
    client: httpx.AsyncClient,
    wiki: str,
    category: str,
) -> list[str]:
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

        r = await client.get(url, params=params)
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
    retry=retry_if_exception_type((httpx.HTTPError, RuntimeError)),
    reraise=True,
)
async def fetch_infobox_html_async(
    client: httpx.AsyncClient,
    wiki: str,
    page: str,
) -> str:
    url = f"https://{wiki}.fandom.com/api.php"
    params = {
        "action": "parse",
        "page": page,
        "format": "json",
        "prop": "text",
        "formatversion": 2,
        "redirects": 1,
    }

    r = await client.get(url, params=params)
    r.raise_for_status()
    data = r.json()

    if "error" in data:
        err = data["error"]
        raise RuntimeError(f"API error for {page}: {err.get('code')} {err.get('info')}")

    return data["parse"]["text"]