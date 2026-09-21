import { Search, Terminal } from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';

interface HeaderProps {
  total: number;
  onSearchOpen: () => void;
  onHome: () => void;
}

const Header = ({ total, onSearchOpen, onHome }: HeaderProps) => (
  <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
    <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
      <button onClick={onHome} className="flex items-center gap-3" title="На главную">
        <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
          <Terminal className="w-5 h-5 text-primary" />
        </div>
        <h1 className="text-lg font-bold tracking-tight leading-none">
          Linux <span className="text-primary">Commands</span>
        </h1>
        <span className="text-xs font-mono font-semibold text-accent bg-accent/10 px-2 py-0.5 rounded-md border border-accent/20">
          {total}
        </span>
      </button>

      <div className="flex items-center gap-2">
        <ThemeToggle />
        <button
          onClick={onSearchOpen}
          className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all text-sm group"
          title="Поиск (/)"
        >
          <Search className="w-4 h-4 group-hover:text-primary transition-colors" />
          <span className="hidden sm:inline">Поиск</span>
          <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono bg-muted rounded border border-border">
            /
          </kbd>
        </button>
      </div>
    </div>
  </header>
);

export default Header;
