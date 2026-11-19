import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { VERSION } from '../js/version.js';

const changelog = readFileSync(new URL('../CHANGELOG.md', import.meta.url), 'utf8');

test('version is a semantic version', () => {
  assert.match(VERSION, /^\d+\.\d+\.\d+$/);
});

test('version matches the newest CHANGELOG heading', () => {
  const heading = /^## \[?(\d+\.\d+\.\d+)\]?/m.exec(changelog);
  assert.ok(heading, 'CHANGELOG.md has no "## x.y.z" heading');
  assert.equal(heading[1], VERSION, `js/version.js says ${VERSION}, CHANGELOG.md says ${heading[1]}`);
});
