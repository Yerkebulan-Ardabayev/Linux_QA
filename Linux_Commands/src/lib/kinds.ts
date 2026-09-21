import type { PartKind } from './linux-data';

/**
 * Цвет и подпись для каждого типа части. Строка команды всегда рисуется в
 * тёмном «терминале», поэтому цвета текста подобраны под тёмный фон в обеих
 * темах, а чипы в таблице разбора используют те же цвета на своём фоне.
 */
export const KINDS: Record<PartKind, { label: string; text: string }> = {
  cmd: { label: 'команда', text: 'text-emerald-400' },
  sub: { label: 'подкоманда', text: 'text-lime-300' },
  opt: { label: 'опция', text: 'text-sky-400' },
  val: { label: 'значение опции', text: 'text-cyan-300' },
  arg: { label: 'аргумент', text: 'text-amber-300' },
  path: { label: 'путь', text: 'text-violet-300' },
  op: { label: 'спецсимвол', text: 'text-pink-400' },
  var: { label: 'переменная', text: 'text-orange-300' },
  str: { label: 'строка', text: 'text-yellow-200' },
  pat: { label: 'шаблон', text: 'text-fuchsia-300' },
  num: { label: 'число', text: 'text-teal-300' },
  kw: { label: 'слово bash', text: 'text-blue-400' },
  cmt: { label: 'комментарий', text: 'text-zinc-400 italic' },
};

export const KIND_ORDER: PartKind[] = ['cmd', 'sub', 'opt', 'val', 'arg', 'path', 'op', 'var', 'str', 'pat', 'num', 'kw', 'cmt'];
