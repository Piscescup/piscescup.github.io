import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { root } from './site-files.mjs';
import { escapeHtml as esc } from './locales.mjs';
import { dependencyWidget } from './dependencies.mjs';
import { renderExamples } from './examples.mjs';

const tagNames = { java: 'Java', 'java-25': 'Java 25', minecraft: 'Minecraft', fabric: 'Fabric', library: 'Library', linq: 'LINQ' };

export async function loadProjectTemplate() {
  return readFile(path.join(root, 'templates/project.html'), 'utf8');
}

function text(dict, key) {
  assert(Object.hasOwn(dict, key), `Missing translation: ${key}`);
  return dict[key];
}

/**
 * One template, every project. Content lives in data/projects.json; prose lives
 * in locales/*.json. Adding a project means editing those two files only.
 */
export function renderProjectPage(project, { zh, header, footer, template, exampleGroup }) {
  const t = (key, attributes = '') => {
    assert(Object.hasOwn(zh, key), `Missing project translation: ${key}`);
    return `<span data-i18n="${key}"${attributes}>${esc(zh[key])}</span>`;
  };
  const external = (url, content) => `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${content} <span aria-hidden="true">↗</span></a>`;
  const internal = (href, content, attributes = '') => `<a href="${esc(href)}"${attributes}>${content}</a>`;

  const breadcrumbs = [
    internal('../projects/index.html', t('catalog.heading')),
    '<span aria-hidden="true">/</span>',
    internal(`../categories/${project.category}.html`, t(`category.${project.category}`)),
    '<span aria-hidden="true">/</span>',
    `<span aria-current="page">${esc(project.heading)}</span>`
  ].join('');

  const tags = project.tags.map(tag => `<li>${esc(tagNames[tag])}</li>`).join('');

  const actions = [
    `<a class="hero-button" href="#getting-started">${t('project.getStarted')} <span aria-hidden="true">↓</span></a>`,
    `<a class="source-button" href="${esc(project.repository)}" target="_blank" rel="noopener noreferrer">${t('project.github')} <span aria-hidden="true">↗</span></a>`
  ];
  if (project.downloads) actions.push(internal(`../downloads/${project.slug}.html`, t('downloads.label'), ' class="source-button" data-project-downloads'));
  if (project.javadoc) actions.push(internal(`../javadoc/${project.slug}.html`, t('javadoc.label'), ' class="source-button" data-project-javadoc'));

  const facts = project.facts.map(fact => `<div><dt data-i18n="${fact.labelKey}">${esc(text(zh, fact.labelKey))}</dt><dd>${fact.valueKey ? t(fact.valueKey) : esc(fact.value)}</dd></div>`).join('\n        ');
  const asideLinks = [
    ...(project.asideLinks || []).map(link => `<a class="sequence-link" href="${esc(link.href)}">${esc(link.label)}</a>`),
    external(project.repository, t('project.source')),
    external(`${project.repository}/issues`, t('project.feedback'))
  ].join('\n        ');

  const sections = [];
  const sectionLinks = [];
  const push = (id, linkKey, build) => {
    const index = sections.length + 1;
    sections.push({ id, number: index, build });
    sectionLinks.push({ id, linkKey });
  };

  push('overview', 'project.overview', ({ number }) => `
      <section id="overview" class="detail-section" aria-labelledby="overview-title">
        <p class="eyebrow">${String(number).padStart(2, '0')} / OVERVIEW</p>
        <h2 id="overview-title">${t('project.overview')}</h2>
        <p>${t(project.overviewKey)}</p>
      </section>`);

  push('features', 'project.features', ({ number }) => `
      <section id="features" class="detail-section" aria-labelledby="features-title">
        <p class="eyebrow">${String(number).padStart(2, '0')} / FEATURES</p>
        <h2 id="features-title">${t('project.features')}</h2>
        <div class="feature-grid">${project.features.map((feature, index) => `
          <article class="feature-item">
            <span class="feature-index" aria-hidden="true">${String(index + 1).padStart(2, '0')}</span>
            <h3>${t(feature.titleKey)}</h3>
            <p>${t(feature.descriptionKey)}</p>
          </article>`).join('')}
        </div>
      </section>`);

  for (const section of project.sections || []) {
    push(section.id, section.titleKey, ({ number }) => {
      const head = `
        <p class="eyebrow">${String(number).padStart(2, '0')} / ${section.eyebrow}</p>
        <h2>${t(section.titleKey)}</h2>`;
      if (section.type === 'cards') {
        return `
      <section id="${section.id}" class="detail-section">
        ${head}
        ${t(section.introKey, ' class="section-note"')}
        <div class="sequence-grid">${section.items.map(item => `
          <article class="feature-item feature-item-code"${item.id ? ` id="${item.id}"` : ''}>
            <code translate="no" class="notranslate">${esc(item.code)}</code>
            <h3>${item.term ? `<span translate="no" class="notranslate">${esc(item.term)}</span> ` : ''}${t(item.titleKey)}</h3>
            <p>${t(item.descriptionKey)}</p>
          </article>`).join('')}
        </div>
      </section>`;
      }
      assert.equal(section.type, 'code', `Unknown project section type: ${section.type}`);
      return `
      <section id="${section.id}" class="detail-section">
        ${head}
        ${section.blocks.map(block => `${block.titleKey ? `<h3 id="${block.id}">${t(block.titleKey)}</h3>` : ''}
        <pre class="code-example" tabindex="0"${block.titleKey ? ` aria-labelledby="${block.id}"` : ''}><code translate="no" class="notranslate">${esc(block.code)}</code></pre>`).join('\n        ')}
        ${section.noteKey ? `<p class="section-note">${t(section.noteKey)}</p>` : ''}
      </section>`;
    });
  }

  push('getting-started', 'project.start', ({ number }) => `
      <section id="getting-started" class="detail-section" aria-labelledby="getting-started-title">
        <p class="eyebrow">${String(number).padStart(2, '0')} / GET STARTED</p>
        <h2 id="getting-started-title">${t('project.start')}</h2>
        <ol class="steps">${project.steps.map((step, index) => `
          <li>
            <span class="step-index" aria-hidden="true">${String(index + 1).padStart(2, '0')}</span>
            <div><h3>${t(step.titleKey)}</h3><p>${t(step.descriptionKey)}</p></div>
          </li>`).join('')}
        </ol>
        ${(project.notes || []).map(note => `<p class="source-note">${t(note)}</p>`).join('\n        ')}
        ${project.dependency ? `<!-- dependency:start -->\n${dependencyWidget(project, zh)}\n<!-- dependency:end -->` : ''}
        ${(project.sourceLinks || []).length ? `<div class="source-links">${project.sourceLinks.map(link => link.labelKey ? external(link.url, t(link.labelKey)) : external(link.url, esc(link.label))).join('\n          ')}</div>` : ''}
      </section>`);

  if (exampleGroup) {
    push('examples', 'examples.heading', ({ number }) => `
      <section id="examples" class="detail-section" aria-labelledby="examples-title">
        <p class="eyebrow">${String(number).padStart(2, '0')} / EXAMPLES</p>
        <h2 id="examples-title">${t('examples.heading')}</h2>
        <!-- examples:start -->
        ${renderExamples(exampleGroup, zh)}
        <!-- examples:end -->
      </section>`);
  }

  if (project.related) {
    sections.push({
      id: 'related',
      number: sections.length + 1,
      build: () => `
      <section class="detail-section detail-related" aria-labelledby="related-title">
        <p class="eyebrow">RELATED</p>
        <h2 id="related-title">${t('catalog.related')}</h2>
        <p>${t(project.related.descriptionKey)}</p>
        <p class="related-links">${project.related.links.map(link => link.external ? external(link.href, esc(link.label)) : internal(link.href, esc(link.label), ' class="related-link"')).join('<span aria-hidden="true"> · </span>')}</p>
      </section>`
    });
  }

  const tokens = {
    HEADER: header,
    FOOTER: footer,
    BREADCRUMBS: breadcrumbs,
    EYEBROW: t(project.eyebrowKey),
    HEADING: esc(project.heading),
    LEAD_KEY: project.leadKey,
    LEAD: esc(zh[project.leadKey]),
    TAGS: tags,
    ACTIONS: actions.join('\n          '),
    GLYPH: esc(project.glyph),
    SLUG: esc(project.slug),
    SECTION_LINKS: sectionLinks.map(link => `<a href="#${link.id}">${t(link.linkKey)}</a>`).join(''),
    SECTION_META: `${t(`category.${project.category}`)} · ${esc(project.heading)}`,
    SECTIONS: sections.map(section => section.build(section)).join('\n'),
    FACTS: facts,
    ASIDE_LINKS: asideLinks,
    FACT_LINKS: '',
    CATEGORY_HREF: `../categories/${project.category}.html`
  };

  let body = template;
  for (const [token, value] of Object.entries(tokens)) {
    assert(body.includes(`{{${token}}}`), `Project template is missing {{${token}}}.`);
    body = body.split(`{{${token}}}`).join(value);
  }
  assert.doesNotMatch(body, /\{\{[A-Z_]+\}\}/, 'Project template has an unknown token.');

  const scripts = ['translations', 'i18n'];
  if (project.dependency || exampleGroup) scripts.push('clipboard');
  if (project.dependency) scripts.push('dependency-formats', 'dependencies');
  if (exampleGroup) scripts.push('code-examples');
  scripts.push('script');
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="theme-color" content="#faf9f5" />
  <meta name="description" content="${esc(zh[project.summaryKey])}" data-i18n-content="${project.summaryKey}" />
  <title>${esc(project.heading)} · PiscesCup</title>
  <link rel="icon" type="image/svg+xml" href="../assets/favicon.svg" />
  <link rel="stylesheet" href="../css/styles.css" />
  <link rel="stylesheet" href="../css/projects.css" />
  <link rel="alternate" hreflang="zh-CN" href="./${project.slug}.html?lang=zh-CN" />
  <link rel="alternate" hreflang="en" href="./${project.slug}.html?lang=en" />
  <script src="../js/theme-boot.js"></script>
${scripts.map(script => `  <script src="../js/${script}.js" defer></script>`).join('\n')}
</head>
<body class="project-page" data-page="project" data-category="${esc(project.category)}" id="top">
  <a class="skip-link" href="#main" data-i18n="project.skip">跳到主要内容</a>
${body}
</body>
</html>
`;
}
