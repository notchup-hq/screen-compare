// Privacy guard: the page promises no cookies, no tracking, no requests to other origins and no
// forms, and browser storage only for screens the visitor asked to remember and the theme and
// language they picked. localStorage is allowed in exactly one file (js/memory.js, two keys);
// everything else about storage stays banned. This scans the shipped source
// for anything that would break that promise. It runs with `./dev test` and `./dev check`.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { basename, join } from 'node:path';

const root = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');

const MEMORY_FILE = 'js/memory.js';
const STORAGE_KEYS = ['screen-compare:v1', 'screen-compare:prefs'];

const FORBIDDEN = [
  /sessionStorage/i,
  /indexedDB/i,
  /document\.cookie/i,
  /document\[\s*['"]cookie['"]\s*\]/i,
  /cookieStore/i,
  /navigator\.storage/i,
  /\bcaches\./,
  /openDatabase/i,
  /window\.name\s*=/,
  /\bfetch\s*\(/,
  /XMLHttpRequest/,
  /sendBeacon/,
  /WebSocket/,
  /EventSource/,
  /<form\b/i,
  /<iframe\b/i,
  /@import/i,
  /(?:src|href)\s*=\s*["']?\/\//i, // protocol-relative URL
];

// URLs that are allowed because they are never requested by the page.
const ALLOWED_URLS = [
  /xmlns(?::\w+)?="https?:\/\/[^"]*"/g, // XML namespace names, not addresses
  /const SVG_NS = 'http:\/\/www\.w3\.org\/2000\/svg';/g,
];

// In index.html only: the page's own address (canonical, link previews, structured data) and the
// structured data's vocabulary and maker. Search engines and link previews read them; the page never does.
const ALLOWED_IN_HTML = [
  /https:\/\/screen-compare\.notchup\.fi\/[^"\s]*/g,
  /"@context": "https:\/\/schema\.org"/g,
  /"url": "https:\/\/notchup\.fi"/g,
];

/** Problems in one file's text, as "file:line: what". */
export function scan(file, text) {
  const name = basename(file);
  const problems = [];
  text.split('\n').forEach((raw, i) => {
    let line = ALLOWED_URLS.reduce((l, re) => l.replace(re, ''), raw);
    if (name === 'index.html') {
      line = line.replace(/<a\s[^>]*href="https?:\/\/[^"]*"/g, ''); // links the visitor may click
      line = ALLOWED_IN_HTML.reduce((l, re) => l.replace(re, ''), line);
    }
    if (name === 'screens.js') line = line.replace(/^\s*source:\s*'https?:\/\/[^']*',?/, ''); // spec page references
    for (const re of FORBIDDEN) {
      const m = re.exec(line);
      if (m) problems.push(`${file}:${i + 1}: ${m[0]}`);
    }
    // localStorage belongs to the remembered-screens module and nowhere else.
    const ls = /localStorage/i.exec(line);
    if (ls && file !== MEMORY_FILE) problems.push(`${file}:${i + 1}: ${ls[0]} outside ${MEMORY_FILE}`);
    const url = /https?:\/\/[^\s"')]*/.exec(line);
    if (url) problems.push(`${file}:${i + 1}: external URL ${url[0]}`);
  });
  return problems;
}

function shippedFiles() {
  const list = ['index.html', 'styles.css'];
  for (const dir of ['js', 'assets']) {
    for (const f of readdirSync(join(root, dir))) {
      if (/\.(js|svg|css|html)$/.test(f)) list.push(`${dir}/${f}`);
    }
  }
  return list;
}

test('shipped source has no storage, tracking, forms or third-party URLs', () => {
  const files = shippedFiles();
  assert.ok(files.length >= 10, 'expected to scan the whole site');
  const problems = files.flatMap((f) => scan(f, readFileSync(join(root, f), 'utf8')));
  assert.deepEqual(problems, []);
});

test('storage stays inside js/memory.js: one use of localStorage and two keys', () => {
  const text = readFileSync(join(root, MEMORY_FILE), 'utf8');
  assert.equal(text.match(/localStorage/g)?.length, 1, 'localStorage appears once, as the default storage');
  assert.deepEqual(text.match(/'screen-compare:[^']*'/g), STORAGE_KEYS.map((k) => `'${k}'`), 'each key is named once, as a constant');
  for (const f of shippedFiles()) {
    if (f === MEMORY_FILE || f.endsWith('.svg')) continue;
    const src = readFileSync(join(root, f), 'utf8');
    for (const key of STORAGE_KEYS) assert.ok(!src.includes(key), `${f} must not name the storage key ${key}`);
  }
});

test('the scanner catches what it should', () => {
  const bad = [
    ['js/x.js', "localStorage.setItem('a', 1)"],
    ['js/memory.js', "sessionStorage.setItem('a', 1)"],
    ['js/memory.js', 'document.cookie = "a=1"'],
    ['js/memory.js', "fetch('/api')"],
    ['js/x.js', 'navigator.storage.persist()'],
    ['js/x.js', "caches.open('v1')"],
    ['js/x.js', 'cookieStore.set("a", "1")'],
    ['js/x.js', "document['cookie'] = 'a=1'"],
    ['js/x.js', 'sessionStorage.getItem("a")'],
    ['js/x.js', 'indexedDB.open("db")'],
    ['js/x.js', 'document.cookie = "a=1"'],
    ['js/x.js', "fetch('/api')"],
    ['js/x.js', "navigator.sendBeacon('/log')"],
    ['index.html', '<form action="/x">'],
    ['index.html', '<script src="https://cdn.example.com/a.js"></script>'],
    ['index.html', '<script src="//cdn.example.com/a.js"></script>'],
    ['styles.css', "@import url('x.css');"],
    ['styles.css', 'body { background: url(https://example.com/a.png); }'],
    ['js/screens.js', "const x = 'https://example.com';"],
    ['index.html', '<meta property="og:image" content="https://example.com/og.png">'],
    ['js/x.js', "const own = 'https://screen-compare.notchup.fi/x';"],
  ];
  for (const [file, text] of bad) assert.notDeepEqual(scan(file, text), [], `${file}: ${text}`);
});

test('the scanner allows links, spec sources, XML namespaces and the page\'s own metadata', () => {
  const ok = [
    ['js/memory.js', 'export function createMemory(getStorage = () => window.localStorage) {'],
    ['index.html', '<a href="https://notchup.fi">Made by Notchup</a>'],
    ['js/screens.js', "    source: 'https://support.apple.com/en-us/121554',"],
    ['assets/mark.svg', '<svg xmlns="http://www.w3.org/2000/svg" xmlns:c2pa="http://c2pa.org/manifest">'],
    ['js/render.js', "const SVG_NS = 'http://www.w3.org/2000/svg';"],
    ['index.html', '<link rel="canonical" href="https://screen-compare.notchup.fi/">'],
    ['index.html', '<meta property="og:image" content="https://screen-compare.notchup.fi/assets/og.png">'],
    ['index.html', '    "@context": "https://schema.org",'],
    ['index.html', '    "creator": { "@type": "Organization", "name": "Notchup Oy", "url": "https://notchup.fi" }'],
  ];
  for (const [file, text] of ok) assert.deepEqual(scan(file, text), [], `${file}: ${text}`);
});
