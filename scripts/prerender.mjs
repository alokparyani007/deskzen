// Writes ready-made HTML for the public pages after `vite build` + the SSR build.
// dist/index.html (home), dist/privacy.html, dist/terms.html, dist/login.html.
// App routes use dist/app.html, the plain SPA shell (see vercel.json and the PWA navigateFallback).
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const root = resolve(import.meta.dirname, '..');
const dist = resolve(root, 'dist');
const ssrDir = resolve(root, 'dist-ssr');
const ssr = await import(pathToFileURL(resolve(ssrDir, 'entry-server.js')).href);

if (!existsSync(resolve(dist, 'app.html'))) throw new Error('prerender: dist/app.html (SPA shell) is missing');
const shell = readFileSync(resolve(dist, 'index.html'), 'utf8');

const esc = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function replaceOnce(html, pattern, value, label) {
  if (!pattern.test(html)) throw new Error(`prerender: could not find ${label} in dist/index.html`);
  return html.replace(pattern, value);
}

function setMeta(html, attr, key, value) {
  const re = new RegExp(`<meta\\s+${attr}="${key}"\\s+content="[^"]*"\\s*/?>`);
  return replaceOnce(html, re, `<meta ${attr}="${key}" content="${esc(value)}" />`, `${attr}=${key}`);
}

const outFile = { '/': 'index.html', '/privacy': 'privacy.html', '/terms': 'terms.html', '/login': 'login.html' };

for (const path of ssr.PRERENDER_PATHS) {
  const meta = ssr.PAGE_META[path];
  const url = ssr.pageUrl(path);
  const body = ssr.render(path);
  if (!body || body.length < 500) throw new Error(`prerender: ${path} rendered almost nothing`);
  let html = shell;
  html = replaceOnce(html, /<title>[^<]*<\/title>/, `<title>${esc(meta.title)}</title>`, '<title>');
  html = setMeta(html, 'name', 'description', meta.description);
  html = setMeta(html, 'property', 'og:title', meta.ogTitle);
  html = setMeta(html, 'property', 'og:description', meta.ogDescription);
  html = setMeta(html, 'property', 'og:url', url);
  html = setMeta(html, 'property', 'og:image', ssr.OG_IMAGE);
  html = setMeta(html, 'name', 'twitter:title', meta.ogTitle);
  html = setMeta(html, 'name', 'twitter:description', meta.ogDescription);
  html = setMeta(html, 'name', 'twitter:image', ssr.OG_IMAGE);
  // Only the homepage needs the big hero image early.
  if (path !== '/') html = html.replace(/\s*<link rel="preload" as="image"[^>]*>/, '');
  const ld = JSON.stringify(ssr.jsonLd(path)).replace(/</g, '\\u003c');
  html = replaceOnce(
    html,
    /<\/head>/,
    `  <link rel="canonical" href="${url}" />\n    <script type="application/ld+json">${ld}</script>\n  </head>`,
    '</head>',
  );
  html = replaceOnce(html, /<div id="root"><\/div>/, `<div id="root">${body}</div>`, '<div id="root"></div>');
  writeFileSync(resolve(dist, outFile[path]), html);
  console.log(`prerender: ${path} -> dist/${outFile[path]} (${(html.length / 1024).toFixed(1)} KB)`);
}

rmSync(ssrDir, { recursive: true, force: true });
