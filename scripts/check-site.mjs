import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { root, publicFiles } from './site-files.mjs';
import { loadLocales, translateHtml, bundleLocales } from './locales.mjs';
import { dependencyWidget, validateDependency } from './dependencies.mjs';
import { loadExamples, renderExamples } from './examples.mjs';

const files = await publicFiles();
const published = new Set(files);
const dictionaries = await loadLocales();
const projects = JSON.parse(await readFile(path.join(root, 'data/projects.json'), 'utf8'));
const examples = await loadExamples();
const pages = new Map();
const base = 'https://portfolio.invalid/';
const attributes = tag => Object.fromEntries([...tag.matchAll(/([\w-]+)="([^"]*)"/g)].map(match => [match[1], match[2]]));
const targetFile = url => decodeURIComponent(url.pathname.slice(1)) + (url.pathname.endsWith('/') ? 'index.html' : '');
assert(!files.some(file => file.startsWith('en/')), 'Language-specific page directories must not be published.');
assert.equal(await readFile(path.join(root, 'js/translations.js'), 'utf8'), bundleLocales(dictionaries), 'Stale translation bundle: run npm run generate.');

for (const file of files.filter(file => file.endsWith('.html'))) {
  const html = await readFile(path.join(root, file), 'utf8');
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
  assert.equal(ids.length, new Set(ids).size, file + ': duplicate IDs');
  assert.equal([...html.matchAll(/<h1[\s>]/g)].length, 1, file + ': one page heading required');
  assert.match(html, /<html lang="zh-CN">/, file + ': Chinese fallback required');
  assert.match(html, /<meta name="description" content="[^"]+"/, file + ': missing description');
  for (const [,key] of html.matchAll(/\bdata-i18n(?:-(?:aria-label|alt|content|placeholder|title))?="([^"]+)"/g)) {
    for (const [language,dict] of Object.entries(dictionaries)) assert(Object.hasOwn(dict,key), file + ': missing ' + language + ' translation ' + key);
  }
  assert.equal(translateHtml(html,dictionaries['zh-CN']),html, file + ': stale Chinese fallback; run npm run generate.');
  const english = translateHtml(html,dictionaries.en).replace(/<!--[\s\S]*?-->/g,'').replace(/>中文</g,'><');
  assert.doesNotMatch(english, /[\u3400-\u9fff]/, file + ': text or accessibility labels without a translation key');
  for (const language of ['zh-CN','en']) assert.match(html, new RegExp('data-language="' + language + '"'), file + ': missing language button');
  pages.set(file, { html, ids: new Set(ids) });
}
let checkedLinks = 0;
for (const [file,page] of pages) {
  const links = [...page.html.matchAll(/<(?:a|link|script|img)\b[^>]*>/g)].map(match => attributes(match[0]));
  for (const a of links) {
    const href = a.href ?? a.src;
    assert(href && href !== '#', file + ': empty destination');
    if (a.target === '_blank') assert(a.rel?.includes('noopener'),file + ': unsafe external link');
    const url = new URL(href,new URL(file,base));
    if (url.origin !== new URL(base).origin) continue;
    const target = targetFile(url);
    assert(published.has(target),file + ': missing local target ' + href);
    assert(!target.startsWith('en/'),file + ': obsolete language directory link');
    if (url.hash) assert(pages.get(target)?.ids.has(decodeURIComponent(url.hash.slice(1))),file + ': missing section ' + href);
    checkedLinks++;
  }
  for (const language of ['zh-CN','en']) {
    const alternate = links.find(a => a.rel === 'alternate' && a.hreflang === language);
    assert(alternate,file + ': missing alternate for ' + language);
    const url = new URL(alternate.href,new URL(file,base));
    assert.equal(targetFile(url),file,file + ': alternate must use the same HTML page');
    assert.equal(url.searchParams.get('lang'),language,file + ': wrong alternate language');
  }
}
const categories = ['minecraft', 'general'];
assert.deepEqual([...new Set(projects.map(p => p.category))].sort(), [...categories].sort(), 'Expected exactly two project categories.');
for (const file of ['index.html','projects/index.html','categories/index.html']) {
  assert.equal([...pages.get(file).html.matchAll(/class="category-card /g)].length, 2, file + ': expected two category entry cards');
  for (const category of categories) assert(pages.get(file).html.includes(`categories/${category}.html`), file + ': missing category entry');
}
for (const category of categories) {
  const html = pages.get(`categories/${category}.html`)?.html;
  assert(html, 'Missing category page: ' + category);
  const actual = [...html.matchAll(/data-project="([^"]+)"/g)].map(match => match[1]).sort();
  assert.deepEqual(actual, projects.filter(p => p.category === category).map(p => p.slug).sort(), 'Category contains the wrong projects: ' + category);
}
for (const project of projects) {
  assert(pages.has('projects/' + project.slug + '.html'),'Missing project page: ' + project.slug);
  for (const file of [`categories/${project.category}.html`, 'tags/index.html']) {
    assert(pages.get(file).html.includes('projects/' + project.slug + '.html'),file + ': missing project ' + project.slug);
  }
  const detail = pages.get(`projects/${project.slug}.html`).html;
  assert(detail.includes(`categories/${project.category}.html`), 'Missing return link to project category.');
  if (project.dependency) {
    validateDependency(project.dependency);
    assert(detail.includes(dependencyWidget(project, dictionaries['zh-CN'])), 'Stale dependency widget: ' + project.slug);
    for (const script of ['clipboard', 'dependency-formats', 'dependencies']) assert(detail.includes(`src="../js/${script}.js"`), 'Missing dependency script.');
    assert.equal([...detail.matchAll(/data-dependency-tab=/g)].length, 5, 'Expected five dependency tabs.');
    assert.equal([...detail.matchAll(/data-dependency-copy hidden/g)].length, 4, 'Copy controls must progressively enhance static snippets.');
    if (project.dependency.status === 'source') assert(!detail.includes('data-dependency-download='), 'Unverified releases must not have download links.');
  }
  if (project.javadoc) {
    const doc = pages.get(`javadoc/${project.slug}.html`)?.html;
    assert(doc, 'Missing Javadoc navigation page: ' + project.slug);
    assert(detail.includes(`javadoc/${project.slug}.html`), 'Project is missing its Javadoc entry.');
    assert(pages.get('categories/general.html').html.includes(`javadoc/${project.slug}.html`), 'General category is missing its Javadoc entry.');
    assert(doc.includes(`data-javadoc-status="${project.javadoc.status}"`), 'Incorrect Javadoc status.');
    const expectedUrl = project.javadoc.status === 'available' ? project.javadoc.url : project.javadoc.versionsUrl;
    assert(doc.includes(`href="${expectedUrl}"`), 'Incorrect Javadoc destination.');
    if (project.javadoc.status === 'unavailable') assert(!doc.includes('data-i18n="javadoc.open"'), 'Unavailable documentation must not offer a live Javadoc button.');
  }
}
const linq = pages.get('projects/linq-for-java.html').html;
for (const [slug, group] of Object.entries(examples)) {
  assert(projects.some(project => project.slug === slug && project.category === 'general'), 'Unknown general library for examples.');
  const detail = pages.get(`projects/${slug}.html`).html;
  assert(detail.includes(renderExamples(group, dictionaries['zh-CN'])), 'Stale README examples: ' + slug);
  assert(detail.includes('href="#examples"'), 'Missing examples navigation: ' + slug);
  assert(detail.includes('src="../js/code-examples.js"'), 'Missing code example script.');
  assert.equal([...detail.matchAll(/data-example-code/g)].length, group.items.length, 'Example count differs from source.');
  assert.equal([...detail.matchAll(/data-example-copy hidden/g)].length, group.items.length, 'Code copy must progressively enhance static content.');
  for (const item of group.items) assert(!published.has(item.file), 'Java source files are embedded, not published as separate downloads.');
}
for (const term of ['Int', 'Long', 'Double']) assert(linq.includes(`<span translate="no" class="notranslate">${term}</span>`), 'Technical sequence name must not be translated: ' + term);
assert.equal(pages.size,projects.length + 5 + categories.length + projects.filter(p => p.javadoc).length,'Unexpected number of shared pages.');
console.log('Verified ' + pages.size + ' shared pages, ' + checkedLinks + ' local links, ' + Object.keys(dictionaries.en).length + ' bilingual translation keys and ' + projects.length + ' projects.');
