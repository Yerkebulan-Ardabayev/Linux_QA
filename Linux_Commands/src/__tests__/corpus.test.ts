/**
 * Проверки собранного корпуса карточек.
 *
 * Корпус собирает scripts/build-corpus.mjs из content/NN-*.json и уже там
 * отказывается собирать плохие данные. Здесь те же главные правила проверены
 * второй раз, на том файле, который реально раздаёт сайт, и через тот же код
 * (segmentLine), которым интерфейс рисует строку. Разойдутся сборщик и
 * интерфейс, упадёт этот тест.
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { type Card, type Part, parseCorpus, segmentLine } from '@/lib/linux-data';
import { KINDS } from '@/lib/kinds';

const ROOT = path.resolve(__dirname, '../..');
const CORPUS = path.join(ROOT, 'public/Linux_Commands.html');
const CORPUS_COPY = path.resolve(ROOT, '../Linux_Commands.html');

const html = fs.readFileSync(CORPUS, 'utf8');
const data = parseCorpus(html);

/** Все строки с разбором: примеры и непустые строки скриптов. */
function allLines(c: Card): { where: string; line: string; parts: Part[] | undefined }[] {
  const out = c.examples.map((e, i) => ({ where: `${c.slug} пример ${i + 1}`, line: e.line, parts: e.parts }));
  c.script?.lines.forEach((l, i) => {
    if (l.line.trim()) out.push({ where: `${c.slug} строка ${i + 1}`, line: l.line.trimStart(), parts: l.parts });
  });
  return out;
}

/** Ошибка покрытия или null: части дают строку целиком, между ними только пробелы. */
function coverProblem(line: string, parts: Part[]): string | null {
  const segs = segmentLine(line, parts);
  if (segs.filter((s) => s.part !== null).length !== parts.length) return 'не все части нашлись в строке';
  if (segs.map((s) => s.text).join('') !== line) return 'склейка не равна строке';
  const junk = segs.find((s) => s.part === null && s.text.trim() !== '');
  if (junk) return `непокрытый текст «${junk.text.trim()}»`;
  for (const part of parts) {
    if (part.sub) {
      const inner = coverProblem(part.t, part.sub);
      if (inner) return `в «${part.t}» ${inner}`;
    }
  }
  return null;
}

function walk(parts: Part[] | undefined, fn: (p: Part) => void) {
  parts?.forEach((p) => {
    fn(p);
    walk(p.sub, fn);
  });
}

describe('целостность корпуса', () => {
  it('карточки есть и разложены по 14 разделам', () => {
    expect(data.categories.length).toBe(14);
    expect(data.cards.length).toBeGreaterThanOrEqual(250);
  });

  it('каждая карточка лежит в существующем разделе и в каждом разделе есть карточки', () => {
    const known = new Set(data.categories);
    expect(data.cards.filter((c) => !known.has(c.category)).map((c) => c.slug)).toEqual([]);
    expect(data.categories.filter((cat) => !data.cards.some((c) => c.category === cat))).toEqual([]);
  });

  it('id и slug уникальны', () => {
    // Навигация идёт по slug в адресе, соседи ищутся по id.
    expect(new Set(data.cards.map((c) => c.id)).size).toBe(data.cards.length);
    expect(new Set(data.cards.map((c) => c.slug)).size).toBe(data.cards.length);
  });

  it('копия корпуса в корне репозитория совпадает с той, что раздаётся сайтом', () => {
    expect(fs.readFileSync(CORPUS_COPY, 'utf8')).toBe(html);
  });

  it('полный корпус на месте после `};` внутри bash-кода', () => {
    // Сборщик экранирует `};` в строках, иначе регулярка обрезала бы DATA.
    expect(data.cards.length).toBe((html.match(/"slug":/g) ?? []).length);
  });
});

describe('разбор по частям', () => {
  const lines = data.cards.flatMap(allLines);

  it('у каждой строки есть разбор', () => {
    expect(lines.filter((l) => !l.parts?.length).map((l) => l.where)).toEqual([]);
  });

  it('части покрывают строку целиком, слева направо, без пропусков', () => {
    const bad = lines
      .map((l) => ({ where: l.where, err: l.parts ? coverProblem(l.line, l.parts) : 'нет parts' }))
      .filter((x) => x.err);
    expect(bad).toEqual([]);
  });

  it('у каждой части известный тип и непустое пояснение', () => {
    const bad: string[] = [];
    for (const l of lines) walk(l.parts, (p) => (!KINDS[p.k] || !p.d.trim()) && bad.push(`${l.where} «${p.t}»`));
    expect(bad).toEqual([]);
  });

  it('ссылки ref ведут на существующие карточки спецсимволов', () => {
    const slugs = new Set(data.cards.map((c) => c.slug));
    const bad: string[] = [];
    for (const l of lines) walk(l.parts, (p) => p.ref && !slugs.has(p.ref) && bad.push(`${l.where} → ${p.ref}`));
    expect(bad).toEqual([]);
  });
});

describe('запуск и вывод', () => {
  const runs = data.cards.flatMap((c) => [
    ...c.examples.map((e, i) => ({ where: `${c.slug} пример ${i + 1}`, run: e.run, output: e.output })),
    ...(c.script ? [{ where: `${c.slug} скрипт`, run: c.script.run, output: c.script.output }] : []),
  ]);

  it('у примеров, которые не запускались, нет вывода', () => {
    // Вывод на сайте только настоящий. Появился вывод у system или danger,
    // значит его написали руками.
    expect(runs.filter((r) => r.run !== 'container' && r.output).map((r) => r.where)).toEqual([]);
  });
});

describe('источники и стиль', () => {
  it('у каждой карточки есть https-источник', () => {
    const bad = data.cards.filter((c) => c.sources.length === 0 || c.sources.some((u) => !/^https:\/\/\S+$/.test(u)));
    expect(bad.map((c) => c.slug)).toEqual([]);
  });

  it('нет длинного тире', () => {
    expect(data.cards.filter((c) => JSON.stringify(c).includes('—')).map((c) => c.slug)).toEqual([]);
  });

  it('заголовки карточек не повторяются', () => {
    const seen = new Set<string>();
    const dups = data.cards.filter((c) => {
      const k = c.text.trim().toLowerCase();
      if (seen.has(k)) return true;
      seen.add(k);
      return false;
    });
    expect(dups.map((c) => c.slug)).toEqual([]);
  });

  it('нет заглушек', () => {
    expect(data.cards.filter((c) => /TODO|Lorem ipsum|\.\.\.\s*$/i.test(c.summary)).map((c) => c.slug)).toEqual([]);
  });
});
