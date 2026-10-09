#!/usr/bin/env python3
"""Факт-чек карточек Linux_QA через Message Batches API.

Каждая карточка уходит отдельным запросом: модель читает карточку, открывает
ссылки из её sources (web_fetch) и возвращает JSON с находками. Реальный вывод
из контейнера Ubuntu 24.04 лежит в карточке и считается истиной.

Команды:
  build                      собрать запросы и оценку цены, без сети
  submit [--limit N]         отправить батч (N первых ещё не отправленных)
  submit --only a,b          отправить эти slug (повтор или пилот)
  status                     состояние отправленных батчей
  collect                    забрать результаты, написать отчёт

Состояние в _factcheck/batch/manifest.json, по нему команды продолжают
работу после перезапуска. Ключ в ~/.config/anthropic-batch.key.
"""
from __future__ import annotations

import argparse
import glob
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
WORK = ROOT / "_factcheck" / "batch"
MANIFEST = WORK / "manifest.json"
REQUESTS = WORK / "requests.jsonl"
RESULTS = WORK / "results.jsonl"
REPORT = WORK / "report.md"
KEY_FILE = Path.home() / ".config" / "anthropic-batch.key"

MODEL = "claude-opus-5-5"
MAX_TOKENS = 16000
MAX_FETCHES = 3
MAX_SEARCHES = 2
FETCH_TOKENS = 10000
# Batch API берёт 50% от обычной цены Opus 5.5 ($4 / $20 за 1M).
PRICE_IN, PRICE_OUT = 2.0 / 1e6, 10.0 / 1e6

SYSTEM = """Ты технический редактор учебного сайта по командам Linux для Ubuntu Server 24.04 LTS (noble).
Тебе дают одну карточку в JSON. В ней summary и mistakes (HTML), примеры examples и, возможно, скрипт script. У примера line это команда, d её смысл, parts разбор команды по частям (t кусок строки, d что он значит), setup подготовка окружения, output НАСТОЯЩИЙ вывод, полученный запуском в контейнере ubuntu:24.04 (arm64, root, каталог /lab). Пустой output при run "system" или "danger" нормален, такие примеры не запускались.

Проверь карточку на фактические ошибки:
1. Каждое объяснение опции, символа оболочки и аргумента в parts и sub совпадает с man-страницей версии из Ubuntu 24.04 или с руководством GNU.
2. Утверждения в summary, mistakes и d верны для Ubuntu 24.04 (версии пакетов noble: bash 5.2, coreutils 9.4, systemd 255, util-linux 2.39, OpenSSH 9.6).
3. Описание примера не противоречит его output. Если d или parts обещают то, чего нет в output, это ошибка в тексте, а не в выводе.
4. Ссылки в sources ведут на нужную страницу.

Открывай ссылки из списка источников инструментом web_fetch, не больше трёх, сначала те, что подтверждают самые конкретные утверждения (опции, коды возврата, пути файлов, значения по умолчанию). Для руководства bash открывай короткую страницу html_node из списка, а не bash.html целиком.
Если ссылка не открылась, обязательно найди тот же документ инструментом web_search (не больше двух поисков) и открой копию на официальном сайте. В unreachable_sources оставь только ссылки, для которых и копию найти не удалось.

Ошибкой считается только то, что противоречит источнику, выводу или поведению в Ubuntu 24.04: неверная опция, значение, путь, код возврата, название, неверное объяснение символа, битая или не та ссылка. Стиль, полнота, порядок, упрощения для новичка и отличия других дистрибутивов ошибками не считаются.

Ответь только JSON без пояснений вокруг, по схеме:
{"verdict": "ok" | "issues", "issues": [{"severity": "major" | "minor", "where": "summary | mistakes[i] | examples[i].parts | examples[i].d | script.lines[i] | sources", "claim": "дословная фраза из карточки", "problem": "что не так", "fix": "как исправить", "evidence_url": "ссылка", "evidence_quote": "короткая цитата источника или вывода, до 15 слов"}], "unreachable_sources": ["ссылки, которые не открылись"]}
Если ошибок нет, issues пустой. Не выдумывай находки: нет подтверждения источником или выводом, значит нет находки."""

BASH_ANCHOR = re.compile(r"^https://www\.gnu\.org/software/bash/manual/bash\.html#(.+)$")


def load_cards() -> list[dict]:
    out = []
    for f in sorted(glob.glob(str(ROOT / "content" / "[0-9]*.json"))):
        data = json.loads(Path(f).read_text(encoding="utf-8"))
        for c in data["cards"]:
            out.append({"custom_id": c["slug"], "category": data["category"], "card": c})
    return out


def source_list(sources: list[str]) -> list[str]:
    """Добавляет к якорю bash.html короткую страницу html_node того же раздела.

    web_fetch открывает только адреса, которые есть в разговоре, а bash.html
    целиком не влезает в лимит токенов на страницу.
    """
    out = []
    for u in sources:
        out.append(u)
        m = BASH_ANCHOR.match(u)
        # Якорь index-X это строка указателя внутри чужого раздела, своей страницы у него нет.
        if m and not m.group(1).startswith("index-"):
            out.append(f"https://www.gnu.org/software/bash/manual/html_node/{m.group(1)}.html")
    return out


def build_params(item: dict) -> dict:
    card = item["card"]
    sources = "\n".join(f"- {u}" for u in source_list(card.get("sources", []))) or "- (нет)"
    user = (f"Раздел: {item['category']}\n\nКарточка (JSON):\n"
            f"{json.dumps(card, ensure_ascii=False)}\n\nИсточники:\n{sources}")
    # custom_id в Batch API ограничен шаблоном ^[a-zA-Z0-9_-]{1,64}$, slug ему подходит.
    return {
        "model": MODEL,
        "max_tokens": MAX_TOKENS,
        "output_config": {"effort": "medium"},
        "system": [{"type": "text", "text": SYSTEM, "cache_control": {"type": "ephemeral"}}],
        "tools": [{"type": "web_fetch_20260209", "name": "web_fetch",
                   "max_uses": MAX_FETCHES, "max_content_tokens": FETCH_TOKENS},
                  {"type": "web_search_20260209", "name": "web_search", "max_uses": MAX_SEARCHES}],
        "messages": [{"role": "user", "content": user}],
    }


def load_manifest() -> dict:
    if MANIFEST.exists():
        return json.loads(MANIFEST.read_text(encoding="utf-8"))
    return {"batches": [], "submitted": []}


def save_manifest(m: dict) -> None:
    MANIFEST.write_text(json.dumps(m, ensure_ascii=False, indent=2), encoding="utf-8")


def cmd_build(_: argparse.Namespace) -> None:
    WORK.mkdir(parents=True, exist_ok=True)
    items = load_cards()
    bad = [i["custom_id"] for i in items if not re.fullmatch(r"[a-zA-Z0-9_-]{1,64}", i["custom_id"])]
    if bad:
        sys.exit(f"slug не подходит для custom_id: {bad}")
    with REQUESTS.open("w", encoding="utf-8") as fh:
        for it in items:
            fh.write(json.dumps({"custom_id": it["custom_id"], "params": build_params(it)},
                                ensure_ascii=False) + "\n")
    # Грубая оценка: JSON с русским текстом около 2.5 символа на токен.
    prompt_tok = sum(len(SYSTEM) + len(json.dumps(i["card"], ensure_ascii=False)) + 300
                     for i in items) / 2.5
    fetch_tok = len(items) * MAX_FETCHES * FETCH_TOKENS
    out_tok = len(items) * 3000
    low = (prompt_tok + fetch_tok * 0.5) * PRICE_IN + out_tok * 0.7 * PRICE_OUT
    high = (prompt_tok + fetch_tok) * PRICE_IN * 1.5 + out_tok * 1.5 * PRICE_OUT
    print(f"Запросов: {len(items)}, файл {REQUESTS.relative_to(ROOT)}")
    print(f"Оценка цены всего корпуса: ${low:.0f}-{high:.0f} (точная после пилота)")


def client():
    try:
        import anthropic
    except ImportError:
        sys.exit("Нет пакета anthropic: python3 -m pip install anthropic")
    # Ключ лежит в отдельном файле, а не в ~/.zshrc: переменная ANTHROPIC_API_KEY
    # в оболочке переключила бы Claude Code с подписки на оплату по API.
    if not KEY_FILE.exists():
        sys.exit(f"Нет файла с ключом {KEY_FILE}")
    return anthropic.Anthropic(api_key=KEY_FILE.read_text().strip())


def cmd_submit(a: argparse.Namespace) -> None:
    m = load_manifest()
    done = set(m["submitted"])
    rows = [json.loads(l) for l in REQUESTS.read_text(encoding="utf-8").splitlines()]
    if a.only:
        ids = set(a.only.split(","))
        todo = [r for r in rows if r["custom_id"] in ids]
        missing = ids - {r["custom_id"] for r in todo}
        if missing:
            sys.exit(f"Нет таких slug: {sorted(missing)}")
    else:
        todo = [r for r in rows if r["custom_id"] not in done][: a.limit or None]
    if not todo:
        print("Все запросы уже отправлены.")
        return
    batch = client().messages.batches.create(requests=todo)
    m["batches"].append({"id": batch.id, "count": len(todo)})
    m["submitted"] += [r["custom_id"] for r in todo if r["custom_id"] not in done]
    save_manifest(m)
    print(f"Отправлен батч {batch.id}: {len(todo)} запросов")


def cmd_status(_: argparse.Namespace) -> None:
    c = client()
    for b in load_manifest()["batches"]:
        r = c.messages.batches.retrieve(b["id"])
        n = r.request_counts
        print(f"{b['id']}: {r.processing_status}, ok {n.succeeded}, ошибок {n.errored}, "
              f"в работе {n.processing}, истекло {n.expired}")


def parse_json(text: str) -> dict | None:
    m = re.search(r"\{.*\}", text, re.S)
    if not m:
        return None
    try:
        return json.loads(m.group(0))
    except json.JSONDecodeError:
        return None


def tool_counts(msg) -> dict:
    """Сколько страниц модель открыла и сколько раз искала."""
    n = {"fetch": 0, "fetch_err": 0, "search": 0}
    for x in msg.content:
        if x.type == "web_fetch_tool_result":
            ok = getattr(x.content, "type", "") == "web_fetch_result"
            n["fetch" if ok else "fetch_err"] += 1
        if x.type == "web_search_tool_result":
            n["search"] += 1
    return n


def cmd_collect(_: argparse.Namespace) -> None:
    c = client()
    have = {}
    if RESULTS.exists():
        for l in RESULTS.read_text(encoding="utf-8").splitlines():
            r = json.loads(l)
            have[r["custom_id"]] = r
    for b in load_manifest()["batches"]:
        if c.messages.batches.retrieve(b["id"]).processing_status != "ended":
            print(f"{b['id']} ещё в работе, пропускаю")
            continue
        for res in c.messages.batches.results(b["id"]):
            row = {"custom_id": res.custom_id, "type": res.result.type}
            if res.result.type == "succeeded":
                msg = res.result.message
                text = "".join(x.text for x in msg.content if x.type == "text")
                row.update(stop=msg.stop_reason, usage=msg.usage.model_dump(),
                           tools=tool_counts(msg), parsed=parse_json(text), raw=text[-4000:])
            elif res.result.type == "errored":
                row["error"] = str(res.result.error)[:500]
            have[res.custom_id] = row
    RESULTS.write_text("".join(json.dumps(r, ensure_ascii=False) + "\n"
                               for r in sorted(have.values(), key=lambda r: r["custom_id"])),
                       encoding="utf-8")
    write_report(list(have.values()))


def cost_of(rows: list[dict]) -> float:
    def tok(key: str) -> int:
        return sum((r.get("usage") or {}).get(key) or 0 for r in rows)
    searches = sum(((r.get("usage") or {}).get("server_tool_use") or {}).get("web_search_requests") or 0
                   for r in rows)
    # Запись в кэш стоит 1.25 цены входа, чтение из кэша 0.1, поиск $10 за 1000.
    return ((tok("input_tokens") + 1.25 * tok("cache_creation_input_tokens")
             + 0.1 * tok("cache_read_input_tokens")) * PRICE_IN
            + tok("output_tokens") * PRICE_OUT + searches * 0.01)


def write_report(rows: list[dict]) -> None:
    cards = {i["custom_id"]: i["card"] for i in load_cards()}
    cost = cost_of(rows)
    fetch = sum((r.get("tools") or {}).get("fetch", 0) for r in rows)
    ferr = sum((r.get("tools") or {}).get("fetch_err", 0) for r in rows)
    srch = sum((r.get("tools") or {}).get("search", 0) for r in rows)
    lines = ["# Факт-чек Linux_QA через Batch API\n",
             f"Обработано {len(rows)} из {len(cards)}. Страниц открыто {fetch}, не открылось {ferr}, "
             f"поисков {srch}. Цена около ${cost:.2f}.\n"]
    bad = [r for r in rows if r["type"] != "succeeded" or not r.get("parsed")
           or r.get("stop") not in ("end_turn", None)]
    for r in sorted(rows, key=lambda r: r["custom_id"]):
        p = r.get("parsed") or {}
        issues = p.get("issues") or []
        if not issues:
            continue
        lines.append(f"\n## {r['custom_id']}. {cards.get(r['custom_id'], {}).get('text', '')}\n")
        for i in issues:
            lines.append(f"- **{i.get('severity')}**, {i.get('where')}. «{i.get('claim')}». "
                         f"{i.get('problem')} Исправить, {i.get('fix')} Источник, "
                         f"{i.get('evidence_url')} («{i.get('evidence_quote')}»)")
    unreach = sorted({u for r in rows for u in ((r.get("parsed") or {}).get("unreachable_sources") or [])})
    if unreach:
        lines.append("\n## Не открылись\n")
        lines += [f"- {u}" for u in unreach]
    if bad:
        lines.append("\n## Не разобрано\n")
        lines += [f"- {r['custom_id']}: {r['type']}, stop {r.get('stop')} {r.get('error', '')}"
                  for r in bad]
    REPORT.write_text("\n".join(lines) + "\n", encoding="utf-8")
    n_issue = sum(1 for r in rows if (r.get("parsed") or {}).get("issues"))
    print(f"Отчёт {REPORT.relative_to(ROOT)}: карточек с находками {n_issue}, "
          f"не разобрано {len(bad)}, цена около ${cost:.2f} (${cost / max(len(rows), 1):.3f} за карточку)")


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)
    sub.add_parser("build").set_defaults(fn=cmd_build)
    s = sub.add_parser("submit")
    s.add_argument("--limit", type=int, default=0)
    s.add_argument("--only", help="отправить эти slug через запятую")
    s.set_defaults(fn=cmd_submit)
    sub.add_parser("status").set_defaults(fn=cmd_status)
    sub.add_parser("collect").set_defaults(fn=cmd_collect)
    a = ap.parse_args()
    a.fn(a)


if __name__ == "__main__":
    main()
