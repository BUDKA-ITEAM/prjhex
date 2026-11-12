"""Точка входа: сбор страниц, парсинг, сохранение JSON и отчёта о пропусках."""

from __future__ import annotations

import argparse
import json
import logging
import sys
import time
from pathlib import Path

from dle_parser.api import (
    fetch_category_members,
    fetch_infobox_html,
    make_client,
)
from dle_parser.parse import (
    normalize_character as normalize_base,
    parse_infobox as parse_infobox_base,
)
from dle_parser import parse_naruto

log = logging.getLogger("dle_parser")


def load_config(path: Path) -> dict:
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def collect_pages(client, wiki: str, categories: list[str]) -> list[str]:
    """Объединяет страницы из нескольких категорий с дедупликацией."""
    seen: set[str] = set()
    ordered: list[str] = []

    for cat in categories:
        log.info("Категория: %s", cat)
        try:
            titles = fetch_category_members(client, wiki, cat)
        except Exception as e:
            log.warning("Пропускаю категорию %s: %s", cat, e)
            continue

        log.info("  найдено: %d", len(titles))
        for t in titles:
            key = t.strip()
            if key in seen:
                continue
            seen.add(key)
            ordered.append(key)

    return ordered


def parse_all(
    client,
    wiki: str,
    titles: list[str],
    config: dict,
    delay: float,
    out_path: Path,
    limit: int | None,
    skip_existing: bool,
) -> None:
    existing: dict[str, dict] = {}
    if skip_existing and out_path.exists():
        try:
            with out_path.open("r", encoding="utf-8") as f:
                for item in json.load(f):
                    existing[item["id"]] = item
            log.info("Загружено уже спарсенных: %d", len(existing))
        except Exception as e:
            log.warning("Не смог прочитать %s: %s", out_path, e)

    total = len(titles) if limit is None else min(len(titles), limit)
    results: list[dict] = list(existing.values())
    done_ids = set(existing.keys())
    
    new_count = 0
    errors = 0
    skipped: list[dict] = []

    dle_id = config.get("dle_id", "onepiece")
    is_naruto = dle_id == "naruto"

    for i, title in enumerate(titles[:total], 1):
        page_id = title.replace(" ", "_")
        if page_id in done_ids:
            log.debug("[%d/%d] skip %s", i, total, title)
            continue

        log.info("[%d/%d] %s", i, total, title)
        try:
            html = fetch_infobox_html(client, wiki, title)
            
            if is_naruto:
                infobox = parse_naruto.parse_infobox(html)
                record, reason = parse_naruto.normalize_character(title, infobox, config, wiki)
            else:
                infobox = parse_infobox_base(html)
                record, reason = normalize_base(title, infobox, config, wiki)

            if record is None:
                skipped.append({
                    "title": title,
                    "reason": reason or "unknown",
                    "infobox_keys": list(infobox.keys()) if infobox else [],
                })
                log.warning("  ⚠ skip: %s", reason)
            else:
                results.append(record)
                done_ids.add(record["id"])
                new_count += 1
        except Exception as e:
            skipped.append({
                "title": title,
                "reason": f"fetch_error: {e}",
                "infobox_keys": [],
            })
            log.warning("  ✗ %s", e)
            errors += 1

        time.sleep(delay)

    out_path.parent.mkdir(parents=True, exist_ok=True)
    with out_path.open("w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)

    if skipped:
        skipped_path = out_path.with_name(out_path.stem + ".skipped.json")
        with skipped_path.open("w", encoding="utf-8") as f:
            json.dump(skipped, f, ensure_ascii=False, indent=2)
        log.info("Отчёт о пропусках: %s (%d записей)", skipped_path, len(skipped))

    log.info("Готово. Всего в файле: %d (новых: %d), пропусков: %d, ошибок: %d",
             len(results), new_count, len(skipped), errors)


def main() -> int:
    ap = argparse.ArgumentParser(description="Fandom → normalised JSON parser")
    ap.add_argument("--config", type=Path, required=True)
    ap.add_argument("--out", type=Path, default=Path("out/characters.json"))
    ap.add_argument("--delay", type=float, default=1.0)
    ap.add_argument("--limit", type=int, default=None)
    ap.add_argument("--skip-existing", action="store_true")
    ap.add_argument("--verbose", "-v", action="store_true")
    args = ap.parse_args()

    logging.basicConfig(level=logging.DEBUG if args.verbose else logging.INFO,
                        format="%(asctime)s %(levelname)-7s %(message)s", datefmt="%H:%M:%S")

    if not args.config.exists():
        log.error("Конфиг не найден: %s", args.config)
        return 1

    config = load_config(args.config)
    wiki = config["source"]["wiki"]
    categories = config["source"]["categories"]

    log.info("DLE: %s (%s)", config["dle_id"], config["title"])
    log.info("Wiki: %s.fandom.com", wiki)

    with make_client() as client:
        titles = collect_pages(client, wiki, categories)
        if not titles:
            log.error("Пустой список — проверь категории.")
            return 2

        parse_all(client, wiki, titles, config, args.delay, args.out, args.limit, args.skip_existing)

    return 0


if __name__ == "__main__":
    sys.exit(main())