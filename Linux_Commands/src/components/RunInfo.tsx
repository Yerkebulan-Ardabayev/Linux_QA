import { AlertTriangle, Server, TerminalSquare } from 'lucide-react';
import type { RunMode } from '@/lib/linux-data';

interface RunInfoProps {
  run: RunMode;
  setup: string;
  output: string;
}

/**
 * Что будет при запуске. Вывод на сайте только настоящий, снятый скриптом
 * scripts/run-examples.mjs в контейнере Ubuntu 24.04. Для примеров, которые
 * в контейнере не запустить, прямо сказано, почему вывода нет.
 */
const RunInfo = ({ run, setup, output }: RunInfoProps) => {
  if (run === 'danger') {
    return (
      <div className="flex gap-2 items-start rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-sm text-red-600 dark:text-red-400">
        <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
        <span>
          Команда меняет или стирает данные в системе. Запускайте только на учебной ВМ и только понимая, что делает каждая часть.
          Вывод не показан, пример не запускался.
        </span>
      </div>
    );
  }
  if (run === 'system') {
    return (
      <div className="flex gap-2 items-start rounded-lg border border-border bg-muted/40 px-3 py-2.5 text-sm text-muted-foreground">
        <Server className="w-4 h-4 mt-0.5 shrink-0" />
        <span>Нужен настоящий сервер (systemd, сеть, диски или другая машина), поэтому вывод здесь не показан. Запустите на своей ВМ.</span>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {setup.trim() && (
        <details className="group rounded-lg border border-border bg-muted/30">
          <summary className="cursor-pointer select-none px-3 py-2 text-xs text-muted-foreground hover:text-foreground">
            Подготовка, чтобы повторить пример у себя
          </summary>
          <pre className="px-3 pb-3 text-xs font-mono whitespace-pre-wrap break-all text-secondary-foreground">{setup}</pre>
        </details>
      )}
      {output ? (
        <div className="rounded-lg border border-border overflow-hidden">
          <div className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] text-muted-foreground bg-muted/50 border-b border-border">
            <TerminalSquare className="w-3.5 h-3.5" />
            Вывод, реальный запуск в Ubuntu 24.04
          </div>
          <pre className="bg-zinc-950 text-zinc-300 font-mono text-[13px] leading-6 px-4 py-3 overflow-x-auto max-h-80">{output}</pre>
        </div>
      ) : (
        <div className="text-xs text-muted-foreground px-1">Команда отработала без вывода на экран.</div>
      )}
    </div>
  );
};

export default RunInfo;
