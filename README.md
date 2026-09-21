# Linux Commands

Учебный сайт по командам Linux. Каждая команда разобрана по частям и по символам, скрипты bash разобраны построчно. Вывод команд настоящий, снят запуском в контейнере Ubuntu 24.04.

Движок взят из [Security_QA](https://github.com/Yerkebulan-Ardabayev/Security_QA) (поиск с транслитом, темы, клавиатура), содержимое и компоненты разбора свои.

## Как устроен проект

- `content/NN-*.json`, карточки команд, один файл на раздел. Формат и правила в `content/SCHEMA.md`. Правится только здесь.
- `scripts/build-corpus.mjs`, проверяет контент и собирает `Linux_Commands.html` (в корне и в `Linux_Commands/public/`). Главная проверка, части разбора покрывают строку команды целиком, без пропусков.
- `scripts/run-examples.mjs`, запускает каждый пример с `run: "container"` в свежем контейнере `linuxqa-lab` и записывает вывод в поле `output`. Отчёт `_reports/run.md`.
- `scripts/check-links.mjs`, проверяет, что ссылки на источники открываются и якоря вида `#Pipelines` есть на странице. Отчёт `_reports/links.md`.
- `lab/Dockerfile`, образ учебного стенда, Ubuntu 24.04 с нужными утилитами.
- `Linux_Commands/`, сайт на React и Vite.

## Разработка

```bash
docker build -t linuxqa-lab lab
node scripts/run-examples.mjs
node scripts/build-corpus.mjs
node scripts/check-links.mjs
cd Linux_Commands
npm ci
npm test
npm run lint
npm run build
npm run build:offline
```

`npm run build:offline` собирает `Linux_QA_offline.html`, один файл, который открывается из папки без сервера и интернета.
