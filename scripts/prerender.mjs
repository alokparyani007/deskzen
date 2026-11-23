// Writes ready-made HTML for the public pages after `vite build` + the SSR build.
// dist/index.html (home), dist/privacy.html, dist/terms.html, dist/login.html.
// App routes use dist/app.html, the plain SPA shell (see vercel.json and the PWA navigateFallback).
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
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

function outFileFor(path) {
  if (path === '/') return 'index.html';
  return `${path.replace(/^\//, '')}.html`;
}

for (const path of ssr.PRERENDER_PATHS) {
  const meta = ssr.PAGE_META[path];
  const url = ssr.pageUrl(path);
  const body = ssr.render(path);
  if (!body || body.length < 500) throw new Error(`prerender: ${path} rendered almost nothing`);
  let html = shell;
  html = replaceOnce(html, /<title>[^<]*<\/title>/, `<title>${esc(meta.title)}</title>`, '<title>');
  html = setMeta(html, 'name', 'description', meta.description);
  if (path.startsWith('/learn/')) html = setMeta(html, 'property', 'og:type', 'article');
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
  const file = outFileFor(path);
  mkdirSync(dirname(resolve(dist, file)), { recursive: true });
  writeFileSync(resolve(dist, file), html);
  console.log(`prerender: ${path} -> dist/${file} (${(html.length / 1024).toFixed(1)} KB)`);
}

const NOT_FOUND_TITLE = 'Page not found | DeskZen';
const NOT_FOUND_DESCRIPTION =
  'That page is not on DeskZen. Try the free posture reminder app, or open the webcam posture checker in your browser.';

function buildNotFound(body) {
  let html = shell;
  html = replaceOnce(html, /<title>[^<]*<\/title>/, `<title>${esc(NOT_FOUND_TITLE)}</title>`, '<title>');
  html = setMeta(html, 'name', 'description', NOT_FOUND_DESCRIPTION);
  html = setMeta(html, 'property', 'og:title', NOT_FOUND_TITLE);
  html = setMeta(html, 'property', 'og:description', NOT_FOUND_DESCRIPTION);
  html = setMeta(html, 'name', 'twitter:title', NOT_FOUND_TITLE);
  html = setMeta(html, 'name', 'twitter:description', NOT_FOUND_DESCRIPTION);
  html = html.replace(/\s*<meta property="og:url"[^>]*>/, '');
  html = html.replace(/\s*<link rel="preload" as="image"[^>]*>/, '');
  html = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
  html = html.replace(/\s*<link rel="modulepreload"[^>]*>/g, '');
  html = replaceOnce(html, /<\/head>/, `  <meta name="robots" content="noindex" />\n  </head>`, '</head>');
  html = replaceOnce(html, /<div id="root"><\/div>/, `<div id="root">${body}</div>`, '<div id="root"></div>');
  return html;
}

const notFoundBody = ssr.renderNotFound();
if (!notFoundBody || notFoundBody.length < 200) throw new Error('prerender: 404 rendered almost nothing');
writeFileSync(resolve(dist, '404.html'), buildNotFound(notFoundBody));
console.log(`prerender: 404 -> dist/404.html`);

function committedDate(file) {
  try {
    const committed = execFileSync('git', ['log', '-1', '--format=%cs', '--', file], { cwd: root, encoding: 'utf8' }).trim();
    return /^\d{4}-\d{2}-\d{2}$/.test(committed) ? committed : null;
  } catch {
    return null;
  }
}

const today = new Date().toISOString().slice(0, 10);
const sitemapRecords = ssr.sitemapRecords((sources) => {
  let dirty = false;
  let best = '';
  for (const file of sources) {
    try {
      const status = execFileSync('git', ['status', '--porcelain', '--', file], { cwd: root, encoding: 'utf8' }).trim();
      if (status) dirty = true;
    } catch {
      dirty = true;
    }
    const date = committedDate(file);
    if (date && date > best) best = date;
  }
  return dirty ? today : best || today;
});
const sitemap = ssr.sitemapXml(sitemapRecords);
writeFileSync(resolve(dist, 'sitemap.xml'), sitemap);
console.log(`prerender: sitemap -> dist/sitemap.xml (${sitemapRecords.map((item) => item.lastmod).join(', ')})`);

rmSync(ssrDir, { recursive: true, force: true });
