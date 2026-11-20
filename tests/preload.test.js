// index.html preloads every module so the browser fetches them in one round trip, not one per
// import level. A module added to js/ without a preload, or a preload left for a deleted file, fails here.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const preloaded = [...html.matchAll(/<link rel="modulepreload" href="js\/([\w-]+\.js)">/g)].map((m) => m[1]).sort();
const modules = readdirSync(new URL('../js/', import.meta.url)).filter((f) => f.endsWith('.js') && f !== 'main.js').sort();

test('index.html preloads exactly the modules main.js imports', () => {
  assert.deepEqual(preloaded, modules);
});
