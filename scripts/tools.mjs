import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { root } from './site-files.mjs';
import { escapeHtml as esc } from './locales.mjs';

export async function loadTools() {
  const tools = JSON.parse(await readFile(path.join(root, 'data/tools.json'), 'utf8'));
  assert.equal(new Set(tools.map(tool => tool.slug)).size, tools.length, 'Duplicate tool slug.');
  for (const tool of tools) {
    assert(/^[a-z0-9-]+$/.test(tool.slug), 'Invalid tool slug.');
    assert(/^\d{2}$/.test(tool.number), 'Invalid tool number.');
    assert.equal(tool.template, `templates/tools/${tool.slug}.html`, 'Unexpected tool template path.');
    assert(Array.isArray(tool.scripts), 'Tool scripts must be an array.');
    assert(Array.isArray(tool.tags) && tool.tags.length > 0, 'Tool requires at least one tag.');
  }
  return tools;
}

export async function generateTools({ zh, write, header, footer }) {
  const tools = await loadTools();
  const text = (key, tag = 'span', attributes = '') => {
    assert(Object.hasOwn(zh, key), `Missing tool translation: ${key}`);
    return `<${tag} data-i18n="${key}"${attributes}>${esc(zh[key])}</${tag}>`;
  };

  function toolShell(file, titleKey, descriptionKey, content, extraScripts = []) {
    const self = './' + path.posix.basename(file);
    const scriptTags = extraScripts.map(script => `  <script src="../js/${script}.js" defer></script>`).join('\n');
    return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="theme-color" content="#faf9f5" />
  <meta name="description" content="${esc(zh[descriptionKey])}" data-i18n-content="${descriptionKey}" />
  <title data-i18n="${titleKey}">${esc(zh[titleKey])}</title>
  <link rel="icon" type="image/svg+xml" href="../assets/favicon.svg" />
  <link rel="stylesheet" href="../css/styles.css" />
  <link rel="stylesheet" href="../css/projects.css" />
  <link rel="stylesheet" href="../css/catalog.css" />
  <link rel="stylesheet" href="../css/tools.css" />
  <link rel="alternate" hreflang="zh-CN" href="${self}?lang=zh-CN" />
  <link rel="alternate" hreflang="en" href="${self}?lang=en" />
  <script src="../js/theme-boot.js"></script>
  <script src="../js/translations.js" defer></script>
  <script src="../js/i18n.js" defer></script>
  <script src="../js/script.js" defer></script>
${scriptTags ? `${scriptTags}\n` : ''}</head>
<body class="project-page tool-page" data-page="tool" id="top">
  <a class="skip-link" href="#main" data-i18n="project.skip">跳到主要内容</a>
  ${header}
  <main id="main" tabindex="-1">${content}</main>
  ${footer}
</body>
</html>
`;
  }

  const cards = tools.map(tool => `<article class="tool-card" data-tool-card="${tool.slug}">
          <a href="./${tool.slug}.html">
            <div class="tool-card-top">
              <span class="tool-card-kicker"><span class="domain-dot" aria-hidden="true"></span>${tool.number} / ${esc(tool.eyebrow)}</span>
              <span class="tool-card-glyph" aria-hidden="true">${esc(tool.glyph)}</span>
            </div>
            ${text(tool.titleKey, 'h2')}
            ${text(tool.summaryKey, 'p')}
            <ul class="tag-row">${tool.tags.map(tagKey => `<li data-i18n="${tagKey}">${esc(zh[tagKey])}</li>`).join('')}</ul>
            <div class="tool-card-foot">
              ${text(tool.metaKey)}
              <span class="tool-card-cta">${text('tools.open')} <span aria-hidden="true">→</span></span>
            </div>
          </a>
        </article>`).join('\n        ');

  const indexContent = `
    <section class="project-hero">
      <div class="project-hero-inner">
        <nav class="breadcrumbs" aria-label="当前位置" data-i18n-aria-label="nav.breadcrumb"><a href="../index.html" data-i18n="nav.home">${esc(zh['nav.home'])}</a><span aria-hidden="true">/</span><span aria-current="page" data-i18n="nav.tools">${esc(zh['nav.tools'])}</span></nav>
        <p class="eyebrow"><span class="eyebrow-dot"></span>UTILITIES / BROWSER TOOLS</p>
        ${text('tools.heading', 'h1')}
        ${text('tools.lead', 'p', ' class="project-lead"')}
      </div>
    </section>
    <div class="tools-directory" id="tools-list">
      <div class="tools-grid">
        ${cards}
      </div>
      <div class="tools-note-card">
        <strong data-i18n="tools.note.title">${esc(zh['tools.note.title'])}</strong>
        <p data-i18n="tools.note.description">${esc(zh['tools.note.description'])}</p>
      </div>
    </div>`;

  await write('tools/index.html', toolShell('tools/index.html', 'tools.pageTitle', 'tools.description', indexContent));

  for (const tool of tools) {
    const body = await readFile(path.join(root, tool.template), 'utf8');
    const detailContent = `
    <section class="project-hero tool-hero">
      <div class="project-hero-inner">
        <nav class="breadcrumbs" aria-label="当前位置" data-i18n-aria-label="nav.breadcrumb">
          <a href="../index.html" data-i18n="nav.home">${esc(zh['nav.home'])}</a>
          <span aria-hidden="true">/</span>
          <a href="./index.html" data-i18n="nav.tools">${esc(zh['nav.tools'])}</a>
          <span aria-hidden="true">/</span>
          <span aria-current="page" data-i18n="${tool.titleKey}">${esc(zh[tool.titleKey])}</span>
        </nav>
        <p class="eyebrow"><span class="eyebrow-dot"></span>${tool.number} / ${esc(tool.eyebrow)}</p>
        ${text(tool.titleKey, 'h1')}
        ${text(tool.descriptionKey, 'p', ' class="project-lead"')}
      </div>
    </section>
    <div class="tool-shell">
      ${body}
    </div>`;
    await write(`tools/${tool.slug}.html`, toolShell(`tools/${tool.slug}.html`, tool.pageTitleKey, tool.descriptionKey, detailContent, tool.scripts));
  }
}
