#!/usr/bin/env node
/**
 * Заполняет поле output реальным выводом команд.
 *
 * Каждый пример и скрипт с run: "container" запускается в своём свежем
 * контейнере linuxqa-lab (lab/Dockerfile, Ubuntu 24.04), чтобы примеры не
 * влияли друг на друга. Сначала setup (его вывод скрыт), потом сама строка,
 * stdout и stderr вместе, как их увидит человек в терминале.
 *
 * Результат пишется обратно в content/NN-*.json, отчёт в _reports/run.md:
 * какие примеры завершились с ошибкой или ничего не вывели, их надо глянуть.
 *
 * Запуск: node scripts/run-examples.mjs [--only NN] [--jobs 6]
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTENT = path.join(ROOT, 'content');
const REPORT = path.join(ROOT, '_reports/run.md');
const arg = (name, dflt) => (process.argv.includes(name) ? process.argv[process.argv.indexOf(name) + 1] : dflt);
const ONLY = arg('--only', null);
const JOBS = Number(arg('--jobs', 6));
const IMAGE = 'linuxqa-lab';
const TIMEOUT_S = 25;
const MAX_LINES = 40;
const MAX_CHARS = 3000;

const b64 = (s) => Buffer.from(s, 'utf8').toString('base64');

/**
 * Собирает текст, который получит на вход оболочка bash в контейнере.
 *
 * Строки подаются bash на stdin, как при наборе в терминале: процесс 1 в
 * контейнере это сам bash, и `ps` не показывает служебных процессов стенда.
 * `exec 2>&1` сводит оба потока в один, как на экране терминала, иначе
 * docker отдаёт их раздельно и порядок строк перемешивается.
 * Подготовка (setup) и запись скрипта идут через eval в той же первой строке,
 * что и команда, с подавленным выводом. Поэтому ошибка в команде выглядит
 * как `bash: line 1: ...`, без сдвига номера строки от подготовки.
 */
function program({ setup, line, script }) {
  let prep = setup.trim() ? `eval "$(printf %s ${b64(setup)} | base64 -d)"` : ':';
  let run = line;
  if (script) {
    // Скрипт кладётся в /lab и запускается как ./имя, так же, как его запустит человек.
    const body = script.lines.map((l) => l.line).join('\n') + '\n';
    prep += `; printf %s ${b64(body)} | base64 -d > ${script.name}; chmod +x ${script.name}`;
    run = `./${script.name} ${script.args ?? ''}`.trim();
  }
  return `exec 2>&1; cd /lab; { ${prep}; } >/dev/null 2>&1; ${run}\n`;
}

let seq = 0;

function runOne(job) {
  const name = `linuxqa-run-${process.pid}-${seq++}`;
  const args = ['run', '-i', '--rm', '--name', name, '--hostname', 'lab', '-e', 'TERM=xterm', '-e', 'COLUMNS=100', IMAGE, 'bash'];
  return new Promise((resolve) => {
    const child = spawn('docker', args);
    let out = '';
    let timedOut = false;
    child.stdout.on('data', (d) => (out += d));
    child.stderr.on('data', (d) => (out += d));
    const killer = setTimeout(() => {
      timedOut = true;
      spawn('docker', ['kill', name]);
    }, TIMEOUT_S * 1000);
    child.on('close', (code) => {
      clearTimeout(killer);
      resolve({ code: timedOut ? 'таймаут' : code, text: out });
    });
    child.stdin.end(program(job));
  });
}

/** Обрезает длинный вывод, чтобы карточка не превращалась в простыню. */
function trimOutput(text) {
  let t = text.replace(/\r/g, '').replace(/\s+$/, '');
  const lines = t.split('\n');
  let cut = false;
  if (lines.length > MAX_LINES) {
    t = lines.slice(0, MAX_LINES).join('\n');
    cut = true;
  }
  if (t.length > MAX_CHARS) {
    t = t.slice(0, MAX_CHARS).replace(/\n[^\n]*$/, '');
    cut = true;
  }
  return cut ? `${t}\n… (вывод обрезан)` : t;
}

const files = fs
  .readdirSync(CONTENT)
  .filter((f) => /^\d{2}-.+\.json$/.test(f))
  .filter((f) => !ONLY || f.startsWith(`${ONLY}-`))
  .sort();

const sections = files.map((f) => ({ file: f, data: JSON.parse(fs.readFileSync(path.join(CONTENT, f), 'utf8')) }));
const jobs = [];
for (const s of sections) {
  for (const c of s.data.cards) {
    c.examples?.forEach((e, i) => {
      if (e.run === 'container') jobs.push({ where: `${s.file} ${c.slug} пример ${i + 1}`, target: e, setup: e.setup, line: e.line });
      else e.output = '';
    });
    if (c.script) {
      if (c.script.run === 'container') jobs.push({ where: `${s.file} ${c.slug} скрипт`, target: c.script, setup: c.script.setup, script: c.script });
      else c.script.output = '';
    }
  }
}

console.log(`запусков: ${jobs.length}, параллельно ${JOBS}`);
const problems = [];
let done = 0;
const queue = [...jobs];
await Promise.all(
  Array.from({ length: JOBS }, async () => {
    for (let job = queue.shift(); job; job = queue.shift()) {
      const { code, text } = await runOne(job);
      job.target.output = trimOutput(text);
      if (code !== 0) problems.push(`- ${job.where}, код ${code}: \`${(text.trim().split('\n').pop() ?? '').slice(0, 160)}\``);
      else if (!job.target.output) problems.push(`- ${job.where}, пустой вывод`);
      if (++done % 25 === 0) console.log(`  ${done}/${jobs.length}`);
    }
  }),
);

for (const s of sections) fs.writeFileSync(path.join(CONTENT, s.file), JSON.stringify(s.data, null, 1) + '\n');

fs.mkdirSync(path.dirname(REPORT), { recursive: true });
problems.sort();
fs.writeFileSync(
  REPORT,
  `# Прогон примеров в контейнере\n\nЗапусков ${jobs.length}. Ненулевой код или пустой вывод у ${problems.length}.\n` +
    `Ненулевой код бывает нормой (grep без совпадений, diff с различиями), каждый случай надо глянуть глазами.\n\n${problems.join('\n')}\n`,
);
console.log(`готово: ${jobs.length} запусков, к проверке ${problems.length}, отчёт ${path.relative(ROOT, REPORT)}`);
