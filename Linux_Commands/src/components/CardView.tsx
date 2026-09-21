import { ArrowLeft, ChevronLeft, ChevronRight, Home } from 'lucide-react';
import { type Card, shortCat } from '@/lib/linux-data';
import { KINDS, KIND_ORDER } from '@/lib/kinds';
import Breakdown from '@/components/Breakdown';
import RunInfo from '@/components/RunInfo';
import ScriptView from '@/components/ScriptView';

interface CardViewProps {
  card: Card;
  onBack: () => void;
  onHome: () => void;
  onPrev: (() => void) | null;
  onNext: (() => void) | null;
  onOpenRef: (slug: string) => void;
}

/** Какие типы частей встречаются в карточке, чтобы легенда не показывала лишнего. */
function usedKinds(card: Card) {
  const seen = new Set<string>();
  const walk = (parts?: { k: string; sub?: unknown[] }[]) =>
    parts?.forEach((p) => {
      seen.add(p.k);
      walk(p.sub as typeof parts);
    });
  card.examples.forEach((e) => walk(e.parts));
  card.script?.lines.forEach((l) => walk(l.parts));
  return KIND_ORDER.filter((k) => seen.has(k));
}

const CardView = ({ card, onBack, onHome, onPrev, onNext, onOpenRef }: CardViewProps) => {
  const kinds = usedKinds(card);
  return (
    <div className="animate-fade-in">
      <div className="flex items-center gap-2 mb-6 flex-wrap">
        <button
          onClick={onHome}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors"
          title="На главную (Escape дважды)"
        >
          <Home className="w-4 h-4" />
          Главная
        </button>
        <span className="text-muted-foreground">/</span>
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors"
          title="К списку команд (Backspace)"
        >
          <ArrowLeft className="w-4 h-4" />
          {shortCat(card.category)}
        </button>
        <span className="text-muted-foreground">/</span>
        <span className="text-xs font-mono text-primary font-semibold bg-primary/10 px-2 py-0.5 rounded-md border border-primary/20">
          №{card.num}
        </span>
      </div>

      <h2 className="text-2xl sm:text-3xl font-bold tracking-tight leading-snug mb-6 pb-5 border-b-2 border-border">
        {card.text}
      </h2>

      <div
        className="answer-content text-secondary-foreground leading-relaxed mb-8"
        dangerouslySetInnerHTML={{ __html: card.summary }}
      />

      {kinds.length > 0 && (
        <div className="mb-6 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs">
          <span className="text-muted-foreground">Цвета частей</span>
          {kinds.map((k) => (
            <span key={k} className="inline-flex items-center gap-1.5">
              <code className={`px-1.5 py-0.5 rounded bg-zinc-900 font-mono ${KINDS[k].text}`}>Aa</code>
              <span className="text-muted-foreground">{KINDS[k].label}</span>
            </span>
          ))}
          <span className="text-muted-foreground w-full sm:w-auto">
            Наведите на часть или нажмите на неё, чтобы увидеть пояснение.
          </span>
        </div>
      )}

      <div className="space-y-10">
        {card.examples.map((e, i) => (
          <section key={i} className="space-y-3">
            <h3 className="text-base font-semibold leading-snug">
              {card.examples.length > 1 && (
                <span className="font-mono text-xs text-primary mr-2">Пример {i + 1}</span>
              )}
              {e.d}
            </h3>
            <Breakdown line={e.line} parts={e.parts} onOpenRef={onOpenRef} />
            <RunInfo run={e.run} setup={e.setup} output={e.output} />
          </section>
        ))}

        {card.script && <ScriptView script={card.script} onOpenRef={onOpenRef} />}
      </div>

      {card.mistakes.length > 0 && (
        <div className="mt-10 rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3">
          <h3 className="text-sm font-semibold text-amber-600 dark:text-amber-400 mb-2">Частые ошибки</h3>
          <div className="answer-content text-sm text-secondary-foreground">
            {card.mistakes.map((m, i) => (
              <div key={i} dangerouslySetInnerHTML={{ __html: m }} />
            ))}
          </div>
        </div>
      )}

      {card.sources.length > 0 && (
        <div className="mt-8 pt-5 border-t border-border">
          <h3 className="text-sm font-semibold text-muted-foreground mb-2">Источники</h3>
          <ul className="space-y-1.5 text-sm">
            {card.sources.map((url) => (
              <li key={url} className="break-all">
                <a href={url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                  {url}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex items-center justify-between mt-12 pt-6 border-t border-border gap-2 flex-wrap">
        {onPrev ? (
          <button
            onClick={onPrev}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border bg-card text-sm text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all"
            title="Предыдущая команда (←)"
          >
            <ChevronLeft className="w-4 h-4" />
            Назад
          </button>
        ) : (
          <div />
        )}
        {onNext ? (
          <button
            onClick={onNext}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border bg-card text-sm text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all"
            title="Следующая команда (→)"
          >
            Далее
            <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <div />
        )}
      </div>
    </div>
  );
};

export default CardView;
