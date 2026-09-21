/**
 * Синонимы для поиска по командам Linux.
 *
 * Ключ, слово, которое человек набирает (часто по-русски или «как слышит»),
 * значение, термины, по которым искать дальше. Транслит (грэп → grep, тар → tar)
 * делает translit.ts автоматически, сюда попадает только то, что транслитом
 * не получается: русские названия задач и непохожие на слух имена команд.
 *
 * ВСЕ ключи lowercase.
 */
const SYNONYM_MAP: Record<string, string[]> = {
  // Имена команд, которые транслит не восстанавливает
  'аук': ['awk'],
  'авк': ['awk'],
  'сисктл': ['systemctl'],
  'системктл': ['systemctl'],
  'журналктл': ['journalctl'],
  'джорналктл': ['journalctl'],
  'чмод': ['chmod'],
  'чоун': ['chown'],
  'чаун': ['chown'],
  'кронтаб': ['crontab', 'cron'],
  'иксаргс': ['xargs'],
  'лс': ['ls'],
  'цд': ['cd'],
  'кд': ['cd'],
  'пвд': ['pwd'],
  'дф': ['df'],
  'ду': ['du'],
  'пс': ['ps'],
  'апт': ['apt'],
  'юфв': ['ufw'],
  'айпи': ['ip'],
  'ссх': ['ssh'],
  'эсэсаш': ['ssh'],
  'рсинк': ['rsync'],
  'курл': ['curl'],
  'керл': ['curl'],
  'джейкью': ['jq'],
  'баш': ['bash'],

  // Задачи по-русски
  'найти': ['find', 'grep', 'поиск', 'locate'],
  'поиск': ['find', 'grep', 'найти'],
  'искать': ['find', 'grep'],
  'файл': ['файл', 'file', 'find', 'ls', 'cp', 'mv'],
  'файлы': ['файл', 'find', 'ls'],
  'папка': ['каталог', 'mkdir', 'cd', 'ls', 'directory'],
  'каталог': ['каталог', 'mkdir', 'cd', 'ls', 'directory'],
  'копировать': ['cp', 'rsync', 'scp', 'копировать'],
  'скопировать': ['cp', 'rsync', 'scp'],
  'переместить': ['mv'],
  'переименовать': ['mv', 'rename'],
  'удалить': ['rm', 'rmdir', 'удалить', 'delete'],
  'ссылка': ['ln', 'ссылка', 'symlink'],
  'права': ['chmod', 'chown', 'права', 'permission', 'rwx', 'umask'],
  'доступ': ['chmod', 'chown', 'permission', 'права'],
  'владелец': ['chown', 'владелец', 'owner'],
  'пользователь': ['useradd', 'usermod', 'пользователь', 'user', 'passwd'],
  'пользователя': ['useradd', 'usermod', 'пользователь', 'user'],
  'группа': ['groupadd', 'usermod', 'группа', 'group'],
  'пароль': ['passwd', 'пароль', 'chage', 'shadow'],
  'процесс': ['ps', 'kill', 'top', 'процесс', 'pid'],
  'процессы': ['ps', 'top', 'htop', 'процесс'],
  'убить': ['kill', 'pkill', 'killall', 'сигнал'],
  'завершить': ['kill', 'pkill', 'сигнал'],
  'память': ['free', 'память', 'memory', 'oom', 'swap'],
  'оперативка': ['free', 'память', 'memory'],
  'нагрузка': ['top', 'uptime', 'load average', 'нагрузка', 'vmstat'],
  'сервис': ['systemctl', 'сервис', 'service', 'unit', 'systemd'],
  'служба': ['systemctl', 'сервис', 'service', 'unit'],
  'логи': ['journalctl', 'лог', 'log', 'tail', '/var/log'],
  'лог': ['journalctl', 'лог', 'log', 'tail'],
  'журнал': ['journalctl', 'журнал', 'log'],
  'пакет': ['apt', 'dpkg', 'пакет', 'package'],
  'установить': ['apt', 'install', 'dpkg'],
  'диск': ['df', 'du', 'lsblk', 'диск', 'mount', 'fdisk'],
  'место': ['df', 'du', 'место', 'ncdu'],
  'монтировать': ['mount', 'fstab', 'монтировать'],
  'раздел': ['fdisk', 'parted', 'lsblk', 'раздел', 'partition'],
  'сеть': ['ip', 'ss', 'ping', 'сеть', 'network', 'curl'],
  'порт': ['ss', 'nc', 'порт', 'port', 'lsof', 'ufw'],
  'порты': ['ss', 'порт', 'port'],
  'адрес': ['ip', 'адрес', 'address', 'hostname'],
  'маршрут': ['ip route', 'traceroute', 'маршрут', 'route'],
  'днс': ['dns', 'dig', 'nslookup', 'resolv'],
  'фаервол': ['ufw', 'iptables', 'firewall', 'фаервол'],
  'файрвол': ['ufw', 'iptables', 'firewall'],
  'ключ': ['ssh-keygen', 'ключ', 'key', 'ssh'],
  'туннель': ['ssh', 'туннель', 'tunnel', '-l'],
  'архив': ['tar', 'zip', 'архив', 'gzip', 'xz'],
  'распаковать': ['tar', 'unzip', 'gunzip', 'распаковать'],
  'сжать': ['gzip', 'xz', 'zip', 'tar', 'сжать'],
  'расписание': ['cron', 'crontab', 'at', 'timer', 'расписание'],
  'планировщик': ['cron', 'crontab', 'at', 'timer'],
  'скрипт': ['bash', 'скрипт', 'script', '#!'],
  'цикл': ['for', 'while', 'until', 'цикл'],
  'условие': ['if', 'case', 'test', 'условие', '[['],
  'функция': ['function', 'функция', 'local'],
  'переменная': ['переменная', '$', 'var', 'export'],
  'замена': ['sed', 'tr', 'замена', 's/'],
  'заменить': ['sed', 'tr', 'замена'],
  'сортировка': ['sort', 'uniq'],
  'сортировать': ['sort', 'uniq'],
  'посчитать': ['wc', 'uniq -c', 'awk'],
  'строки': ['wc', 'head', 'tail', 'sed', 'awk', 'строка'],
  'колонка': ['awk', 'cut', 'column', 'колонка', 'поле'],
  'сравнить': ['diff', 'cmp', 'сравнить'],
  'перенаправление': ['>', '>>', '2>', 'перенаправление', 'redirect'],
  'конвейер': ['|', 'pipe', 'конвейер'],
  'пайп': ['|', 'pipe', 'конвейер'],
  'время': ['date', 'timedatectl', 'time', 'время'],
  'дата': ['date', 'дата'],
};

/**
 * Расширяет список терминов синонимами.
 * Например: ['архив'] → ['архив', 'tar', 'zip', 'gzip', 'xz'].
 */
export function expandWithSynonyms(terms: string[]): string[] {
  const expanded = new Set<string>();
  for (const t of terms) {
    expanded.add(t);
    for (const s of SYNONYM_MAP[t] ?? []) expanded.add(s.toLowerCase());
  }
  return Array.from(expanded);
}
