#!/usr/bin/env python3
"""
Превращает out/characters.json в оптимизированные файлы для GitHub Pages.

Что делает:
  - characters-full.json   — полные данные без raw и url
  - characters-index.json  — компактный индекс для автокомплита
  - daily.json             — расписание ответов на N дней вперёд
  - version.json           — хеш для инвалидации кэша

Перезапуск безопасен:
  - characters-full и characters-index перезаписываются целиком;
  - daily.json ДОПОЛНЯЕТСЯ новыми датами, старые не трогаются;
  - персонажи, которых больше нет в базе, удаляются из расписания.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import random
import sys
from datetime import date, timedelta
from pathlib import Path

DEFAULT_SEED = "anime-dle-onepiece-v1"
DEFAULT_DAYS = 1825  # ~5 лет расписания


# -----------------------------------------------------------
# Утилиты
# -----------------------------------------------------------

def load_json(path: Path) -> any:
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def dump_json(path: Path, data: any) -> None:
    """Компактный JSON без отступов — меньше весит."""
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, separators=(",", ":"))


# -----------------------------------------------------------
# Трансформации
# -----------------------------------------------------------

def strip_prod_fields(characters: list[dict]) -> list[dict]:
    """Убирает из каждой записи поля, ненужные в проде."""
    result = []
    for c in characters:
        clean = {k: v for k, v in c.items() if k not in ("raw", "url")}
        result.append(clean)
    return result


def build_index(characters: list[dict]) -> list[dict]:
    """Компактный индекс для автокомплита: id, name, aliases."""
    return [
        {
            "id": c["id"],
            "name": c["name"],
            "aliases": c.get("aliases", []),
        }
        for c in characters
    ]


def build_daily(
    characters: list[dict],
    seed: str,
    days: int,
    schedule_path: Path,
    today: date,
) -> dict[str, str]:
    """
    Дополняет расписание новыми датами до today + days.
    Не перегенерирует уже назначенные даты.
    Удаляет записи, если персонажа больше нет в базе.
    """
    existing: dict[str, str] = {}
    if schedule_path.exists():
        try:
            existing = load_json(schedule_path)
        except Exception as e:
            print(f"! не смог прочитать {schedule_path}: {e}", file=sys.stderr)

    current_ids = {c["id"] for c in characters}

    # 1) выкидываем "мёртвые" записи (персонаж удалён из базы)
    existing = {d: cid for d, cid in existing.items() if cid in current_ids}

    # 2) персонажи, которые уже были в расписании, не участвуют повторно
    used_ids = set(existing.values())
    available = [cid for cid in current_ids if cid not in used_ids]

    # 3) стабильно перемешиваем
    rng = random.Random(seed)
    rng.shuffle(available)

    # 4) с какой даты продолжать
    if existing:
        last = max(date.fromisoformat(d) for d in existing)
        start = last + timedelta(days=1)
    else:
        start = today

    end = today + timedelta(days=days)

    i = 0
    d = start
    while d <= end and i < len(available):
        existing[d.isoformat()] = available[i]
        i += 1
        d += timedelta(days=1)

    if i < len(available):
        print(
            f"! расписание кончилось раньше срока: осталось {len(available) - i} "
            f"персонажей без даты. Увеличь --days.",
            file=sys.stderr,
        )

    return dict(sorted(existing.items()))


def build_version(full_path: Path, character_count: int) -> dict:
    h = hashlib.sha256()
    with full_path.open("rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return {
        "version": h.hexdigest()[:12],
        "characters": character_count,
    }


# -----------------------------------------------------------
# Точка входа
# -----------------------------------------------------------

def main() -> int:
    ap = argparse.ArgumentParser(description="Сборка JSON-ов для GH Pages")
    ap.add_argument(
        "--input", type=Path, default=Path("out/characters.json"),
        help="Вывод main.py (characters.json)",
    )
    ap.add_argument(
        "--out-dir", type=Path, default=Path("data"),
        help="Куда писать готовые файлы",
    )
    ap.add_argument(
        "--seed", default=DEFAULT_SEED,
        help="Стабильный seed для перемешивания",
    )
    ap.add_argument(
        "--days", type=int, default=DEFAULT_DAYS,
        help="На сколько дней вперёд сгенерировать расписание",
    )
    ap.add_argument(
        "--today", type=str, default=None,
        help="Дата 'сегодня' (YYYY-MM-DD), для тестов",
    )
    args = ap.parse_args()

    if not args.input.exists():
        print(f"Файл не найден: {args.input}", file=sys.stderr)
        return 1

    characters = load_json(args.input)
    print(f"Загружено персонажей: {len(characters)}")

    if not characters:
        print("Пустой список — нечего собирать.", file=sys.stderr)
        return 2

    today = date.fromisoformat(args.today) if args.today else date.today()
    print(f"Дата 'сегодня': {today}")

    args.out_dir.mkdir(parents=True, exist_ok=True)

    # 1) characters-full.json
    full = strip_prod_fields(characters)
    full_path = args.out_dir / "characters-full.json"
    dump_json(full_path, full)
    print(f"→ {full_path}  ({full_path.stat().st_size // 1024} КБ)")

    # 2) characters-index.json
    index = build_index(characters)
    index_path = args.out_dir / "characters-index.json"
    dump_json(index_path, index)
    print(f"→ {index_path}  ({index_path.stat().st_size // 1024} КБ)")

    # 3) daily.json
    schedule_path = args.out_dir / "daily.json"
    daily = build_daily(characters, args.seed, args.days, schedule_path, today)
    dump_json(schedule_path, daily)
    print(f"→ {schedule_path}  ({len(daily)} дней, {schedule_path.stat().st_size // 1024} КБ)")

    # 4) version.json
    version_path = args.out_dir / "version.json"
    dump_json(version_path, build_version(full_path, len(characters)))
    print(f"→ {version_path}")

    return 0


if __name__ == "__main__":
    sys.exit(main())