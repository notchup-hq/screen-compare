// Stamps the deployed commit and date into index.html's <meta name="build">.
// Run as Cloudflare Pages' build command; locally the page keeps "dev".
// Pages sets CF_PAGES_COMMIT_SHA (Workers Builds sets WORKERS_CI_COMMIT_SHA).

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const PLACEHOLDER = '<meta name="build" content="dev">';

/** The page with the placeholder replaced by `short-sha date`. */
export function stamp(html, sha, date) {
  return html.replace(PLACEHOLDER, `<meta name="build" content="${sha.slice(0, 7)} ${date}">`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const sha = process.env.CF_PAGES_COMMIT_SHA ?? process.env.WORKERS_CI_COMMIT_SHA;
  if (!/^[0-9a-f]{7,40}$/.test(sha ?? '')) {
    console.log('No commit SHA in the environment, the page keeps "dev".');
  } else {
    const page = fileURLToPath(new URL('../index.html', import.meta.url));
    writeFileSync(page, stamp(readFileSync(page, 'utf8'), sha, new Date().toISOString().slice(0, 10)));
  }
}
