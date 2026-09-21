#!/usr/bin/env node
/**
 * Проверяет, что каждая ссылка из sources в content/*.json открывается,
 * а у ссылки с якорем (#Pipelines) на странице есть элемент с таким id или name.
 * Иначе ссылка «работает», но ведёт в начало огромной страницы, а не в раздел.
 *
 * Запрос GET с переходом по редиректам (часть сайтов отвечает на HEAD 403/405).
 * Отчёт пишется в _reports/links.md: сводка и список проблемных ссылок с
 * вопросами, где они стоят. Код выхода 1, если есть хоть одна не-200.
 *
 * Запуск: node scripts/check-links.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTENT = path.join(ROOT, 'content');
const REPORT = path.join(ROOT, '_reports/links.md');
// Адреса, проверенные вручную в браузере (сайты блокируют скрипты). См. сам файл.
const MANUAL = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/browser-verified.json'), 'utf8'));
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128 Safari/537.36';

const usage = new Map(); // url -> [где встречается]
for (const f of fs.readdirSync(CONTENT).filter((f) => /^\d{2}-.+\.json$/.test(f)).sort()) {
  const sec = JSON.parse(fs.readFileSync(path.join(CONTENT, f), 'utf8'));
  sec.cards.forEach((c, i) => {
    for (const u of c.sources ?? []) {
      if (!usage.has(u)) usage.set(u, []);
      usage.get(u).push(`${f} #${i + 1} «${c.text}»`);
    }
  });
}

// Node проверяет цепочку сертификатов по своему встроенному хранилищу и не
// догружает недостающий промежуточный сертификат по ссылке из самого сертификата
// (AIA). Сайты с неполной цепочкой из-за этого падают у Node, хотя в браузере и
// в curl открываются. Для таких случаев перепроверяем системным клиентом.
const TLS_CHAIN_ERRORS = new Set([
  'UNABLE_TO_VERIFY_LEAF_SIGNATURE',
  'UNABLE_TO_GET_ISSUER_CERT',
  'UNABLE_TO_GET_ISSUER_CERT_LOCALLY',
]);

function checkWithCurl(url) {
  const r = spawnSync(
    '/usr/bin/curl',
    ['-s', '-o', '/dev/null', '-L', '-m', '25', '-A', UA, '-w', '%{http_code}', url],
    { encoding: 'utf8' },
  );
  const code = Number.parseInt((r.stdout ?? '').trim(), 10);
  return Number.isFinite(code) ? code : 0;
}

async function fetchPage(url) {
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const r = await fetch(url, {
        redirect: 'follow',
        headers: { 'User-Agent': UA, Accept: 'text/html,*/*' },
        signal: AbortSignal.timeout(30000),
      });
      const text = r.status === 200 ? await r.text() : (await r.body?.cancel(), '');
      if (r.status === 200 || attempt === 2) return { status: r.status, final: r.url, text };
    } catch (e) {
      const code = String(e.cause?.code ?? e.name);
      if (TLS_CHAIN_ERRORS.has(code) && checkWithCurl(url) === 200) {
        return { status: 200, final: url, text: null, note: `неполная цепочка сертификатов, проверено системным клиентом (${code})` };
      }
      if (attempt === 2) return { status: 'ERR', final: code, text: '' };
    }
  }
}

// Часть сайтов (manpages.ubuntu.com) обрывает соединение при частых запросах.
// Поэтому к одному сайту идёт один запрос за раз, а обрыв повторяется с паузой.
const hostQueue = new Map();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function politeFetch(url) {
  let r;
  for (let attempt = 0; attempt < 4; attempt++) {
    if (attempt) await sleep(10000 * attempt);
    r = await fetchPage(url);
    if (r.status !== 'ERR') return r;
  }
  return r;
}
function fetchSerialByHost(url) {
  const host = new URL(url).host;
  const run = (hostQueue.get(host) ?? Promise.resolve()).then(() => politeFetch(url));
  hostQueue.set(host, run.catch(() => {}));
  return run;
}

// Одна страница на много якорей (руководство bash), поэтому качаем её один раз.
const pages = new Map();
const page = (base) => {
  if (!pages.has(base)) pages.set(base, fetchSerialByHost(base));
  return pages.get(base);
};

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// www.gnu.org бывает недоступен из отдельных сетей целиком (таймаут соединения,
// и в браузере тоже). Тогда страница и якорь сверяются по последнему снимку
// web.archive.org, а в отчёте такая ссылка идёт отдельным пунктом.
const ARCHIVE_FALLBACK = /^https:\/\/www\.gnu\.org\//;

async function check(url) {
  const [base, hash] = url.split('#');
  let r = await page(base);
  if (r.status === 'ERR' && ARCHIVE_FALLBACK.test(base)) {
    // Свежий снимок бывает сохранённой ошибкой самого сайта (403, 404), тогда берём снимок постарше.
    for (const year of ['2026', '2025', '2024']) {
      const snap = await page(`https://web.archive.org/web/${year}id_/${base}`);
      if (snap.status === 200) {
        r = { ...snap, final: base, note: `сайт недоступен из этой сети, страница и якорь сверены по снимку web.archive.org (${snap.final.match(/\/web\/(\d{8})/)?.[1] ?? year})` };
        break;
      }
    }
  }
  if (r.status !== 200 || !hash || r.text === null) return { status: r.status, final: r.final, note: r.note };
  const anchor = decodeURIComponent(hash);
  const found = new RegExp(`(id|name)=["']${escapeRe(anchor)}["']`).test(r.text);
  return found ? { status: 200, final: r.final, note: r.note } : { status: `нет якоря #${anchor}`, final: r.final };
}

const urls = [...usage.keys()];
const results = new Map();
const POOL = 8;
let next = 0;
await Promise.all(
  Array.from({ length: POOL }, async () => {
    while (next < urls.length) {
      const u = urls[next++];
      results.set(u, await check(u));
    }
  }),
);

const manual = urls.filter((u) => results.get(u).status !== 200 && MANUAL[u]);
const bad = urls.filter((u) => results.get(u).status !== 200 && !MANUAL[u]);
const lines = [
  `# Проверка ссылок`,
  ``,
  `Дата: ${new Date().toISOString().slice(0, 10)}`,
  `Всего уникальных ссылок: ${urls.length}, код 200: ${urls.length - bad.length - manual.length}, проверено вручную в браузере: ${manual.length}, проблемных: ${bad.length}.`,
  ``,
];
if (manual.length) {
  lines.push(`## Проверено вручную в браузере`, ``);
  for (const u of manual) lines.push(`- ${results.get(u).status} ${u} (${MANUAL[u].checked}, «${MANUAL[u].title}»)`);
  lines.push(``);
}
const viaCurl = urls.filter((u) => results.get(u).note);
if (viaCurl.length) {
  lines.push(`## Проверено обходным путём`, ``);
  for (const u of viaCurl) lines.push(`- ${u} (${results.get(u).note})`);
  lines.push(``);
}
if (bad.length) {
  lines.push(`## Проблемные`, ``);
  for (const u of bad) {
    const r = results.get(u);
    lines.push(`- ${r.status} ${u}`, ...usage.get(u).map((w) => `  - ${w}`));
  }
}
fs.mkdirSync(path.dirname(REPORT), { recursive: true });
fs.writeFileSync(REPORT, lines.join('\n') + '\n');
console.log(lines.slice(3, 4).join(''));
for (const u of bad) console.log(`  ${results.get(u).status} ${u}`);
process.exit(bad.length ? 1 : 0);
