import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { root, publicFiles } from './site-files.mjs';
import { loadLocales, escapeHtml as esc, translateHtml, bundleLocales } from './locales.mjs';
import { dependencyWidget, validateDependency } from './dependencies.mjs';
import { loadExamples, renderExamples } from './examples.mjs';
import { generateTutorials } from './tutorials.mjs';
import { loadProjectTemplate, renderProjectPage } from './project-pages.mjs';
import '../js/javadoc-status.js';

const dictionaries = await loadLocales();
const zh = dictionaries['zh-CN'];
const projects = JSON.parse(await readFile(path.join(root, 'data/projects.json'), 'utf8'));
const examples = await loadExamples();
const projectTemplate = await loadProjectTemplate();
const categories = ['minecraft', 'general'];
const tags = { java: 'Java', 'java-25': 'Java 25', minecraft: 'Minecraft', fabric: 'Fabric', library: 'Library', linq: 'LINQ' };

assert.equal(new Set(projects.map(p => p.slug)).size, projects.length, 'Duplicate project slug.');
for (const project of projects) {
  assert(/^[a-z0-9-]+$/.test(project.slug), 'Invalid project slug.');
  assert(categories.includes(project.category), 'Unknown category.');
  assert(project.tags.every(tag => Object.hasOwn(tags, tag)), 'Unknown tag.');
  assert(typeof project.heading === 'string' && project.heading.trim(), `Missing heading: ${project.slug}`);
  assert(typeof project.glyph === 'string' && project.glyph.trim(), `Missing glyph: ${project.slug}`);
  for (const key of [project.summaryKey, project.eyebrowKey, project.leadKey, project.overviewKey]) {
    assert(Object.hasOwn(zh, key), `Missing translation: ${key}`);
  }
  assert(project.features.length >= 2, `Not enough features: ${project.slug}`);
  assert(project.steps.length >= 2, `Not enough steps: ${project.slug}`);
  const keys = [
    ...project.features.flatMap(feature => [feature.titleKey, feature.descriptionKey]),
    ...project.steps.flatMap(step => [step.titleKey, step.descriptionKey]),
    ...project.facts.flatMap(fact => [fact.labelKey, ...(fact.valueKey ? [fact.valueKey] : [])]),
    ...(project.notes || []),
    ...(project.sourceLinks || []).flatMap(link => link.labelKey ? [link.labelKey] : []),
    ...(project.sections || []).flatMap(section => [section.titleKey, ...(section.introKey ? [section.introKey] : []), ...(section.noteKey ? [section.noteKey] : []), ...(section.items || []).flatMap(item => [item.titleKey, item.descriptionKey]), ...(section.blocks || []).flatMap(block => block.titleKey ? [block.titleKey] : [])]),
    ...(project.related ? [project.related.descriptionKey] : [])
  ];
  for (const key of keys) assert(Object.hasOwn(zh, key), `Missing translation: ${key}`);
  if (projects.some(other => other !== project && other.slug === project.slug)) assert.fail('Duplicate slug.');
  if (project.dependency) validateDependency(project.dependency);
  if (project.downloads) {
    assert.equal(project.category, 'minecraft', 'Mod downloads belong to Minecraft projects.');
    const patterns = { modrinth: /^https:\/\/modrinth\.com\/mod\/[a-z0-9-]+\/versions$/, curseforge: /^https:\/\/www\.curseforge\.com\/minecraft\/mc-mods\/[a-z0-9-]+\/files$/ };
    for (const [platform, url] of Object.entries(project.downloads)) {
      assert(patterns[platform]?.test(url), `Invalid ${platform} download page for ${project.slug}.`);
    }
  }
  if (project.javadoc) {
    assert.equal(project.category, 'general', 'Javadoc navigation belongs to general-purpose projects.');
    assert(['available', 'unavailable'].includes(project.javadoc.status), 'Unknown Javadoc status.');
    for (const key of project.javadoc.status === 'available' ? ['url', 'versionUrl'] : ['versionsUrl']) {
      assert.equal(new URL(project.javadoc[key]).origin, 'https://javadoc.io', 'Expected a verified Javadoc host.');
    }
  }
}
assert.equal(new Set(projects.map(p => p.slug)).size, projects.length, 'Duplicate project slug.');

const t = (key, tag = 'span') => {
  assert(Object.hasOwn(zh, key), `Missing key ${key}`);
  return `<${tag} data-i18n="${key}">${esc(zh[key])}</${tag}>`;
};
const link = (href, key, cls = '') => `<a${cls ? ` class="${cls}"` : ''} href="${href}" data-i18n="${key}">${esc(zh[key])}</a>`;
const external = (url, key, attributes = '') => `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer"${attributes}>${t(key)}<span aria-hidden="true"> ↗</span></a>`;
const write = async (file, content) => {
  const target = path.join(root, file);
  await mkdir(path.dirname(target), { recursive: true });
  if (await readFile(target, 'utf8').catch(() => null) !== content) await writeFile(target, content, 'utf8');
};
function withTutorialNavigation(html, href) {
  if (html.includes('data-i18n="nav.tutorials"')) return html;
  return html.replace(/(<a class="nav-link"[^>]*data-i18n="nav.directory")/, `<a class="nav-link" href="${href}" data-i18n="nav.tutorials">${esc(zh['nav.tutorials'])}</a>\n        $1`);
}

/* ------------------------------------------------------------------ */
/* Home                                                                */
/* ------------------------------------------------------------------ */

let home = withTutorialNavigation(await readFile(path.join(root, 'index.html'), 'utf8'), './tutorials/index.html');
const nestedLinks = html => html.replace(/href="([^\"]+)"/g, (match, href) => {
  if (/^https?:/.test(href)) return match;
  const destination = new URL(href, 'https://site.invalid/index.html');
  return `href="../${destination.pathname.slice(1)}${destination.search}${destination.hash}"`;
});
const header = nestedLinks(home.match(/<header class="site-header">[\s\S]*?<\/header>/)[0]);
const footer = nestedLinks(home.match(/<footer class="site-footer">[\s\S]*?<\/footer>/)[0]);

const byCategory = category => projects.filter(p => p.category === category);
const byTag = tag => projects.filter(p => p.tags.includes(tag));

function directionCard({ index, modifier, href, extra = '', kicker, glyph, titleKey, descriptionKey, metaKey, list }) {
  return `<a class="direction-card ${modifier}" href="${href}"${extra}>
          <div class="direction-top"><span>${String(index).padStart(2, '0')} / ${kicker}</span><span class="direction-glyph" aria-hidden="true">${glyph}</span></div>
          <h3 data-i18n="${titleKey}">${esc(zh[titleKey])}</h3>
          <p data-i18n="${descriptionKey}">${esc(zh[descriptionKey])}</p>
          <ul class="direction-list">${list.map(item => item.key ? `<li data-i18n="${item.key}">${esc(zh[item.key])}</li>` : `<li>${esc(item.text)}</li>`).join('')}</ul>
          <div class="direction-foot"><span data-i18n="${metaKey}">${esc(zh[metaKey])}</span><span class="direction-arrow" aria-hidden="true">→</span></div>
        </a>`;
}

const directionCards = [
  directionCard({
    index: 1, modifier: 'direction-java', href: './categories/general.html', kicker: 'JAVA',
    glyph: '{ }', titleKey: 'direction.java.title', descriptionKey: 'direction.java.description', metaKey: 'direction.java.meta',
    list: byCategory('general').map(project => ({ text: project.name }))
  }),
  directionCard({
    index: 2, modifier: 'direction-minecraft', href: './categories/minecraft.html', kicker: 'MINECRAFT',
    glyph: '[ ]', titleKey: 'direction.minecraft.title', descriptionKey: 'direction.minecraft.description', metaKey: 'direction.minecraft.meta',
    list: byCategory('minecraft').map(project => ({ text: project.name }))
  }),
  directionCard({
    index: 3, modifier: 'direction-tutorial', href: './tutorials/index.html', extra: ' id="tutorials"', kicker: 'TUTORIAL',
    glyph: '( )', titleKey: 'direction.tutorial.title', descriptionKey: 'direction.tutorial.description', metaKey: 'direction.tutorial.meta',
    list: [{ key: 'tutorial.chapter00.title' }]
  })
].join('\n        ');

const workCards = projects.map((project, index) => `<article class="work-card" data-project="${project.slug}">
          <a href="./projects/${project.slug}.html">
            <div class="work-top"><span>${String(index + 1).padStart(2, '0')} / ${project.category === 'general' ? 'JAVA' : 'FABRIC'}</span><span class="work-arrow" aria-hidden="true">↗</span></div>
            <h3>${esc(project.heading)}</h3>
            <p data-i18n="${project.summaryKey}">${esc(zh[project.summaryKey])}</p>
            <ul class="tag-row">${project.tags.map(tag => `<li>${esc(tags[tag])}</li>`).join('')}</ul>
          </a>
        </article>`).join('\n        ');

home = home.replace(/(<!-- directions:start -->)[\s\S]*?(<!-- directions:end -->)/, (_, start, end) => `${start}\n        ${directionCards}\n        ${end}`);
home = home.replace(/(<!-- works:start -->)[\s\S]*?(<!-- works:end -->)/, (_, start, end) => `${start}\n        ${workCards}\n        ${end}`);

/* ------------------------------------------------------------------ */
/* Shared shells                                                       */
/* ------------------------------------------------------------------ */

function page(file, title, description, content, type = 'catalog') {
  const self = './' + path.posix.basename(file);
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="theme-color" content="#0a0711" />
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
  <a class="skip-link" href="#main" data-i18n="project.skip">跳到主要内容</a>
  ${header}
  <main id="main" tabindex="-1">${content}</main>
  ${footer}
</body>
</html>
`;
}

const hero = ({ eyebrow, title, lead, breadcrumbs = '', actions = '' }) => `<section class="project-hero">
      <div class="hero-stars" aria-hidden="true"></div>
      <div class="hero-aurora" aria-hidden="true"></div>
      <div class="project-hero-inner">
        ${breadcrumbs ? `<nav class="breadcrumbs" aria-label="当前位置" data-i18n-aria-label="nav.breadcrumb">${breadcrumbs}</nav>` : ''}
        <p class="eyebrow"><span class="eyebrow-dot"></span>${eyebrow}</p>
        <h1>${title}</h1>
        <p class="project-lead">${lead}</p>
        ${actions ? `<div class="project-actions">${actions}</div>` : ''}
      </div>
    </section>`;

function rows(items) {
  return `<div class="catalog-rows">${items.map(project => `<article class="catalog-row" data-project="${project.slug}">
        <div class="catalog-row-main">
          <h3><a href="../projects/${project.slug}.html">${esc(project.heading)} <span class="row-arrow" aria-hidden="true">↗</span></a></h3>
          ${t(project.summaryKey, 'p')}
        </div>
        <ul class="tag-row">${project.tags.map(tag => `<li>${esc(tags[tag])}</li>`).join('')}</ul>
        <div class="catalog-actions">${link(`../projects/${project.slug}.html`, 'project.explore')}${project.javadoc ? link(`../javadoc/${project.slug}.html`, 'javadoc.label') : ''}${project.downloads ? link(`../downloads/${project.slug}.html`, 'downloads.label') : ''}</div>
      </article>`).join('\n      ')}</div>`;
}

function group(id, title, description, items) {
  return `<section class="catalog-group" id="${id}"><h2>${title} <small>(${items.length})</small></h2>${description ? t(description, 'p') : ''}${rows(items)}</section>`;
}

function categoryLinks(current = '') {
  return categories.map(category => `<a href="../categories/${category}.html"${current === category ? ' aria-current="page"' : ''}>${t(`category.${category}`)}<small>${byCategory(category).length}</small></a>`).join('');
}

/* ------------------------------------------------------------------ */
/* Catalog, category and tag pages                                     */
/* ------------------------------------------------------------------ */

for (const kind of ['projects', 'categories', 'tags']) {
  const file = `${kind}/index.html`;
  const isTags = kind === 'tags';
  const isCategories = kind === 'categories';
  const categoryGrid = `<div class="category-grid">${categories.map(category => {
    const items = byCategory(category);
    return `<a class="category-card category-${category}" href="../categories/${category}.html" data-category="${category}">
      <div class="category-top"><span class="category-symbol" aria-hidden="true">${category === 'minecraft' ? '[ mc ]' : '{ java }'}</span><span>${String(items.length).padStart(2, '0')}</span></div>
      <h3 data-i18n="category.${category}">${esc(zh[`category.${category}`])}</h3>
      <p data-i18n="category.${category}.description">${esc(zh[`category.${category}.description`])}</p>
      <p class="category-projects">${items.map(project => esc(project.name)).join(' · ')}</p>
      <div class="category-footer"><span class="category-count">${items.length} ${t('catalog.countLabel')}</span><span>${t('catalog.openCategory')} <span aria-hidden="true">→</span></span></div>
    </a>`;
  }).join('\n')}</div>`;
  const content = isTags
    ? Object.entries(tags).map(([tag, name]) => group(tag, esc(name), '', byTag(tag))).join('\n')
    : isCategories ? categoryGrid : `${categoryGrid}
        ${group('all', t('catalog.allProjects'), '', projects)}`;
  const title = isTags ? 'catalog.tagTitle' : 'catalog.title';
  const intro = isTags ? 'catalog.tagIntro' : isCategories ? 'catalog.categoryIntro' : 'catalog.lead';
  const heading = isTags ? 'catalog.tags' : isCategories ? 'catalog.categoryTitle' : 'catalog.heading';
  const jumps = Object.entries(tags).map(([tag, name]) => `<a href="#${tag}">${name}<small>${byTag(tag).length}</small></a>`).join('');
  await write(file, page(file, title, 'catalog.description', `
    ${hero({ eyebrow: isTags ? 'TAGS / INDEX' : 'PROJECT DIRECTORY', title: t(heading, 'span'), lead: t(intro, 'span') })}
    <div class="catalog-layout${isTags ? '' : ' catalog-layout-wide'}" id="directory">
      <div class="catalog-main">
        <nav class="catalog-tabs" aria-label="目录导航" data-i18n-aria-label="catalog.indexLabel">${[['projects', 'catalog.all'], ['tags', 'catalog.tags']].map(([dir, key]) => `<a href="../${dir}/index.html"${(dir === kind || (dir === 'projects' && kind === 'categories')) ? ' aria-current="page"' : ''} data-i18n="${key}">${esc(zh[key])}</a>`).join('')}</nav>
        ${content}
        ${isTags ? '' : `<a class="all-projects" href="https://github.com/Piscescup?tab=repositories" target="_blank" rel="noopener noreferrer"><span data-i18n="home.projects.more">更多项目及开发进展，请参阅 GitHub 仓库。</span><strong>${t('home.projects.repositories')} <span aria-hidden="true">↗</span></strong></a>`}
      </div>
      ${isTags ? `<aside class="catalog-aside">${t('catalog.jump', 'h2')}${jumps}</aside>` : ''}
    </div>`, 'catalog'));
}

for (const category of categories) {
  const file = `categories/${category}.html`;
  await write(file, page(file, `category.${category}.pageTitle`, `category.${category}.description`, `
    ${hero({
      eyebrow: category === 'minecraft' ? 'MINECRAFT / FABRIC' : 'JAVA / LIBRARIES',
      title: t(`category.${category}`, 'span'),
      lead: t(`category.${category}.description`, 'span'),
      breadcrumbs: `${link('../projects/index.html', 'catalog.heading')}<span aria-hidden="true">/</span><span aria-current="page" data-i18n="category.${category}">${esc(zh[`category.${category}`])}</span>`
    })}
    <div class="catalog-layout" id="directory">
      <div class="catalog-main">
        ${link('../projects/index.html', 'catalog.backCategories', 'catalog-home-link')}
        ${group(category, t('catalog.inCategory'), '', byCategory(category))}
      </div>
      <aside class="catalog-aside">${t('catalog.categories', 'h2')}${categoryLinks(category)}</aside>
    </div>`, 'catalog'));
}

/* ------------------------------------------------------------------ */
/* Download and Javadoc pages                                          */
/* ------------------------------------------------------------------ */

for (const project of projects.filter(p => p.downloads)) {
  const file = `downloads/${project.slug}.html`;
  const platforms = ['modrinth', 'curseforge'].map(platform => {
    const url = project.downloads[platform];
    return `<section class="download-platform download-${platform}"><p class="download-label" aria-hidden="true">PLATFORM / ${platform}</p><h2>${platform === 'modrinth' ? 'Modrinth' : 'CurseForge'}</h2>${t(`downloads.${platform}Description`, 'p')}${url ? external(url, `downloads.${platform}`, ' class="hero-button"') : t('downloads.pending', 'p')}</section>`;
  }).join('\n');
  await write(file, page(file, `downloads.${project.slug}.title`, 'downloads.description', `
    ${hero({
      eyebrow: 'MOD DOWNLOADS',
      title: esc(project.heading),
      lead: t('downloads.description', 'span'),
      breadcrumbs: `${link('../categories/minecraft.html', 'category.minecraft')}<span aria-hidden="true">/</span><a href="../projects/${project.slug}.html">${esc(project.heading)}</a><span aria-hidden="true">/</span><span aria-current="page" data-i18n="downloads.label">${esc(zh['downloads.label'])}</span>`
    })}
    <div class="catalog-layout" id="directory">
      <div class="catalog-main">
        <div class="download-platforms">${platforms}</div>
        <p class="section-note">${t('downloads.chooseVersion')}</p>
        <div class="docs-links">${external(project.repository, 'project.github')}${link(`../projects/${project.slug}.html`, 'javadoc.backProject')}</div>
      </div>
      <aside class="catalog-aside">${t('catalog.categories', 'h2')}${categoryLinks('minecraft')}</aside>
    </div>`, 'catalog'));
}

for (const project of projects.filter(p => p.javadoc)) {
  const doc = project.javadoc;
  const available = doc.status === 'available';
  const groupId = doc.groupId || project.dependency?.groupId || 'io.github.piscescup';
  const artifactId = doc.artifactId || project.dependency?.artifactId || project.slug;
  const urls = globalThis.siteJavadoc.urls(groupId, artifactId);
  const file = `javadoc/${project.slug}.html`;
  const html = page(file, `javadoc.${project.slug}.title`, 'javadoc.description', `
    ${hero({
      eyebrow: 'API REFERENCE',
      title: `${esc(project.heading)} · Javadoc`,
      lead: t('javadoc.description', 'span'),
      breadcrumbs: `${link('../categories/general.html', 'category.general')}<span aria-hidden="true">/</span><a href="../projects/${project.slug}.html">${esc(project.heading)}</a><span aria-hidden="true">/</span><span aria-current="page">Javadoc</span>`
    })}
    <div class="catalog-layout" id="directory" data-javadoc data-group-id="${esc(groupId)}" data-artifact-id="${esc(artifactId)}">
      <div class="catalog-main">
        <section class="docs-status" data-javadoc-status="${available ? 'snapshot' : 'unknown'}" role="status" aria-live="polite" aria-atomic="true"><h2 data-javadoc-heading data-i18n="javadoc.${available ? 'snapshot' : 'unknown'}">${esc(zh[`javadoc.${available ? 'snapshot' : 'unknown'}`])}</h2><p data-javadoc-description data-i18n="javadoc.${available ? 'snapshot' : 'unknown'}Description">${esc(zh[`javadoc.${available ? 'snapshot' : 'unknown'}Description`])}</p></section>
        <button class="docs-retry" type="button" data-javadoc-retry hidden data-i18n="javadoc.retry">${esc(zh['javadoc.retry'])}</button>
        <h2 data-i18n="javadoc.links">${esc(zh['javadoc.links'])}</h2>
        <div class="docs-links">
          ${external(urls.doc, 'javadoc.open')}${external(available ? doc.versionUrl : urls.doc, 'javadoc.fixedVersion', ` data-javadoc-fixed${available ? '' : ' hidden'}`)}${external(urls.versions, 'javadoc.versions')}
          ${external(project.repository + '#readme', 'javadoc.readme')}
          ${link(`../projects/${project.slug}.html`, 'javadoc.backProject')}
        </div>
      </div>
      <aside class="catalog-aside">
        <h2 data-i18n="project.facts">${esc(zh['project.facts'])}</h2>
        <p>${t('javadoc.coordinate')}<br /><span class="docs-coordinate">${esc(groupId)}:<wbr />${esc(artifactId)}</span></p>
        <p><span data-javadoc-version-label data-i18n="javadoc.snapshotVersion">${esc(zh['javadoc.snapshotVersion'])}</span><br /><span data-javadoc-version>${available ? esc(doc.version) : '—'}</span></p>
        <p><span data-javadoc-checked-label data-i18n="javadoc.snapshotChecked">${esc(zh['javadoc.snapshotChecked'])}</span><br /><time data-javadoc-checked datetime="${doc.checkedAt}">${doc.checkedAt}</time></p>
        ${link('../categories/general.html', 'category.general')}
      </aside>
    </div>`, 'catalog');
  await write(file, html.replace('</head>', '  <script src="../js/javadoc-status.js" defer></script>\n  <script src="../js/javadoc.js" defer></script>\n</head>'));
}

/* ------------------------------------------------------------------ */
/* One project page per manifest entry, drawn from templates/project.html */
/* ------------------------------------------------------------------ */

for (const project of projects) {
  await write(`projects/${project.slug}.html`, renderProjectPage(project, {
    zh, header, footer, template: projectTemplate, exampleGroup: examples[project.slug]
  }));
}

/* ------------------------------------------------------------------ */
/* Home, tutorials, 404 and the translation bundle                     */
/* ------------------------------------------------------------------ */

await write('index.html', translateHtml(home, zh));
await generateTutorials({ zh, write, header, footer });
let notFound = page('404.html', 'notFound.title', 'notFound.description', `${hero({
  eyebrow: '404 / NOT FOUND',
  title: t('notFound.heading', 'span'),
  lead: t('notFound.description', 'span'),
  actions: `${link('../index.html', 'nav.home', 'hero-button')}${link('../projects/index.html', 'nav.directory', 'source-button')}`
})}`);
notFound = notFound.replace(/(href|src)="\.\.\//g, '$1="/').replace(/href="\/index.html/g, 'href="/index.html').replace('<script src="/js/translations.js"', '<script src="/js/legacy-routes.js" defer></script>\n  <script src="/js/translations.js"');
await write('404.html', notFound);
await write('js/translations.js', bundleLocales(dictionaries));
for (const file of (await publicFiles()).filter(file => file.endsWith('.html'))) {
  const html = await readFile(path.join(root, file), 'utf8');
  await write(file, translateHtml(html, zh));
}
console.log(`Generated ${categories.length} categories, ${projects.length} project entries, Javadoc navigation and ${Object.keys(zh).length} translation keys.`);
