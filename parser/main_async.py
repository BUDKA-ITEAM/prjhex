"""Асинхронная точка входа: параллельный парсинг Fandom."""
from __future__ import annotations
import argparse
import asyncio
import json
import logging
import sys
import time
from pathlib import Path

from dle_parser.api_async import (
    make_async_client,
    fetch_category_members_async,
    fetch_infobox_html_async,
)

from dle_parser.registry import get_parser

log = logging.getLogger("dle_async")


def load_config(path: Path) -> dict:
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


async def collect_pages(client, wiki: str, categories: list[str]) -> list[str]:
    seen: set[str] = set()
    ordered: list[str] = []

    for cat in categories:
        log.info("Категория: %s", cat)
        try:
            titles = await fetch_category_members_async(client, wiki, cat)
        except Exception as e:
            log.warning("Пропускаю категорию %s: %s", cat, e)
            continue
        log.info("  найдено: %d", len(titles))
        for t in titles:
            if t not in seen:
                seen.add(t)
                ordered.append(t)
    return ordered

async def parse_one(
    client,
    semaphore: asyncio.Semaphore,
    wiki: str,
    title: str,
    config: dict,
    parse_infobox,
    normalize_character,
    delay: float,
) -> tuple[dict | None, dict | None]:
    """Парсит одного персонажа. Возвращает (record, skip_info)."""
    async with semaphore:
        try:
            html = await fetch_infobox_html_async(client, wiki, title)
            infobox = parse_infobox(html)
            record, reason = normalize_character(title, infobox, config, wiki)

            if delay > 0:
                await asyncio.sleep(delay)

            if record is None:
                return None, {
                    "title": title,
                    "reason": reason or "unknown",
                    "infobox_keys": list(infobox.keys()) if infobox else [],
                }
            return record, None
        except Exception as e:
            return None, {
                "title": title,
                "reason": f"fetch_error: {e}",
                "infobox_keys": [],
            }


async def parse_all(
    client,
    wiki: str,
    titles: list[str],
    config: dict,
    delay: float,
    concurrency: int,
    out_path: Path,
    limit: int | None,
    skip_existing: bool,
) -> None:
    # Загружаем уже спарсенных
    existing: dict[str, dict] = {}
    if skip_existing and out_path.exists():
        try:
            with out_path.open("r", encoding="utf-8") as f:
                for item in json.load(f):
                    existing[item["id"]] = item
            log.info("Загружено уже спарсенных: %d", len(existing))
        except Exception as e:
            log.warning("Не смог прочитать %s: %s", out_path, e)

    done_ids: set[str] = set()
    for _item in existing.values():
        _rid = _item.get("id") or ""
        if not _rid:
            continue
        done_ids.add(_rid)
        done_ids.add(_rid.replace(" ", "_"))


    todo = [t for t in titles if t.replace(" ", "_") not in done_ids]

    total = len(todo) if limit is None else min(len(todo), limit)
    todo = todo[:total]

    log.info("К обработке: %d (параллельно: %d, delay: %.2f)",
             total, concurrency, delay)

    parse_infobox, normalize_character = get_parser(config.get("dle_id", "onepiece"))

    semaphore = asyncio.Semaphore(concurrency)
    started = time.monotonic()

    results: list[dict] = list(existing.values())
    skipped: list[dict] = []
    processed = 0

    # Запускаем все задачи сразу, Semaphore внутри ограничит параллелизм
    tasks = [
        parse_one(
            client, semaphore, wiki, title, config,
            parse_infobox, normalize_character, delay,
        )
        for title in todo
    ]

    # Обрабатываем по мере готовности (as_completed)
    for coro in asyncio.as_completed(tasks):
        record, skip_info = await coro
        processed += 1

        if record:
            results.append(record)
            done_ids.add(record["id"])
            done_ids.add(record["id"].replace(" ", "_"))
        if skip_info:
            skipped.append(skip_info)
            log.warning("  ⚠ skip: %s — %s", skip_info["title"], skip_info["reason"])

        if processed % 20 == 0 or processed == total:
            elapsed = time.monotonic() - started
            rate = processed / elapsed if elapsed > 0 else 0
            log.info("[%d/%d] %.1f стр/сек, прошло %.0f сек",
                     processed, total, rate, elapsed)

    # Сохраняем
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with out_path.open("w", encoding="utf-8") as f:
        results.sort(key=lambda r: r.get("id", ""))
        json.dump(results, f, ensure_ascii=False, indent=2)

    if skipped:
        skipped.sort(key=lambda s: s.get("title", ""))
        skipped_path = out_path.with_name(out_path.stem + ".skipped.json")
        with skipped_path.open("w", encoding="utf-8") as f:
            json.dump(skipped, f, ensure_ascii=False, indent=2)
        log.info("Отчёт о пропусках: %s (%d записей)", skipped_path, len(skipped))

    elapsed = time.monotonic() - started
    log.info("Готово за %.0f сек. Всего в файле: %d, пропусков: %d",
             elapsed, len(results), len(skipped))


async def async_main(args) -> int:
    config = load_config(args.config)
    wiki = config["source"]["wiki"]
    categories = config["source"]["categories"]

    log.info("DLE: %s (%s)", config["dle_id"], config["title"])
    log.info("Wiki: %s.fandom.com", wiki)

    async with make_async_client() as client:
        titles = await collect_pages(client, wiki, categories)
        log.info("Всего уникальных страниц: %d", len(titles))

        if not titles:
            log.error("Пустой список — проверь категории.")
            return 2

        await parse_all(
            client=client,
            wiki=wiki,
            titles=titles,
            config=config,
            delay=args.delay,
            concurrency=args.concurrency,
            out_path=args.out,
            limit=args.limit,
            skip_existing=args.skip_existing,
        )

    return 0


def main() -> int:
    ap = argparse.ArgumentParser(description="Async Fandom parser")
    ap.add_argument("--config", type=Path, required=True)
    ap.add_argument("--out", type=Path, default=Path("out/characters.json"))
    ap.add_argument("--delay", type=float, default=0.2,
                    help="Пауза после каждого запроса (default: 0.2)")
    ap.add_argument("--concurrency", type=int, default=5,
                    help="Сколько одновременных запросов (default: 5)")
    ap.add_argument("--limit", type=int, default=None)
    ap.add_argument("--skip-existing", action="store_true")
    ap.add_argument("--verbose", "-v", action="store_true")
    args = ap.parse_args()

    logging.basicConfig(
        level=logging.DEBUG if args.verbose else logging.INFO,
        format="%(asctime)s %(levelname)-7s %(message)s",
        datefmt="%H:%M:%S",
    )

    if not args.config.exists():
        log.error("Конфиг не найден: %s", args.config)
        return 1

    return asyncio.run(async_main(args))


if __name__ == "__main__":
    sys.exit(main())