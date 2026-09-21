import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { Search, X } from 'lucide-react';
import { type Card, type LinuxData, buildSearchTerms, searchCards, shortCat } from '@/lib/linux-data';
import Highlighted from '@/components/Highlighted';

interface SearchCommandProps {
  open: boolean;
  onClose: () => void;
  data: LinuxData;
  onSelect: (card: Card) => void;
}

const SearchCommand = ({ open, onClose, data, onSelect }: SearchCommandProps) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Card[]>([]);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (open) {
      setQuery('');
      setResults([]);
      setSelectedIdx(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // ====== INSTANT SEARCH ======
  useEffect(() => {
    const q = query.trim();
    if (q.length > 0) {
      setResults(searchCards(data, q).slice(0, 20));
      setSelectedIdx(0);
    } else {
      setResults([]);
    }
  }, [query, data]);

  // ====== KEYBOARD ======
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIdx(i => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIdx(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && results[selectedIdx]) {
      onSelect(results[selectedIdx]);
      onClose();
    } else if (e.key === 'Escape') {
      onClose();
    }
  }, [results, selectedIdx, onSelect, onClose]);

  useEffect(() => {
    const el = listRef.current?.children[selectedIdx] as HTMLElement;
    el?.scrollIntoView({ block: 'nearest' });
  }, [selectedIdx]);

  // Термины для подсветки — ровно те, по которым сработало ранжирование.
  const highlightTerms = useMemo(() => buildSearchTerms(query).all, [query]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] animate-fade-in" onClick={onClose}>
      <div className="absolute inset-0 bg-background/70 backdrop-blur-sm" />
      <div className="relative max-w-2xl mx-auto mt-[12vh] px-4" onClick={e => e.stopPropagation()}>
        <div className="bg-card border border-border rounded-xl shadow-2xl overflow-hidden animate-slide-up">

          {/* Input row */}
          <div className="flex items-center gap-2 px-4 border-b border-border">
            <Search className="w-5 h-5 text-muted-foreground shrink-0" />

            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Команда или задача, например «грэп рекурсивно» или 2>&1"
              className="flex-1 py-4 bg-transparent text-foreground placeholder:text-muted-foreground outline-none text-base"
            />

            {query.length > 0 && (
              <button onClick={() => setQuery('')} type="button"
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
                title="Очистить">
                <X className="w-4 h-4" />
              </button>
            )}

            <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded-lg hover:bg-muted">
              <kbd className="text-[10px] font-mono">Esc</kbd>
            </button>
          </div>

          {/* Results */}
          <div ref={listRef} className="max-h-[55vh] overflow-y-auto">
            {query.trim().length > 0 && results.length === 0 && (
              <div className="p-6 text-center text-muted-foreground text-sm">Ничего не найдено</div>
            )}
            {results.map((q, idx) => (
              <button
                key={q.id}
                onClick={() => { onSelect(q); onClose(); }}
                className={`w-full text-left px-4 py-3 flex items-start gap-3 transition-colors ${
                  idx === selectedIdx ? 'bg-primary/10 text-foreground' : 'hover:bg-muted text-foreground'
                }`}
              >
                <code className="font-mono text-xs text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5 shrink-0 w-20 truncate">{q.cmd}</code>
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">
                    <Highlighted text={q.text} terms={highlightTerms} />
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    <Highlighted text={shortCat(q.category)} terms={highlightTerms} />
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Footer */}
          <div className="px-4 py-1.5 border-t border-border flex items-center gap-3 text-[10px] text-muted-foreground font-mono">
            <span><kbd className="px-1 py-0.5 bg-muted rounded border border-border">↑↓</kbd> выбор</span>
            <span><kbd className="px-1 py-0.5 bg-muted rounded border border-border">Enter</kbd> открыть</span>
            <span className="ml-auto">понимает кириллицу, «тар» найдёт tar</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SearchCommand;
