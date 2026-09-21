import { expandWithSynonyms } from './synonyms';
import { generateSearchVariants } from './translit';

/** Тип части разбора, от него зависит цвет. Список совпадает с content/SCHEMA.md. */
export type PartKind =
  | 'cmd' | 'sub' | 'opt' | 'val' | 'arg' | 'path' | 'op'
  | 'var' | 'str' | 'pat' | 'num' | 'kw' | 'cmt';

export interface Part {
  /** Кусок строки, ровно как он написан в команде. */
  t: string;
  k: PartKind;
  /** Что этот кусок делает в этой строке. */
  d: string;
  /** slug карточки спецсимвола, где символ разобран подробно. */
  ref?: string;
  /** Разбор куска дальше, по символам. */
  sub?: Part[];
}

export type RunMode = 'container' | 'system' | 'danger';

export interface Example {
  line: string;
  d: string;
  parts: Part[];
  run: RunMode;
  setup: string;
  output: string;
}

export interface ScriptLine {
  line: string;
  d: string;
  parts?: Part[];
}

export interface Script {
  name: string;
  d: string;
  lines: ScriptLine[];
  run: RunMode;
  setup: string;
  args?: string;
  output: string;
}

export interface Card {
  id: number;
  num: number;
  category: string;
  slug: string;
  cmd: string;
  text: string;
  summary: string;
  examples: Example[];
  script: Script | null;
  mistakes: string[];
  sources: string[];
}

export interface LinuxData {
  categories: string[];
  cards: Card[];
}

export async function loadLinuxData(): Promise<LinuxData> {
  // Из папки (file://) fetch запрещён браузером, поэтому офлайн-сборка
  // встраивает корпус в бандл, а сайт по-прежнему грузит его по сети.
  const html =
    import.meta.env.MODE === 'offline'
      ? (await import('../../public/Linux_Commands.html?raw')).default
      : await (await fetch(`${import.meta.env.BASE_URL}Linux_Commands.html`)).text();
  return parseCorpus(html);
}

/** Достаёт объект DATA из HTML-корпуса, собранного scripts/build-corpus.mjs. */
export function parseCorpus(html: string): LinuxData {
  // Сборщик экранирует `};` внутри строк, поэтому первое `};` это конец DATA.
  const m = html.match(/var\s+DATA\s*=\s*(\{[\s\S]*?\});/);
  if (!m) throw new Error('в корпусе не найден объект DATA');
  return JSON.parse(m[1]) as LinuxData;
}

export function stripHtml(html: string): string {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
}

export function shortCat(cat: string): string {
  return cat.replace(/^\d+\.\s*/, '');
}

export function getCardsForCategory(data: LinuxData, categoryIndex: number): Card[] {
  const cat = data.categories[categoryIndex];
  return data.cards.filter((c) => c.category === cat);
}

/** Сколько строк разобрано в карточке, примеры плюс непустые строки скрипта. */
export function countLines(card: Card): number {
  return card.examples.length + (card.script?.lines.filter((l) => l.line.trim()).length ?? 0);
}

/** Стоп-слова убираем из запроса, чтобы «как найти файл» искало по «найти файл». */
const STOP_WORDS = new Set([
  'что', 'такое', 'как', 'это', 'про', 'о', 'об', 'и', 'в', 'на', 'с', 'к', 'у',
  'не', 'по', 'для', 'из', 'от', 'до', 'при', 'за', 'над', 'без',
  'мне', 'нам', 'вам', 'покажи', 'объясни', 'найди', 'ищи', 'искать',
  'пожалуйста', 'можно', 'нужно', 'нужен', 'нужна', 'команда', 'команды', 'командой',
  'а', 'но', 'или', 'же', 'ли', 'бы', 'чем', 'где', 'когда', 'зачем', 'почему',
  'какой', 'какая', 'какие', 'так', 'тоже', 'также', 'ещё', 'еще', 'уже', 'только',
  'what', 'is', 'are', 'how', 'do', 'does', 'the', 'a', 'an', 'to', 'in', 'of', 'and', 'or',
]);

function filterStopWords(terms: string[]): string[] {
  const meaningful = terms.filter((t) => t.length > 0 && !STOP_WORDS.has(t));
  return meaningful.length > 0 ? meaningful : terms;
}

export interface SearchTerms {
  /** Все варианты, по которым идёт сопоставление: слова пользователя + синонимы + транслит. */
  all: string[];
  /** Только то, что ввёл пользователь (без стоп-слов), весит вдвое при ранжировании. */
  user: Set<string>;
}

/**
 * Строит набор поисковых терминов из запроса.
 *
 * Этим же набором подсвечиваются совпадения в результатах, поэтому подсветка
 * показывает ровно то, по чему сработал поиск («грэп» подсветит grep).
 */
export function buildSearchTerms(query: string): SearchTerms {
  const rawTerms = query.toLowerCase().split(/\s+/).filter((t) => t.length > 0);
  if (rawTerms.length === 0) return { all: [], user: new Set() };

  const userTerms = filterStopWords(rawTerms);
  const withSynonyms = expandWithSynonyms(userTerms);

  const translitVariants: string[] = [];
  for (const t of userTerms) {
    if (/[а-яё]/i.test(t)) translitVariants.push(...generateSearchVariants(t));
  }

  return {
    all: [...new Set([...withSynonyms, ...translitVariants])],
    user: new Set(userTerms),
  };
}

/** Текст карточки для поиска: описание, строки примеров и скрипта с их пояснениями. */
function bodyText(c: Card): string {
  const parts = [stripHtml(c.summary)];
  for (const e of c.examples) parts.push(e.line, e.d);
  if (c.script) {
    parts.push(c.script.name, c.script.d);
    for (const l of c.script.lines) parts.push(l.line, l.d);
  }
  return parts.join('\n').toLowerCase();
}

const bodyCache = new WeakMap<Card, string>();

/**
 * Поиск по карточкам.
 *   1. Точное совпадение с именем команды (`grep`, `tar`, `2>&1`) весит больше всего.
 *   2. Совпадение в заголовке ×5, в разделе ×3, в теле ×1.
 *   3. Слова пользователя весят вдвое против синонимов и транслита.
 *   4. Бонус за долю совпавших слов пользователя и за совпадение всех.
 */
export function searchCards(data: LinuxData, query: string): Card[] {
  const { all: allTerms, user: userSet } = buildSearchTerms(query);
  if (allTerms.length === 0) return [];
  const userTerms = [...userSet];

  const scored: { c: Card; score: number }[] = [];
  for (const c of data.cards) {
    const cmd = c.cmd.toLowerCase();
    const title = c.text.toLowerCase();
    const cat = c.category.toLowerCase();
    let body = bodyCache.get(c);
    if (body === undefined) {
      body = bodyText(c);
      bodyCache.set(c, body);
    }

    let score = 0;
    let matchedUserTerms = 0;
    for (const t of allTerms) {
      const isUser = userSet.has(t);
      const multiplier = isUser ? 2 : 1;
      const exactCmd = cmd === t;
      const inTitle = title.includes(t);
      const inCat = cat.includes(t);
      const inBody = body.includes(t);
      if (!exactCmd && !inTitle && !inCat && !inBody) continue;

      if (exactCmd) score += 30;
      if (inTitle) score += 5 * multiplier;
      if (inCat) score += 3 * multiplier;
      if (inBody) score += 1 * multiplier;
      if (isUser) matchedUserTerms++;
    }
    if (score === 0) continue;

    if (userTerms.length > 0) {
      score += (matchedUserTerms / userTerms.length) * 8;
      if (matchedUserTerms === userTerms.length) score += 20;
    }
    scored.push({ c, score });
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.map((s) => s.c);
}

/**
 * Раскладывает строку на отрезки: части разбора и пробелы между ними.
 * Сборщик гарантирует, что части покрывают строку целиком, поэтому здесь
 * достаточно идти по строке и искать каждую часть после предыдущей.
 */
export function segmentLine(line: string, parts: Part[]): { text: string; part: number | null }[] {
  const out: { text: string; part: number | null }[] = [];
  let cursor = 0;
  parts.forEach((p, i) => {
    const idx = line.indexOf(p.t, cursor);
    if (idx < 0) return;
    if (idx > cursor) out.push({ text: line.slice(cursor, idx), part: null });
    out.push({ text: p.t, part: i });
    cursor = idx + p.t.length;
  });
  if (cursor < line.length) out.push({ text: line.slice(cursor), part: null });
  return out;
}
