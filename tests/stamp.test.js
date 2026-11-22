import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stamp } from '../scripts/stamp-build.mjs';

test('stamp writes the short commit and the date into the build tag', () => {
  const html = '<meta name="build" content="dev">';
  assert.equal(stamp(html, '0123456789abcdef', '2026-11-22'), '<meta name="build" content="0123456 2026-11-22">');
});

test('index.html has the build placeholder the stamp replaces', () => {
  assert.match(readFileSync(new URL('../index.html', import.meta.url), 'utf8'), /<meta name="build" content="dev">/);
});
