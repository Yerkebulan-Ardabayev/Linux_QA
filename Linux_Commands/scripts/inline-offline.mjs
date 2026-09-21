// Вклеивает JS и CSS офлайн-сборки в index.html и кладёт результат рядом с проектом.
// Chrome не грузит <script type="module" src> по file://, а inline-модуль грузит.
import fs from "node:fs";
import path from "node:path";

const dist = path.resolve("dist-offline");
let html = fs.readFileSync(path.join(dist, "index.html"), "utf8");
const read = (ref) => fs.readFileSync(path.join(dist, ref.replace(/^\.\//, "")), "utf8");

html = html.replace(/<script type="module" crossorigin src="([^"]+)"><\/script>/g, (_, src) =>
  `<script type="module">${read(src).replace(/<\/script/gi, "<\\/script")}</script>`);
html = html.replace(/<link rel="stylesheet" crossorigin href="([^"]+)">/g, (_, href) => `<style>${read(href)}</style>`);
if (/src="\.\/assets|href="\.\/assets/.test(html)) throw new Error("остались внешние ссылки на assets");

const out = path.resolve("..", "Linux_QA_offline.html");
fs.writeFileSync(out, html);
console.log(`готово: ${out} (${(html.length / 1e6).toFixed(1)} МБ)`);
