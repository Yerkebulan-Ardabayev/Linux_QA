# Сравнение с github.com/justxor/linux-

Дата: 12.10.2026. Сравнивался коммит `dacdbda` (ветка main), в репозитории один README на 150 КБ и одна картинка-постер.

## Как использован чужой репозиторий

Взят только список тем. Текст карточек написан заново по man-страницам Ubuntu 24.04, как требует `content/SCHEMA.md`. Лицензия MIT в чужом README заявлена текстом, файла LICENSE нет, поэтому текст и схемы не копировались. Схемы нарисованы заново по смыслу.

Картинок, кроме постера, в репозитории нет. «Наглядные картинки», о которых пишет README, лежат в Telegram-каналах автора, не в репозитории.

## Что добавлено

Было 14 разделов и 267 карточек, стало 18 разделов и 375 карточек (+108).

| Раздел | Новые карточки |
|---|---|
| 02 Навигация и файлы | pushd/popd, locate/updatedb, truncate, fallocate, dd, split |
| 03 Текст | cmp, strings, xxd, zcat/zgrep, numfmt, sed -n диапазон, xargs -P |
| 04 Права | who, w, newgrp, adduser |
| 05 Процессы | disown, timeout, flock, wait, tmux |
| 06 systemd | loginctl, systemd-cgls/cgtop, systemd-run, systemctl --user, shutdown/reboot |
| 08 Диски | findmnt, losetup, resize2fs, tune2fs, growpart, pvs/vgs/lvs, vgextend, mdadm, smartctl, sync |
| 09 Сеть | tcpdump, mtr, ethtool, iperf3, nft, ip netns, dig +trace |
| 10 SSH | ssh -J (бастион), ssh -D (SOCKS) |
| 12 Планировщик | logrotate |
| 15 Справка и окружение оболочки (новый) | анатомия команды, man, apropos/whatis, help, type, which, alias, history, source, env/export, PATH, vim, nano |
| 16 Ядро, железо и загрузка (новый) | uname, lscpu/nproc, lspci/lsusb, dmidecode, dmesg, sysctl, sysctl.d, /proc/sys, lsmod/modinfo, modprobe, blacklist, cmdline и GRUB, default.target, ulimit, lsns, unshare, nsenter, chroot, PSI |
| 17 Производительность и трассировка (новый) | iostat, mpstat, pidstat, sar, pmap, slabtop, /proc/meminfo, ltrace, perf, iotop-c, bpftrace, bpfcc-tools, скрипт «первые 60 секунд» |
| 18 Безопасность и защита сервера (новый) | sshd -t/-T, fail2ban-client, jail.local, unattended-upgrades, aa-status, aa-complain/enforce, auditctl, ausearch/aureport, lynis, аудит SUID, getcap/setcap, sha256sum, gpg, last/lastb, openssl rand, openssl x509 |

## Вторая очередь, 13.10.2026

Теория и вопросы с собеседований сделаны в том же формате карточек, стало 20 разделов и 412 карточек.

- 19 «Как устроен Linux», 12 карточек теории, у каждой схема: системный вызов, «всё есть файл», каталог как таблица inode, UID и проверка прав, fork и exec, файловые дескрипторы, порядок раскрытий bash, память, монтирование, пакеты и репозитории, путь сетевого запроса, каталоги FHS.
- 20 «Вопросы с собеседований», 25 вопросов. 11 из шпаргалки и 14 частых стандартных. Ответ в summary, проверка командой в примерах, типичные неверные ответы в mistakes.
- Ссылки на documentation.ubuntu.com во всём корпусе заменены на ubuntu.com/server/docs, старый адрес отвечает редиректом 301.

## Схемы (новое поле `diagram`)

Слои системы (uname), цепочка загрузки (default.target), анатомия команды, поиск команды оболочкой (type), режимы vim, потоки 0/1/2 и `2>&1`, inode и ссылки (ln), строка прав `ls -l`, поля cron, LVM (PV, VG, LV), SSH-ключи (ssh-copy-id), путь через бастион (ssh -J).

## Что не взято и почему

- dnf, yum, rpm, pacman, zypper, apk, firewalld, SELinux, grub2-mkconfig. Проект только про Ubuntu (spec.md, раздел 6).
- Docker и Podman, Dockerfile. Это отдельный продукт, не команды Linux. Устройство контейнеров покрыто карточками lsns, unshare, nsenter, chroot.
- nginx, certbot, Telegram-уведомления, бэкапы баз данных. Настройка стороннего ПО, не команды системы.
- Глоссарий, горячие клавиши, практикум с задачами. Это не формат «команда с разбором».
- Рекламные ссылки на Telegram-каналы.

## Как проверено

- `node scripts/build-corpus.mjs`: 18 разделов, 375 карточек, 1776 разобранных строк, ошибок нет.
- `npm test` (41 тест), `npm run lint`, `npm run build`, `npm run build:offline` проходят.
- Все 141 новый URL источников отвечают 200.
- Вывод новых примеров снят `run-examples.mjs --slugs` в стенде `linuxqa-lab`. Стенд на этой машине x86_64, старые выводы сняты на arm64 и не перезаписывались.
