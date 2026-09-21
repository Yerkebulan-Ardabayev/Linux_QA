import { ArrowLeft, ChevronRight } from 'lucide-react';
import { type Card, countLines, shortCat } from '@/lib/linux-data';
import { useState } from 'react';

interface CommandListProps {
  category: string;
  categoryIndex: number;
  cards: Card[];
  focusIdx?: number;
  onBack: () => void;
  onSelect: (card: Card) => void;
}

const CommandList = ({ category, categoryIndex, cards, focusIdx = -1, onBack, onSelect }: CommandListProps) => {
  const [filter, setFilter] = useState('');
  const f = filter.trim().toLowerCase();
  const filtered = f ? cards.filter((c) => c.text.toLowerCase().includes(f) || c.cmd.toLowerCase().includes(f)) : cards;

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Все разделы
          <kbd className="ml-2 px-1.5 py-0.5 text-[10px] font-mono bg-muted rounded border border-border">Backspace</kbd>
        </button>
        <div className="flex items-center gap-3 mb-2">
          <span className="font-mono text-xs text-primary font-bold bg-primary/10 px-2 py-1 rounded-md border border-primary/20">
            Раздел {categoryIndex + 1}
          </span>
          <span className="text-xs text-muted-foreground font-mono">{cards.length} карточек</span>
        </div>
        <h2 className="text-2xl font-bold tracking-tight">{shortCat(category)}</h2>
      </div>

      <div className="mb-6">
        <input
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Фильтр команд..."
          className="w-full px-4 py-3 rounded-lg bg-card border border-border text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/20 transition-all text-sm"
        />
      </div>

      <div className="space-y-2">
        {filtered.map((c, idx) => {
          const isFocused = idx === focusIdx;
          const title = c.text.startsWith(`${c.cmd}:`) ? c.text.slice(c.cmd.length + 1).trim() : c.text;
          return (
            <button
              key={c.id}
              data-focus-idx={idx}
              onClick={() => onSelect(c)}
              className={`group w-full text-left flex items-center gap-3 px-4 py-3 rounded-lg bg-card border transition-all ${
                isFocused
                  ? 'border-primary ring-2 ring-primary/30 bg-primary/5 shadow-md'
                  : 'border-border hover:border-primary/30 hover:bg-primary/5'
              }`}
            >
              <code className="font-mono text-sm text-emerald-600 dark:text-emerald-400 font-semibold shrink-0 min-w-[5.5rem] max-w-[40%] truncate">
                {c.cmd}
              </code>
              <span
                className={`text-sm flex-1 min-w-0 transition-colors ${
                  isFocused ? 'text-primary' : 'text-foreground group-hover:text-primary'
                }`}
              >
                {title}
              </span>
              <span className="hidden sm:inline text-[11px] text-muted-foreground font-mono shrink-0">
                {countLines(c)} стр.
              </span>
              <ChevronRight
                className={`w-4 h-4 shrink-0 transition-all ${
                  isFocused ? 'text-primary translate-x-0.5' : 'text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5'
                }`}
              />
            </button>
          );
        })}
        {filtered.length === 0 && <div className="text-center py-12 text-muted-foreground text-sm">Команды не найдены</div>}
      </div>
    </div>
  );
};

export default CommandList;
