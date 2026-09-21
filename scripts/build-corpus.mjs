#!/usr/bin/env node
/**
 * Собирает корпус сайта из content/NN-*.json и проверяет его.
 *
 * Формат описан в content/SCHEMA.md. Главная проверка, части разбора
 * (parts и sub) покрывают строку команды целиком, слева направо, без
 * пропусков: между частями допустимы только пробелы. Так разбор не может
 * разойтись с самой командой.
 *
 * Результат пишется в два места, которые должны совпадать (это держит тест):
 *   Linux_Commands/public/Linux_Commands.html  (раздаётся сайтом)
 *   Linux_Commands.html                        (копия в корне)
 *
 * Запуск: node scripts/build-corpus.mjs [--check]   (--check, только проверка)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTENT = path.join(ROOT, 'content');
const OUT = [
  path.join(ROOT, 'Linux_Commands/public/Linux_Commands.html'),
  path.join(ROOT, 'Linux_Commands.html'),
];
const CHECK_ONLY = process.argv.includes('--check');
// --only NN проверяет один раздел, чтобы параллельная работа над другими не мешала.
const ONLY = process.argv.includes('--only') ? process.argv[process.argv.indexOf('--only') + 1] : null;
// Допустимые ref, это slug раздела 01 из таблицы в SCHEMA.md.
const SYMBOL_SLUGS = new Set(
  [...fs.readFileSync(path.join(CONTENT, 'SCHEMA.md'), 'utf8').matchAll(/^\| (sym-[a-z0-9-]+) \|/gm)].map((m) => m[1]),
);

const KINDS = new Set(['cmd', 'sub', 'opt', 'val', 'arg', 'path', 'op', 'var', 'str', 'pat', 'num', 'kw', 'cmt']);
const RUNS = new Set(['container', 'system', 'danger']);
const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

const files = fs
  .readdirSync(CONTENT)
  .filter((f) => /^\d{2}-.+\.json$/.test(f))
  .filter((f) => !ONLY || f.startsWith(`${ONLY}-`))
  .sort();

const categories = [];
const cards = [];
const errors = [];
const refsUsed = [];

/** Проверяет, что parts покрывают text целиком. Возвращает текст ошибки или null. */
export function coverError(text, parts) {
  let cursor = 0;
  for (const p of parts) {
    if (typeof p.t !== 'string' || p.t === '') return 'часть с пустым t';
    const idx = text.indexOf(p.t, cursor);
    if (idx < 0) return `часть «${p.t}» не найдена после позиции ${cursor}`;
    const gap = text.slice(cursor, idx);
    if (gap.trim() !== '') return `непокрытый текст «${gap.trim()}» перед «${p.t}»`;
    cursor = idx + p.t.length;
  }
  const rest = text.slice(cursor);
  if (rest.trim() !== '') return `непокрытый хвост «${rest.trim()}»`;
  return null;
}

function checkParts(where, text, parts) {
  if (!Array.isArray(parts) || parts.length === 0) {
    errors.push(`${where}: нет parts`);
    return;
  }
  const err = coverError(text.trimStart(), parts);
  if (err) errors.push(`${where}: ${err}`);
  for (const [i, p] of parts.entries()) {
    const pw = `${where} часть ${i + 1} «${p.t}»`;
    if (!KINDS.has(p.k)) errors.push(`${pw}: неизвестный k «${p.k}»`);
    if (!p.d?.trim()) errors.push(`${pw}: пустое d`);
    if (p.ref) refsUsed.push({ where: pw, ref: p.ref });
    if (p.sub) checkParts(`${pw} sub`, p.t, p.sub);
  }
}

function checkRun(where, obj) {
  if (!RUNS.has(obj.run)) errors.push(`${where}: run должен быть container, system или danger`);
  if (typeof obj.setup !== 'string') errors.push(`${where}: setup должен быть строкой`);
  if (typeof obj.output !== 'string') errors.push(`${where}: output должен быть строкой`);
}

const slugs = new Set();
const STYLE_RE = /—/;

for (const file of files) {
  const sec = JSON.parse(fs.readFileSync(path.join(CONTENT, file), 'utf8'));
  if (!sec.category) errors.push(`${file}: нет category`);
  categories.push(sec.category);
  for (const [ci, c] of (sec.cards ?? []).entries()) {
    const where = `${file} #${ci + 1} ${c.slug ?? ''}`;
    if (!SLUG_RE.test(c.slug ?? '')) errors.push(`${where}: плохой slug`);
    else if (slugs.has(c.slug)) errors.push(`${where}: slug повторяется`);
    slugs.add(c.slug);
    if (!c.cmd?.trim()) errors.push(`${where}: пустой cmd`);
    if (!c.text?.trim()) errors.push(`${where}: пустой text`);
    if (!c.summary?.trim()) errors.push(`${where}: пустой summary`);
    if (!Array.isArray(c.sources) || c.sources.length === 0) errors.push(`${where}: нет sources`);
    for (const s of c.sources ?? []) if (!/^https:\/\//.test(s)) errors.push(`${where}: источник не https «${s}»`);
    const examples = c.examples ?? [];
    if (examples.length === 0 && !c.script) errors.push(`${where}: нет ни examples, ни script`);
    for (const [ei, e] of examples.entries()) {
      const ew = `${where} пример ${ei + 1}`;
      if (!e.line?.trim()) errors.push(`${ew}: пустой line`);
      if (!e.d?.trim()) errors.push(`${ew}: пустое d`);
      checkParts(ew, e.line ?? '', e.parts);
      checkRun(ew, e);
    }
    if (c.script) {
      const sw = `${where} скрипт`;
      if (!Array.isArray(c.script.lines) || c.script.lines.length === 0) errors.push(`${sw}: нет lines`);
      for (const [li, l] of (c.script.lines ?? []).entries()) {
        const lw = `${sw} строка ${li + 1}`;
        if (typeof l.line !== 'string') errors.push(`${lw}: line не строка`);
        if (!l.line?.trim()) continue;
        if (!l.d?.trim()) errors.push(`${lw}: пустое d`);
        checkParts(lw, l.line, l.parts);
      }
      checkRun(sw, c.script);
    }
    if (STYLE_RE.test(JSON.stringify(c))) errors.push(`${where}: длинное тире`);
    cards.push({
      id: cards.length,
      num: cards.length + 1,
      category: sec.category,
      slug: c.slug,
      cmd: c.cmd,
      text: c.text,
      summary: c.summary,
      examples,
      script: c.script ?? null,
      mistakes: c.mistakes ?? [],
      sources: c.sources ?? [],
    });
  }
}

for (const { where, ref } of refsUsed) {
  if (!SYMBOL_SLUGS.has(ref)) errors.push(`${where}: ref «${ref}» не из списка SCHEMA.md`);
  else if (!ONLY && !slugs.has(ref)) errors.push(`${where}: ref «${ref}», карточки с таким slug нет`);
}
if (ONLY && !CHECK_ONLY) {
  console.error('--only работает только вместе с --check');
  process.exit(2);
}

if (errors.length) {
  console.error(errors.join('\n'));
  console.error(`\nошибок: ${errors.length}`);
  process.exit(1);
}

const lines = cards.reduce(
  (n, c) => n + c.examples.length + (c.script?.lines.filter((l) => l.line.trim()).length ?? 0),
  0,
);

if (CHECK_ONLY) {
  console.log(`проверка пройдена: ${categories.length} разделов, ${cards.length} карточек, ${lines} разобранных строк`);
  process.exit(0);
}

// `</` внутри JSON закрыл бы тег <script> раньше времени, экранируем.
// Загрузчик ищет конец DATA по первому `};`, а он встречается в bash
// (`{ echo hi; };`), поэтому скобку внутри строк пишем как }.
const json = JSON.stringify({ categories, cards })
  .replace(/<\//g, '<\\/')
  .replace(/\};/g, '\\u007d;');
const html = `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<title>Linux Commands, корпус</title>
</head>
<body>
<script>
var DATA = ${json};
</script>
</body>
</html>
`;

for (const out of OUT) {
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, html);
}
console.log(`корпус собран: ${categories.length} разделов, ${cards.length} карточек, ${lines} разобранных строк`);
