import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { root, publicFiles } from './site-files.mjs';
import { loadLocales, escapeHtml as esc, translateHtml, bundleLocales } from './locales.mjs';
import { dependencyWidget, validateDependency } from './dependencies.mjs';
import { loadExamples, renderExamples } from './examples.mjs';

const dictionaries = await loadLocales();
const zh = dictionaries['zh-CN'];
const projects = JSON.parse(await readFile(path.join(root, 'data/projects.json'), 'utf8'));
const examples = await loadExamples();
const categories = ['minecraft', 'general'];
const tags = { java: 'Java', 'java-25': 'Java 25', minecraft: 'Minecraft', fabric: 'Fabric', library: 'Library', linq: 'LINQ' };
assert.equal(new Set(projects.map(p => p.slug)).size, projects.length, 'Duplicate project slug.');
for (const project of projects) {
  assert(/^[a-z0-9-]+$/.test(project.slug), 'Invalid project slug.');
  assert(categories.includes(project.category), 'Unknown category.');
  assert(project.tags.every(tag => Object.hasOwn(tags, tag)), 'Unknown tag.');
  assert(Object.hasOwn(zh, project.summaryKey), `Missing summary: ${project.slug}`);
  if (project.dependency) validateDependency(project.dependency);
  if (project.javadoc) {
    assert.equal(project.category, 'general', 'Javadoc navigation belongs to general-purpose projects.');
    assert(['available', 'unavailable'].includes(project.javadoc.status), 'Unknown Javadoc status.');
    for (const key of project.javadoc.status === 'available' ? ['url', 'versionUrl'] : ['versionsUrl']) {
      assert.equal(new URL(project.javadoc[key]).origin, 'https://javadoc.io', 'Expected a verified Javadoc host.');
    }
  }
}
const t = (key, tag = 'span') => { assert(Object.hasOwn(zh, key), `Missing key ${key}`); return `<${tag} data-i18n="${key}">${esc(zh[key])}</${tag}>`; };
const link = (href, key, cls = '') => `<a${cls ? ` class="${cls}"` : ''} href="${href}" data-i18n="${key}">${esc(zh[key])}</a>`;
const write = async (file, content) => {
  const target = path.join(root, file);
  await mkdir(path.dirname(target), { recursive: true });
  if (await readFile(target, 'utf8').catch(() => null) !== content) await writeFile(target, content, 'utf8');
};
let home = await readFile(path.join(root, 'index.html'), 'utf8');
const nestedLinks = html => html.replace(/href="([^\"]+)"/g, (match, href) => {
  if (/^https?:/.test(href)) return match;
  const destination = new URL(href, 'https://site.invalid/index.html');
  return `href="../${destination.pathname.slice(1)}${destination.search}${destination.hash}"`;
});
const header = nestedLinks(home.match(/<header class="site-header">[\s\S]*?<\/header>/)[0]);
const footer = nestedLinks(home.match(/<footer class="site-footer">[\s\S]*?<\/footer>/)[0]).replace(/href="\.\.\/index.html#home"(?=><span data-i18n="footer.top")/, 'href="#top"');
function page(file, title, description, content, type = 'catalog') {
  const self = './' + path.posix.basename(file);
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="theme-color" content="#101e2c" />
  <meta name="description" content="${esc(zh[description])}" data-i18n-content="${description}" />
  <title data-i18n="${title}">${esc(zh[title])}</title>
  <link rel="icon" type="image/svg+xml" href="../assets/favicon.svg" />
  <link rel="stylesheet" href="../css/styles.css" />
  <link rel="stylesheet" href="../css/projects.css" />
  <link rel="stylesheet" href="../css/catalog.css" />
  <link rel="alternate" hreflang="zh-CN" href="${self}?lang=zh-CN" />
  <link rel="alternate" hreflang="en" href="${self}?lang=en" />
  <script src="../js/translations.js" defer></script>
  <script src="../js/i18n.js" defer></script>
  <script src="../js/script.js" defer></script>
</head>
<body class="project-page" data-page="${type}" id="top">
  ${link(type === 'project' ? '#overview' : '#directory', type === 'project' ? 'project.skip' : 'catalog.heading', 'skip-link')}
  ${header}
  <main>${content}</main>
  ${footer}
</body>
</html>
`;
}
function rows(items) {
  return items.map(p => `<article class="catalog-row" data-project="${p.slug}"><h3><a href="../projects/${p.slug}.html">${esc(p.name)} <span aria-hidden="true">↗</span></a></h3>${t(p.summaryKey, 'p')}<div class="catalog-meta">${p.tags.map(tag => `<span>${tags[tag]}</span>`).join('')}</div><div class="catalog-actions">${link(`../projects/${p.slug}.html`, 'project.explore')}${p.javadoc ? link(`../javadoc/${p.slug}.html`, 'javadoc.label') : ''}</div></article>`).join('\n');
}
function group(id, title, description, items) {
  return `<section class="catalog-group" id="${id}"><h2>${title} <small>(${items.length})</small></h2>${description ? t(description,'p') : ''}${rows(items)}</section>`;
}
const byCategory = category => projects.filter(p => p.category === category);
const byTag = tag => projects.filter(p => p.tags.includes(tag));
function categoryCards(prefix = '../') {
  return `<div class="category-grid">${categories.map(category => {
    const items = byCategory(category);
    return `<a class="category-card category-${category}" href="${prefix}categories/${category}.html" data-category="${category}">
      <div class="category-symbol" aria-hidden="true">${category === 'minecraft' ? '[ MC ]' : '&lt; Java /&gt;'}</div>
      <h3 data-i18n="category.${category}">${esc(zh[`category.${category}`])}</h3>${t(`category.${category}.description`, 'p')}
      <p class="category-projects">${items.map(p => esc(p.name)).join(' · ')}</p>
      <div class="category-footer"><span class="category-count">${items.length} ${t('catalog.countLabel')}</span><span>${t('catalog.openCategory')} <span aria-hidden="true">→</span></span></div>
    </a>`;
  }).join('\n')}</div>`;
}
function categoryLinks(current = '') {
  return categories.map(category => `<a href="../categories/${category}.html"${current === category ? ' aria-current="page"' : ''}>${t(`category.${category}`)}<small>${byCategory(category).length}</small></a>`).join('');
}
for (const kind of ['projects','categories','tags']) {
  const file = `${kind}/index.html`;
  const content = kind === 'tags' ? Object.entries(tags).map(([tag,name]) => group(tag, esc(name), '', byTag(tag))).join('\n') : categoryCards();
  const jumps = Object.entries(tags).map(([tag,name]) => `<a href="#${tag}">${name}<small>${byTag(tag).length}</small></a>`).join('');
  const intro = kind === 'tags' ? 'catalog.tagIntro' : kind === 'categories' ? 'catalog.categoryIntro' : 'catalog.lead';
  const title = kind === 'tags' ? 'catalog.tagTitle' : kind === 'categories' ? 'catalog.categoryTitle' : 'catalog.heading';
  await write(file, page(file, 'catalog.title', 'catalog.description', `
    <section class="project-hero"><div class="project-hero-inner"><p class="eyebrow">PROJECT COLLECTION</p><h1 data-i18n="${title}">${esc(zh[title])}</h1><p class="project-lead" data-i18n="${intro}">${esc(zh[intro])}</p></div></section>
    <div class="catalog-layout${kind === 'tags' ? '' : ' catalog-layout-wide'}" id="directory"><div class="catalog-main">
      <nav class="catalog-tabs" aria-label="目录导航" data-i18n-aria-label="catalog.indexLabel">${[['projects','catalog.all'],['tags','catalog.tags']].map(([dir,key]) => `<a href="../${dir}/index.html"${(dir === kind || (dir === 'projects' && kind === 'categories')) ? ' aria-current="page"' : ''} data-i18n="${key}">${esc(zh[key])}</a>`).join('')}</nav>
      ${content}
    </div>${kind === 'tags' ? `<aside class="catalog-aside">${t('catalog.jump','h2')}${jumps}</aside>` : ''}</div>`));
}

for (const category of categories) {
  const file = `categories/${category}.html`;
  await write(file, page(file, `category.${category}.pageTitle`, `category.${category}.description`, `
    <section class="project-hero"><div class="project-hero-inner"><nav class="breadcrumbs" aria-label="当前位置" data-i18n-aria-label="nav.breadcrumb">${link('../projects/index.html', 'catalog.heading')}<span aria-hidden="true">/</span><span aria-current="page" data-i18n="category.${category}">${esc(zh[`category.${category}`])}</span></nav><p class="eyebrow">${category === 'minecraft' ? 'MINECRAFT' : 'GENERAL PURPOSE'}</p><h1 data-i18n="category.${category}">${esc(zh[`category.${category}`])}</h1><p class="project-lead" data-i18n="category.${category}.description">${esc(zh[`category.${category}.description`])}</p></div></section>
    <div class="catalog-layout" id="directory"><div class="catalog-main">${link('../projects/index.html', 'catalog.backCategories', 'catalog-home-link')}${group(category, t('catalog.inCategory'), '', byCategory(category))}</div><aside class="catalog-aside">${t('catalog.categories', 'h2')}${categoryLinks(category)}</aside></div>`));
}

for (const project of projects.filter(p => p.javadoc)) {
  const doc = project.javadoc;
  const available = doc.status === 'available';
  const external = (url, key) => `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${t(key)}<span aria-hidden="true">↗</span></a>`;
  const file = `javadoc/${project.slug}.html`;
  await write(file, page(file, `javadoc.${project.slug}.title`, 'javadoc.description', `
    <section class="project-hero"><div class="project-hero-inner"><nav class="breadcrumbs" aria-label="当前位置" data-i18n-aria-label="nav.breadcrumb">${link('../categories/general.html', 'category.general')}<span aria-hidden="true">/</span><a href="../projects/${project.slug}.html">${esc(project.name)}</a><span aria-hidden="true">/</span><span aria-current="page">Javadoc</span></nav><p class="eyebrow">API REFERENCE</p><h1>${esc(project.name)} · Javadoc</h1><p class="project-lead" data-i18n="javadoc.description">${esc(zh['javadoc.description'])}</p></div></section>
    <div class="catalog-layout" id="directory"><div class="catalog-main">
      <section class="docs-status${available ? '' : ' docs-status-unavailable'}" data-javadoc-status="${doc.status}">${t(available ? 'javadoc.available' : 'javadoc.unavailable', 'h2')}${t(available ? 'javadoc.availableDescription' : 'javadoc.unavailableDescription', 'p')}</section>
      <h2 data-i18n="javadoc.links">${esc(zh['javadoc.links'])}</h2><div class="docs-links">
        ${available ? external(doc.url, 'javadoc.open') + external(doc.versionUrl, 'javadoc.fixedVersion') : external(doc.versionsUrl, 'javadoc.versions')}
        ${external(project.repository + '#readme', 'javadoc.readme')}
        ${link(`../projects/${project.slug}.html`, 'javadoc.backProject')}
      </div>
    </div><aside class="catalog-aside"><h2 data-i18n="project.facts">${esc(zh['project.facts'])}</h2><p>${t('javadoc.coordinate')}<br /><span class="docs-coordinate">io.github.piscescup:<wbr />${esc(project.slug)}</span></p>${available ? `<p>${t('javadoc.version')}<br />${esc(doc.version)}</p>` : ''}<p>${t('javadoc.checked')}<br /><time datetime="${doc.checkedAt}">${doc.checkedAt}</time></p>${link('../categories/general.html', 'category.general')}</aside></div>`));
}
await write('projects/linq-for-java.html', translateHtml(page('projects/linq-for-java.html','linq.title','linq.description', await readFile(path.join(root,'templates/linq-for-java.html'),'utf8'),'project'), zh));

// Keep project breadcrumbs and documentation entries tied to the same manifest.
for (const project of projects) {
  const file = `projects/${project.slug}.html`;
  let html = await readFile(path.join(root, file), 'utf8');
  if (project.dependency) {
    const region = /<!-- dependency:start -->[\s\S]*?<!-- dependency:end -->/;
    assert(region.test(html), `Missing dependency region in ${file}.`);
    html = html.replace(region, `<!-- dependency:start -->\n${dependencyWidget(project, zh)}\n<!-- dependency:end -->`);
    if (!html.includes('src="../js/dependencies.js"')) {
      html = html.replace('</head>', '  <script src="../js/dependency-formats.js" defer></script>\n  <script src="../js/dependencies.js" defer></script>\n</head>');
    }
  }
  if (examples[project.slug]) {
    assert.equal(project.category, 'general', 'README examples belong to general libraries.');
    const region = /<!-- examples:start -->[\s\S]*?<!-- examples:end -->/;
    assert(region.test(html), `Missing examples region in ${file}.`);
    html = html.replace(region, `<!-- examples:start -->\n${renderExamples(examples[project.slug], zh)}\n<!-- examples:end -->`);
    if (!html.includes('src="../js/code-examples.js"')) {
      html = html.replace('</head>', '  <script src="../js/code-examples.js" defer></script>\n</head>');
    }
  }
  if ((project.dependency || examples[project.slug]) && !html.includes('src="../js/clipboard.js"')) {
    html = html.replace('<script src="../js/script.js"', '<script src="../js/clipboard.js" defer></script>\n  <script src="../js/script.js"');
  }
  // Code is language-neutral; prose alone uses translation keys.
  html = html.replace(/<code(?![^>]*\btranslate=)([^>]*)>/g, '<code translate="no" class="notranslate"$1>');
  html = html.replace(/<nav class="breadcrumbs"[\s\S]*?<\/nav>/, `<nav class="breadcrumbs" aria-label="当前位置" data-i18n-aria-label="nav.breadcrumb">${link('../projects/index.html', 'catalog.heading')}<span aria-hidden="true">/</span><a href="../categories/${project.category}.html" data-i18n="category.${project.category}">${esc(zh[`category.${project.category}`])}</a><span aria-hidden="true">/</span><span aria-current="page">${esc(project.name)}</span></nav>`);
  html = html.replace(/<a class="facts-back"[\s\S]*?<\/a>/, link(`../categories/${project.category}.html`, 'catalog.backCategory', 'facts-back'));
  html = html.replace(/<a\b[^>]*\bdata-project-javadoc\b[^>]*>[\s\S]*?<\/a>\s*/g, '');
  if (project.javadoc) {
    const docLink = cls => `<a class="${cls}" href="../javadoc/${project.slug}.html" data-project-javadoc data-i18n="javadoc.label">${esc(zh['javadoc.label'])}</a>`;
    html = html.replace(/(<div class="project-actions">[\s\S]*?)(<\/div>)/, (_, start, end) => `${start}${docLink('source-button')}\n        ${end}`);
    html = html.replace('<a class="facts-back"', `${docLink('facts-javadoc')}\n        <a class="facts-back"`);
  }
  await write(file, html);
}

home = home.replace(/<!-- project-(?:cards|categories):start -->[\s\S]*?<!-- project-(?:cards|categories):end -->/, `<!-- project-categories:start -->\n        ${categoryCards('./')}\n        <!-- project-categories:end -->`);
home = home.replace(/<span class="section-count">[^<]*<\/span>/, `<span class="section-count">01 — ${String(categories.length).padStart(2,'0')}</span>`);
await write('index.html', translateHtml(home,zh));
let notFound = page('404.html','notFound.title','notFound.description', `<section class="project-hero" id="directory"><div class="project-hero-inner"><p class="eyebrow">404</p><h1 data-i18n="notFound.heading">${esc(zh['notFound.heading'])}</h1><p class="project-lead" data-i18n="notFound.description">${esc(zh['notFound.description'])}</p><div class="project-actions">${link('../index.html','nav.home','hero-button')}${link('../projects/index.html','nav.directory','source-button')}</div></div></section>`);
notFound = notFound.replace(/(href|src)="\.\.\//g,'$1="/').replace(/href="\.\/404.html/g,'href="/404.html').replace('<script src="/js/translations.js"', '<script src="/js/legacy-routes.js" defer></script>\n  <script src="/js/translations.js"');
await write('404.html',notFound);
await write('js/translations.js', bundleLocales(dictionaries));
for (const file of (await publicFiles()).filter(file => file.endsWith('.html'))) {
  const html = await readFile(path.join(root,file),'utf8');
  await write(file, translateHtml(html,zh));
}
console.log(`Generated ${categories.length} categories, ${projects.length} project entries, Javadoc navigation and ${Object.keys(zh).length} translation keys.`);
