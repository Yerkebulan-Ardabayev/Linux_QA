import { describe, expect, it } from 'vitest';
import {
  type Card,
  type LinuxData,
  type Part,
  buildSearchTerms,
  countLines,
  getCardsForCategory,
  searchCards,
  segmentLine,
  shortCat,
  stripHtml,
} from '@/lib/linux-data';
import { highlightSegments } from '@/lib/highlight';
import { cyrToLatin, generateSearchVariants } from '@/lib/translit';
import { expandWithSynonyms } from '@/lib/synonyms';

const p = (t: string, k: Part['k'] = 'arg'): Part => ({ t, k, d: 'x' });

function card(id: number, category: string, cmd: string, text: string, summary: string, line = cmd): Card {
  return {
    id,
    num: id + 1,
    category,
    slug: `c${id}`,
    cmd,
    text,
    summary,
    examples: [{ line, d: 'пример', parts: [p(line, 'cmd')], run: 'container', setup: '', output: '' }],
    script: null,
    mistakes: [],
    sources: ['https://man7.org/'],
  };
}

const data: LinuxData = {
  categories: ['Просмотр и обработка текста', 'Архивы и сжатие', 'Спецсимволы и основы оболочки'],
  cards: [
    card(0, 'Просмотр и обработка текста', 'grep', 'grep: найти строки по шаблону', '<p>Ищет строки. Похоже на sed.</p>'),
    card(1, 'Просмотр и обработка текста', 'sed', 'sed: заменить текст в потоке', '<p>Потоковый редактор, часто после grep.</p>'),
    card(2, 'Архивы и сжатие', 'tar', 'tar: упаковать каталог в архив', '<p>Архивы .tar.gz.</p>'),
    card(3, 'Спецсимволы и основы оболочки', '2>&1', '2>&1: ошибки туда же, куда вывод', '<p>Перенаправление stderr.</p>'),
  ],
};

describe('stripHtml', () => {
  it('убирает теги и оставляет текст', () => {
    expect(stripHtml('<p>Привет <b>мир</b></p>')).toBe('Привет мир');
  });
});

describe('shortCat', () => {
  it('срезает ведущий номер раздела и не трогает название без номера', () => {
    expect(shortCat('3. Сеть')).toBe('Сеть');
    expect(shortCat('Сеть')).toBe('Сеть');
  });
});

describe('getCardsForCategory', () => {
  it('возвращает только карточки своего раздела', () => {
    expect(getCardsForCategory(data, 0).map((c) => c.cmd)).toEqual(['grep', 'sed']);
    expect(getCardsForCategory(data, 1).map((c) => c.cmd)).toEqual(['tar']);
  });
});

describe('searchCards', () => {
  it('пустой запрос не даёт результатов', () => {
    expect(searchCards(data, '   ')).toEqual([]);
  });

  it('точное имя команды стоит первым, даже если слово встречается в других карточках', () => {
    // grep упомянут и в описании sed, но карточка grep должна быть первой.
    expect(searchCards(data, 'grep')[0].cmd).toBe('grep');
    expect(searchCards(data, 'sed')[0].cmd).toBe('sed');
  });

  it('«грэп» кириллицей находит grep', () => {
    expect(searchCards(data, 'грэп')[0]?.cmd).toBe('grep');
  });

  it('«тар» кириллицей находит tar', () => {
    expect(searchCards(data, 'тар')[0]?.cmd).toBe('tar');
  });

  it('задача по-русски через синоним находит команду', () => {
    expect(searchCards(data, 'архив')[0]?.cmd).toBe('tar');
  });

  it('спецсимвол ищется как есть', () => {
    expect(searchCards(data, '2>&1')[0]?.cmd).toBe('2>&1');
  });

  it('заведомо отсутствующий термин не находится', () => {
    expect(searchCards(data, 'zzzнесуществующийтермин')).toEqual([]);
  });
});

describe('segmentLine', () => {
  it('восстанавливает строку целиком вместе с пробелами', () => {
    const parts = [p('tar', 'cmd'), p('-czf', 'opt'), p('a.tgz'), p('/etc', 'path')];
    const segs = segmentLine('tar  -czf a.tgz /etc', parts);
    expect(segs.map((s) => s.text).join('')).toBe('tar  -czf a.tgz /etc');
    expect(segs.filter((s) => s.part !== null).map((s) => s.part)).toEqual([0, 1, 2, 3]);
  });

  it('части без пробела между ними идут подряд', () => {
    const segs = segmentLine('ls|wc', [p('ls', 'cmd'), p('|', 'op'), p('wc', 'cmd')]);
    expect(segs.map((s) => s.text)).toEqual(['ls', '|', 'wc']);
  });
});

describe('countLines', () => {
  it('считает примеры и непустые строки скрипта', () => {
    const c = card(9, 'x', 'if', 'if', '<p>x</p>');
    c.script = {
      name: 's.sh',
      d: 'x',
      lines: [{ line: '#!/bin/bash', d: 'x', parts: [p('#!/bin/bash')] }, { line: '', d: '' }, { line: 'echo hi', d: 'x', parts: [p('echo hi')] }],
      run: 'container',
      setup: '',
      output: '',
    };
    expect(countLines(c)).toBe(3);
  });
});

describe('translit', () => {
  it('переводит кириллицу в латиницу', () => {
    expect(cyrToLatin('грэп')).toBe('grep');
    expect(cyrToLatin('чмод')).toBe('chmod');
  });

  it('генерирует варианты, среди которых есть исходная транслитерация', () => {
    expect(generateSearchVariants('судо')).toContain('sudo');
  });
});

describe('synonyms', () => {
  it('расширение синонимами не теряет исходные термины', () => {
    expect(expandWithSynonyms(['tar'])).toContain('tar');
  });

  it('«аук» на слух находит awk, транслитом это не получается', () => {
    expect(cyrToLatin('аук')).not.toBe('awk');
    expect(expandWithSynonyms(['аук'])).toContain('awk');
  });
});

describe('buildSearchTerms', () => {
  it('выбрасывает стоп-слова и оставляет значимые термины', () => {
    const { user } = buildSearchTerms('как найти файл');
    expect(user.has('найти')).toBe(true);
    expect(user.has('как')).toBe(false);
  });

  it('на пустом запросе возвращает пустой набор', () => {
    const { all, user } = buildSearchTerms('   ');
    expect(all).toEqual([]);
    expect(user.size).toBe(0);
  });

  it('в набор попадают синонимы, по ним же идёт подсветка', () => {
    const { all } = buildSearchTerms('архив');
    expect(all).toContain('tar');
  });
});

describe('highlightSegments', () => {
  it('помечает совпадение и оставляет остальной текст целым', () => {
    const segs = highlightSegments('tar упаковывает каталог', ['упаковывает']);
    expect(segs.map(s => s.text).join('')).toBe('tar упаковывает каталог');
    expect(segs.filter(s => s.hit).map(s => s.text)).toEqual(['упаковывает']);
  });

  it('регистр не важен', () => {
    const segs = highlightSegments('DOCKER и docker', ['Docker']);
    expect(segs.filter(s => s.hit).map(s => s.text)).toEqual(['DOCKER', 'docker']);
  });

  it('длинный термин побеждает короткий и подсветка не рвётся', () => {
    const segs = highlightSegments('ssh-keygen', ['ssh', 'ssh-keygen']);
    expect(segs.filter(s => s.hit).map(s => s.text)).toEqual(['ssh-keygen']);
  });

  it('спецсимволы в термине не ломают регулярку', () => {
    const segs = highlightSegments('порт (80) открыт', ['(80)']);
    expect(segs.filter(s => s.hit).map(s => s.text)).toEqual(['(80)']);
  });

  it('односимвольные термины игнорируются, иначе подсветится половина текста', () => {
    const segs = highlightSegments('в среде в кластере', ['в']);
    expect(segs.some(s => s.hit)).toBe(false);
  });

  it('без терминов возвращает текст одним куском', () => {
    expect(highlightSegments('текст', [])).toEqual([{ text: 'текст', hit: false }]);
  });
});

