/**
 * Verifies every locale has every key of the English base (plural keys may be written
 * either as the plain key or with CLDR suffixes) and uses the same {{placeholders}}.
 * Run: npm run check:i18n
 */
import { resources } from '../src/i18n/resources';

type Tree = { [k: string]: string | Tree };
const SUFFIX = /_(zero|one|two|few|many|other)$/;

function flatten(t: Tree, prefix = ''): Map<string, string> {
  const out = new Map<string, string>();
  for (const [k, v] of Object.entries(t)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (typeof v === 'string') out.set(key, v);
    else for (const [kk, vv] of flatten(v, key)) out.set(kk, vv);
  }
  return out;
}

const vars = (s: string) => [...new Set([...s.matchAll(/{{\s*(\w+)\s*}}/g)].map((m) => m[1]))].filter((v) => v !== 'count').sort().join(',');
const base = flatten(resources.en as unknown as Tree);
const baseKeys = new Set([...base.keys()].map((k) => k.replace(SUFFIX, '')));
let failed = false;

for (const [lng, tree] of Object.entries(resources)) {
  if (lng === 'en') continue;
  const loc = flatten(tree as unknown as Tree);
  const byBase = new Map<string, string[]>();
  for (const [k, v] of loc) byBase.set(k.replace(SUFFIX, ''), [...(byBase.get(k.replace(SUFFIX, '')) ?? []), v]);
  for (const key of baseKeys) {
    const values = byBase.get(key);
    if (!values) {
      console.error(`[${lng}] missing: ${key}`);
      failed = true;
      continue;
    }
    const enValue = base.get(key) ?? base.get(`${key}_other`)!;
    for (const v of values) {
      if (vars(v) !== vars(enValue)) {
        console.error(`[${lng}] placeholder mismatch in ${key}: "${v}"`);
        failed = true;
      }
    }
  }
  for (const key of byBase.keys()) {
    if (!baseKeys.has(key)) {
      console.error(`[${lng}] unknown key: ${key}`);
      failed = true;
    }
  }
}

if (failed) process.exit(1);
console.log(`i18n OK: ${Object.keys(resources).length} languages x ${baseKeys.size} keys`);
