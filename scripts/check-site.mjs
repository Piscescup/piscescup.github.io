import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { root, publicFiles } from './site-files.mjs';

const files = await publicFiles();
const published = new Set(files);
const pages = new Map();
const base = 'https://portfolio.invalid/';
const attributes = (tag) => Object.fromEntries(
  [...tag.matchAll(/([\w-]+)="([^"]*)"/g)].map((match) => [match[1], match[2]])
);

for (const file of files.filter((file) => file.endsWith('.html'))) {
  const html = await readFile(path.join(root, file), 'utf8');
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
  assert.equal(ids.length, new Set(ids).size, `${file}: duplicate IDs`);
  assert.equal([...html.matchAll(/<h1[\s>]/g)].length, 1, `${file}: one page heading required`);
  const language = file.startsWith('en/') ? 'en' : 'zh-CN';
  assert.match(html, new RegExp(`<html lang="${language}">`), `${file}: incorrect language`);
  assert.match(html, /<meta name="description" content="[^"]+"/, `${file}: missing description`);
  if (language === 'en') {
    const text = html.replace(/<!--[\s\S]*?-->/g, '').replace(/中文/g, '');
    assert.doesNotMatch(text, /[\u3400-\u9fff]/, `${file}: untranslated Chinese text`);
  }
  pages.set(file, { html, ids: new Set(ids), language });
}

let checkedLinks = 0;
for (const [file, page] of pages) {
  const links = [...page.html.matchAll(/<(?:a|link|script|img)\b[^>]*>/g)].map((match) => attributes(match[0]));
  for (const a of links) {
    const href = a.href ?? a.src;
    assert(href && href !== '#', `${file}: empty destination`);
    if (a.target === '_blank') assert(a.rel?.includes('noopener'), `${file}: unsafe external link`);
    const url = new URL(href, new URL(file, base));
    if (url.origin !== new URL(base).origin) continue;
    const target = decodeURIComponent(url.pathname.slice(1));
    assert(published.has(target), `${file}: missing local target ${href}`);
    if (url.hash) assert(pages.get(target)?.ids.has(decodeURIComponent(url.hash.slice(1))), `${file}: missing section ${href}`);
    checkedLinks += 1;
  }
  const counterpart = file.startsWith('en/') ? file.slice(3) : `en/${file}`;
  assert(pages.has(counterpart), `${file}: missing translation`);
  const switchTag = page.html.match(/<a\b[^>]*\bdata-language-switch[^>]*>/)?.[0];
  assert(switchTag, `${file}: missing language switch`);
  const switchUrl = new URL(attributes(switchTag).href, new URL(file, base));
  assert.equal(switchUrl.pathname.slice(1), counterpart, `${file}: switch must keep the same project`);
  for (const language of ['zh-CN', 'en']) {
    assert(links.some((a) => a.rel === 'alternate' && a.hreflang === language), `${file}: missing language metadata`);
  }
  // All navigation and project-card links must stay in the selected language.
  for (const match of page.html.matchAll(/<a\b[^>]*class="(?:nav-link[^"\n]*|project-link)"[^>]*>/g)) {
    const a = attributes(match[0]);
    const target = new URL(a.href, new URL(file, base));
    assert.equal(target.pathname.startsWith('/en/'), page.language === 'en', `${file}: navigation changed language`);
  }
}
assert.equal(pages.size, 10, 'Expected two homepages and eight project pages.');
console.log(`Verified ${pages.size} bilingual pages, ${checkedLinks} local links and reciprocal language switches.`);
