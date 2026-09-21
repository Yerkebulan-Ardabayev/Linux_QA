import { useState } from 'react';
import { ArrowUpRight, Check, Copy } from 'lucide-react';
import { type Part, segmentLine } from '@/lib/linux-data';
import { KINDS } from '@/lib/kinds';

interface BreakdownProps {
  line: string;
  parts: Part[];
  /** Открыть карточку спецсимвола по slug. */
  onOpenRef: (slug: string) => void;
  /** Показывать ли приглашение `$` перед строкой (у строк скрипта его нет). */
  prompt?: boolean;
}

/**
 * Разбор одной строки по частям и символам.
 *
 * Сверху строка в «терминале», каждая часть окрашена по типу. Под ней таблица
 * «часть, тип, что делает». Наведение на часть в строке подсвечивает её строку
 * в таблице и наоборот, нажатие закрепляет подсветку (на телефоне наведения нет).
 * Ключ части это путь индексов через точку: «2» часть, «2.1» её символ.
 */
const Breakdown = ({ line, parts, onOpenRef, prompt = true }: BreakdownProps) => {
  const [hover, setHover] = useState<string | null>(null);
  const [pinned, setPinned] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const active = hover ?? pinned;

  const indent = line.length - line.trimStart().length;
  const text = line.slice(indent);

  const isActive = (key: string) => active !== null && (active === key || active.startsWith(`${key}.`));
  const isExact = (key: string) => active === key;

  const bind = (key: string) => ({
    onMouseEnter: () => setHover(key),
    onMouseLeave: () => setHover(null),
    onClick: (e: React.MouseEvent) => {
      e.stopPropagation();
      setPinned((p) => (p === key ? null : key));
    },
  });

  const renderTokens = (src: string, list: Part[], prefix: string): React.ReactNode =>
    segmentLine(src, list).map((seg, i) => {
      if (seg.part === null) return <span key={`g${prefix}${i}`}>{seg.text}</span>;
      const p = list[seg.part];
      const key = prefix ? `${prefix}.${seg.part}` : String(seg.part);
      const on = isActive(key);
      return (
        <span
          key={key}
          {...bind(key)}
          className={`cursor-pointer rounded-sm transition-colors ${KINDS[p.k]?.text ?? ''} ${
            isExact(key) ? 'bg-white/20 ring-1 ring-white/40' : on ? 'bg-white/10' : 'hover:bg-white/10'
          }`}
        >
          {p.sub ? renderTokens(p.t, p.sub, key) : p.t}
        </span>
      );
    });

  const renderRows = (list: Part[], prefix: string, depth: number): React.ReactNode =>
    list.map((p, i) => {
      const key = prefix ? `${prefix}.${i}` : String(i);
      return (
        <div key={key}>
          <div
            {...bind(key)}
            data-part-key={key}
            className={`flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-3 px-3 py-2 cursor-pointer transition-colors border-l-2 ${
              isExact(key) ? 'bg-primary/10 border-primary' : 'border-transparent hover:bg-muted/60'
            }`}
            style={{ paddingLeft: `${0.75 + depth * 1.25}rem` }}
          >
            <div className="flex items-center gap-2 sm:w-56 shrink-0 min-w-0">
              <code
                className={`px-1.5 py-0.5 rounded bg-zinc-900 font-mono text-[13px] whitespace-pre break-all ${KINDS[p.k]?.text ?? ''}`}
              >
                {p.t}
              </code>
              <span className="text-[11px] text-muted-foreground whitespace-nowrap">{KINDS[p.k]?.label ?? p.k}</span>
            </div>
            <div className="text-sm text-secondary-foreground leading-relaxed flex-1 min-w-0">
              {p.d}
              {p.ref && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenRef(p.ref!);
                  }}
                  className="ml-2 inline-flex items-center gap-0.5 text-xs text-primary hover:underline whitespace-nowrap"
                  title="Открыть разбор этого символа"
                >
                  подробнее о символе
                  <ArrowUpRight className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
          {p.sub && renderRows(p.sub, key, depth + 1)}
        </div>
      );
    });

  return (
    <div className="rounded-lg border border-border overflow-hidden" onMouseLeave={() => setHover(null)}>
      <div className="relative bg-zinc-950 text-zinc-100 font-mono text-[15px] leading-7 px-4 py-3 pr-12 overflow-x-auto">
        <div className="whitespace-pre">
          {prompt && <span className="text-zinc-500 select-none">$ </span>}
          {indent > 0 && <span>{line.slice(0, indent)}</span>}
          {renderTokens(text, parts, '')}
        </div>
        <button
          onClick={() => {
            navigator.clipboard?.writeText(line.trim()).then(() => {
              setCopied(true);
              setTimeout(() => setCopied(false), 1200);
            });
          }}
          className="absolute top-2.5 right-2.5 p-1.5 rounded-md text-zinc-400 hover:text-zinc-100 hover:bg-white/10 transition-colors"
          title="Скопировать команду"
        >
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
        </button>
      </div>
      <div className="divide-y divide-border/60 bg-card">{renderRows(parts, '', 0)}</div>
    </div>
  );
};

export default Breakdown;
