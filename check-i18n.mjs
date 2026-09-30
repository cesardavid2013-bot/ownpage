// Verifies every landing-page language has all keys used in index.html. Run: node website/check-i18n.mjs
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const ctx = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(dir, 'i18n.js'), 'utf8'), ctx);
const dict = ctx.window.LUMI_I18N;
const langs = ctx.window.LUMI_LANGS.map((l) => l[0]);
const html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
const used = new Set([...html.matchAll(/data-i18n(?:-html)?="([^"]+)"/g)].map((m) => m[1]));
['store.apple', 'store.google', 'store.web', 'store.webBig', 'store.soon'].forEach((k) => used.add(k));

let failed = false;
for (const lang of langs) {
  if (!dict[lang]) { console.error(`missing language: ${lang}`); failed = true; continue; }
  for (const key of used) {
    if (!dict[lang][key]) { console.error(`[${lang}] missing: ${key}`); failed = true; }
  }
  for (const key of Object.keys(dict[lang])) {
    if (!used.has(key)) { console.error(`[${lang}] unused key: ${key}`); failed = true; }
  }
}
if (failed) process.exit(1);
console.log(`website i18n OK: ${langs.length} languages x ${used.size} keys`);
