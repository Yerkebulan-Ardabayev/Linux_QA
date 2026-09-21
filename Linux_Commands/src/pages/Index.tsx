import { useState, useCallback, useEffect, useMemo } from 'react';
import { useLinuxData } from '@/hooks/use-linux-data';
import { type Card, type LinuxData, getCardsForCategory } from '@/lib/linux-data';
import Header from '@/components/Header';
import SearchCommand from '@/components/SearchCommand';
import SectionCard from '@/components/SectionCard';
import CommandList from '@/components/CommandList';
import CardView from '@/components/CardView';
import { Loader2, Terminal } from 'lucide-react';

type View =
  | { type: 'home' }
  | { type: 'section'; index: number }
  | { type: 'card'; card: Card; sectionIndex: number };

/**
 * Экран определяется адресом: `#/s/3` раздел, `#/c/tar` карточка, пусто главная.
 * Так работают кнопка «назад» браузера и ссылка на конкретную команду, в том
 * числе в офлайн-файле, где другого адреса у страницы нет.
 */
function viewFromHash(data: LinuxData | null, hash: string): View {
  if (!data) return { type: 'home' };
  const sec = hash.match(/^#\/s\/(\d+)$/);
  if (sec) {
    const index = Number(sec[1]);
    if (index >= 0 && index < data.categories.length) return { type: 'section', index };
  }
  const card = hash.match(/^#\/c\/([a-z0-9-]+)$/);
  if (card) {
    const c = data.cards.find((x) => x.slug === card[1]);
    if (c) return { type: 'card', card: c, sectionIndex: Math.max(0, data.categories.indexOf(c.category)) };
  }
  return { type: 'home' };
}

function go(hash: string) {
  if (window.location.hash !== hash) window.location.hash = hash;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
const goHome = () => {
  if (window.location.hash) {
    history.pushState(null, '', window.location.pathname + window.location.search);
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  }
  window.scrollTo({ top: 0, behavior: 'smooth' });
};
const goSection = (i: number) => go(`#/s/${i}`);
const goCard = (slug: string) => go(`#/c/${slug}`);

const Index = () => {
  const { data, loading, error } = useLinuxData();
  const [hash, setHash] = useState(() => window.location.hash);
  const [searchOpen, setSearchOpen] = useState(false);
  const [focusIdx, setFocusIdx] = useState(0);

  useEffect(() => {
    const onHash = () => setHash(window.location.hash);
    window.addEventListener('hashchange', onHash);
    window.addEventListener('popstate', onHash);
    return () => {
      window.removeEventListener('hashchange', onHash);
      window.removeEventListener('popstate', onHash);
    };
  }, []);

  const view = useMemo(() => viewFromHash(data, hash), [data, hash]);
  const viewKey = view.type === 'section' ? `s${view.index}` : view.type === 'card' ? `c${view.card.slug}` : 'home';

  useEffect(() => {
    setFocusIdx(0);
  }, [viewKey]);

  const handleNavigateCard = useCallback(
    (direction: -1 | 1) => {
      if (!data || view.type !== 'card') return;
      const cards = getCardsForCategory(data, view.sectionIndex);
      const next = cards[cards.findIndex((c) => c.id === view.card.id) + direction];
      if (next) goCard(next.slug);
    },
    [data, view],
  );

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      const isInput = ['INPUT', 'TEXTAREA'].includes(tag);

      if (e.key === '/' && !isInput && !searchOpen) {
        e.preventDefault();
        setSearchOpen(true);
        return;
      }

      if (e.key === 'Escape') {
        if (searchOpen) setSearchOpen(false);
        else if (view.type === 'card') goSection(view.sectionIndex);
        else if (view.type === 'section') goHome();
        return;
      }

      if (isInput || searchOpen || !data) return;

      if (view.type === 'home') {
        const total = data.categories.length;
        const cols = window.innerWidth >= 1024 ? 3 : window.innerWidth >= 640 ? 2 : 1;
        const moves: Record<string, number> = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: cols, ArrowUp: -cols };
        if (e.key in moves) {
          e.preventDefault();
          setFocusIdx((i) => Math.min(Math.max(i + moves[e.key], 0), total - 1));
          return;
        }
        if (e.key === 'Enter') {
          e.preventDefault();
          goSection(focusIdx);
        }
        return;
      }

      if (view.type === 'section') {
        const cards = getCardsForCategory(data, view.index);
        if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
          e.preventDefault();
          setFocusIdx((i) => Math.min(i + 1, cards.length - 1));
        } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
          e.preventDefault();
          setFocusIdx((i) => Math.max(i - 1, 0));
        } else if (e.key === 'Enter' && cards[focusIdx]) {
          e.preventDefault();
          goCard(cards[focusIdx].slug);
        } else if (e.key === 'Backspace') {
          e.preventDefault();
          goHome();
        }
        return;
      }

      if (view.type === 'card') {
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          handleNavigateCard(-1);
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          handleNavigateCard(1);
        } else if (e.key === 'Backspace') {
          e.preventDefault();
          goSection(view.sectionIndex);
        }
      }
    };

    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [searchOpen, view, data, focusIdx, handleNavigateCard]);

  useEffect(() => {
    const el = document.querySelector(`[data-focus-idx="${focusIdx}"]`);
    el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [focusIdx]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto" />
          <p className="text-muted-foreground text-sm font-mono">Загрузка данных...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center space-y-2">
          <p className="text-destructive font-medium">Ошибка загрузки</p>
          <p className="text-muted-foreground text-sm">{error}</p>
        </div>
      </div>
    );
  }

  const totalLines = data.cards.reduce(
    (n, c) => n + c.examples.length + (c.script?.lines.filter((l) => l.line.trim()).length ?? 0),
    0,
  );

  return (
    <div className="min-h-screen bg-background">
      <Header total={data.cards.length} onSearchOpen={() => setSearchOpen(true)} onHome={goHome} />

      <SearchCommand
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        data={data}
        onSelect={(c) => goCard(c.slug)}
      />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {view.type === 'home' && (
          <div className="animate-fade-in">
            <div className="mb-10 sm:mb-14">
              <div className="flex items-center gap-2 mb-3">
                <Terminal className="w-5 h-5 text-primary" />
                <span className="font-mono text-xs text-primary font-semibold">
                  Ubuntu 24.04 · {data.categories.length} разделов
                </span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">
                Команды <span className="text-primary">Linux</span> по частям и по символам
              </h2>
              <p className="text-muted-foreground max-w-2xl leading-relaxed">
                {data.cards.length} карточек и {totalLines} разобранных строк. Каждая команда разложена на части, у каждой
                опции и каждого спецсимвола своё пояснение, скрипты разобраны построчно. Вывод показан настоящий, снятый
                запуском в Ubuntu 24.04. Нажмите{' '}
                <kbd className="px-1.5 py-0.5 text-xs font-mono bg-card rounded border border-border">/</kbd> для поиска,{' '}
                <kbd className="px-1.5 py-0.5 text-xs font-mono bg-card rounded border border-border">←↑↓→</kbd> и{' '}
                <kbd className="px-1.5 py-0.5 text-xs font-mono bg-card rounded border border-border">Enter</kbd> для
                навигации.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.categories.map((cat, idx) => (
                <SectionCard
                  key={idx}
                  index={idx}
                  category={cat}
                  count={getCardsForCategory(data, idx).length}
                  focused={idx === focusIdx}
                  dataFocusIdx={idx}
                  onClick={() => goSection(idx)}
                />
              ))}
            </div>
          </div>
        )}

        {view.type === 'section' && (
          <CommandList
            category={data.categories[view.index]}
            categoryIndex={view.index}
            cards={getCardsForCategory(data, view.index)}
            focusIdx={focusIdx}
            onBack={goHome}
            onSelect={(c) => goCard(c.slug)}
          />
        )}

        {view.type === 'card' &&
          (() => {
            const cards = getCardsForCategory(data, view.sectionIndex);
            const curIdx = cards.findIndex((c) => c.id === view.card.id);
            return (
              <CardView
                key={view.card.slug}
                card={view.card}
                onBack={() => goSection(view.sectionIndex)}
                onHome={goHome}
                onPrev={curIdx > 0 ? () => handleNavigateCard(-1) : null}
                onNext={curIdx < cards.length - 1 ? () => handleNavigateCard(1) : null}
                onOpenRef={goCard}
              />
            );
          })()}
      </main>
    </div>
  );
};

export default Index;
