import type { PartKind } from './linux-data';

/**
 * Цвет и подпись для каждого типа части. Строка команды всегда рисуется в
 * тёмном «терминале», поэтому цвета текста подобраны под тёмный фон в обеих
 * темах, а чипы в таблице разбора используют те же цвета на своём фоне.
 * Палитра Nord (nordtheme.com), Frost и Aurora, плюс светлые оттенки тех же
 * тонов там, где 13 типам не хватило девяти цветов палитры.
 */
export const KINDS: Record<PartKind, { label: string; text: string }> = {
  cmd: { label: 'команда', text: 'text-[#A3BE8C]' },
  sub: { label: 'подкоманда', text: 'text-[#C9DCAE]' },
  opt: { label: 'опция', text: 'text-[#88C0D0]' },
  val: { label: 'значение опции', text: 'text-[#B6DCE6]' },
  arg: { label: 'аргумент', text: 'text-[#EBCB8B]' },
  path: { label: 'путь', text: 'text-[#B48EAD]' },
  op: { label: 'спецсимвол', text: 'text-[#E5939B]' },
  var: { label: 'переменная', text: 'text-[#D08770]' },
  str: { label: 'строка', text: 'text-[#F0E2B6]' },
  pat: { label: 'шаблон', text: 'text-[#DDA6CF]' },
  num: { label: 'число', text: 'text-[#8FBCBB]' },
  kw: { label: 'слово bash', text: 'text-[#81A1C1]' },
  cmt: { label: 'комментарий', text: 'text-[#8C99B3] italic' },
};

export const KIND_ORDER: PartKind[] = ['cmd', 'sub', 'opt', 'val', 'arg', 'path', 'op', 'var', 'str', 'pat', 'num', 'kw', 'cmt'];
