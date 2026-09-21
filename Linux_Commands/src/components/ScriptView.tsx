import { useState } from 'react';
import { ChevronDown, ChevronRight, FileCode } from 'lucide-react';
import type { Script } from '@/lib/linux-data';
import Breakdown from '@/components/Breakdown';
import RunInfo from '@/components/RunInfo';

interface ScriptViewProps {
  script: Script;
  onOpenRef: (slug: string) => void;
}

/**
 * Скрипт построчно. У каждой строки номер и пояснение, строку можно раскрыть
 * до разбора по частям и символам тем же компонентом, что и одиночные команды.
 */
const ScriptView = ({ script, onOpenRef }: ScriptViewProps) => {
  const [open, setOpen] = useState<Set<number>>(new Set());
  const expandable = script.lines.map((l, i) => (l.line.trim() && l.parts?.length ? i : -1)).filter((i) => i >= 0);
  const allOpen = expandable.length > 0 && expandable.every((i) => open.has(i));

  const toggle = (i: number) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h3 className="flex items-center gap-2 font-semibold">
          <FileCode className="w-4 h-4 text-primary" />
          <span className="font-mono">{script.name}</span>
        </h3>
        {expandable.length > 0 && (
          <button
            onClick={() => setOpen(allOpen ? new Set() : new Set(expandable))}
            className="text-xs px-2.5 py-1 rounded-md border border-border bg-card text-muted-foreground hover:text-foreground hover:border-primary/30"
          >
            {allOpen ? 'Свернуть все строки' : 'Разобрать все строки'}
          </button>
        )}
      </div>
      <p className="text-sm text-secondary-foreground leading-relaxed">{script.d}</p>

      <div className="rounded-lg border border-border overflow-hidden divide-y divide-border/60">
        {script.lines.map((l, i) => {
          const blank = !l.line.trim();
          const canOpen = !blank && !!l.parts?.length;
          const isOpen = open.has(i);
          return (
            <div key={i} className={isOpen ? 'bg-muted/30' : ''}>
              <button
                disabled={!canOpen}
                onClick={() => canOpen && toggle(i)}
                className={`w-full text-left flex items-stretch ${canOpen ? 'cursor-pointer hover:bg-muted/40' : 'cursor-default'}`}
              >
                <span className="w-10 shrink-0 text-right pr-3 py-1.5 font-mono text-xs text-muted-foreground bg-muted/60 select-none">
                  {i + 1}
                </span>
                <span className="flex-1 min-w-0 px-3 py-1.5">
                  <span className="flex items-start gap-1.5">
                    <code className="font-mono text-[13px] whitespace-pre-wrap break-all text-foreground flex-1">{l.line || ' '}</code>
                    {canOpen &&
                      (isOpen ? (
                        <ChevronDown className="w-4 h-4 mt-0.5 text-primary shrink-0" />
                      ) : (
                        <ChevronRight className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
                      ))}
                  </span>
                  {!blank && l.d && <span className="block text-xs text-muted-foreground mt-0.5 leading-relaxed">{l.d}</span>}
                </span>
              </button>
              {isOpen && l.parts && (
                <div className="px-3 pb-3 pt-1 sm:pl-10">
                  <Breakdown line={l.line} parts={l.parts} onOpenRef={onOpenRef} prompt={false} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {script.args?.trim() && (
        <p className="text-xs text-muted-foreground">
          Запуск с аргументами <code className="font-mono text-foreground">{script.args}</code>
        </p>
      )}
      <RunInfo run={script.run} setup={script.setup} output={script.output} />
    </section>
  );
};

export default ScriptView;
