#!/usr/bin/env node
/**
 * Nests the flat reason-key copy under STONECRAFT.REASONS and writes it into the
 * ngx-translate bundle for one language.
 *
 * Why a script and not a one-off hand conversion: `reason-keys.<lang>.json` is
 * authored flat, because a translator needs to see `reason.sign.taurus.sun` as
 * one line next to its neighbours to keep the register consistent. ngx-translate
 * reads a dot as a path separator, so `"reason.sign.taurus.sun"` at the top
 * level is unreachable — it has to become nested objects. That transform runs
 * every time the copy changes, which is exactly the case where a hand conversion
 * drifts.
 *
 *   pnpm i18n:reasons            all languages that have a source file
 *   pnpm i18n:reasons -- en      just one
 *
 * The source file is authored and reviewed by a person. This script only moves
 * it; it never writes a sentence, and it fails rather than filling a gap.
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const LANGS = ['en', 'ka', 'ru'];
const NAMESPACE = ['STONECRAFT', 'REASONS'];

const requested = process.argv.slice(2).filter((a) => !a.startsWith('-'));
const langs = requested.length > 0 ? requested : LANGS;

let wrote = 0;

for (const lang of langs) {
  const sourcePath = join(root, `reason-keys.${lang}.json`);
  const bundlePath = join(root, 'public', 'i18n', 'content', `${lang}.json`);

  if (!existsSync(sourcePath)) {
    // Not an error. ka and ru need a fluent author, not a translation pass, and
    // until that person has written them the file legitimately does not exist.
    // Emitting empty or English-filled entries would make the gap invisible.
    console.log(`skip  ${lang}  (no reason-keys.${lang}.json yet)`);
    continue;
  }

  if (!existsSync(bundlePath)) {
    console.error(`FAIL  ${lang}  no bundle at public/i18n/content/${lang}.json`);
    process.exitCode = 1;
    continue;
  }

  const source = JSON.parse(readFileSync(sourcePath, 'utf8'));
  const bundle = JSON.parse(readFileSync(bundlePath, 'utf8'));

  const declared = source._meta?.keyCount;
  const nested = {};
  let count = 0;

  for (const [key, entry] of Object.entries(source)) {
    if (key === '_meta') continue;

    if (typeof entry?.short !== 'string' || typeof entry?.long !== 'string') {
      console.error(`FAIL  ${lang}  "${key}" is missing short or long`);
      process.exitCode = 1;
      continue;
    }

    // The whole point: "reason.sign.taurus.sun" becomes four levels of object,
    // so ngx-translate's dot-path lookup resolves it.
    setPath(nested, key.split('.'), { short: entry.short, long: entry.long });
    count += 1;
  }

  if (typeof declared === 'number' && declared !== count) {
    console.error(`FAIL  ${lang}  _meta.keyCount says ${declared}, found ${count}`);
    process.exitCode = 1;
    continue;
  }

  if (process.exitCode === 1) continue;

  setPath(bundle, NAMESPACE, nested);
  writeFileSync(bundlePath, `${JSON.stringify(bundle, null, 2)}\n`, 'utf8');
  console.log(`ok    ${lang}  ${count} reason keys → STONECRAFT.REASONS`);
  wrote += 1;
}

if (wrote === 0 && process.exitCode !== 1) {
  console.error('FAIL  nothing written — no source file matched');
  process.exitCode = 1;
}

function setPath(target, path, value) {
  let node = target;
  for (const segment of path.slice(0, -1)) {
    if (typeof node[segment] !== 'object' || node[segment] === null) {
      node[segment] = {};
    }
    node = node[segment];
  }
  node[path.at(-1)] = value;
}
