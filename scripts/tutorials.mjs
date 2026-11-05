import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { root } from './site-files.mjs';
import { escapeHtml as esc } from './locales.mjs';
import { renderTutorialReferences } from './tutorial-references.mjs';

export async function loadTutorials() {
  const chapters = JSON.parse(await readFile(path.join(root, 'data/tutorials.json'), 'utf8'));
  assert.equal(new Set(chapters.map(chapter => chapter.slug)).size, chapters.length, 'Duplicate tutorial slug.');
  for (const chapter of chapters) {
    assert(/^chapter-\d{2}$/.test(chapter.slug), 'Invalid chapter filename.');
    assert(['content-pending', 'published'].includes(chapter.status), 'Unknown chapter state.');
    assert(chapter.sections.length, 'A chapter needs a table of contents.');
    assert.equal(chapter.template, `templates/tutorials/${chapter.slug}.html`, 'Unexpected chapter source.');
    if (chapter.referenceFile) assert.equal(chapter.referenceFile, `data/tutorials/${chapter.slug}.references.json`, 'Unexpected reference file.');
  }
  return chapters;
}

export async function generateTutorials({ zh, write, header, footer }) {
  const chapters = await loadTutorials();
  const text = (key, tag = 'span', attributes = '') => {
    assert(Object.hasOwn(zh, key), `Missing tutorial translation: ${key}`);
    return `<${tag} data-i18n="${key}"${attributes}>${esc(zh[key])}</${tag}>`;
  };
  const side = current => `<aside class="tutorial-sidebar">
        <details class="tutorial-navigation" open>
          <summary data-i18n="tutorial.navigation">章节目录</summary>
          <nav aria-label="教程章节" data-i18n-aria-label="tutorial.chapterNav">
            <a class="tutorial-course-link" href="./index.html"${current === 'index' ? ' aria-current="page"' : ''}>${text('tutorial.overview')}</a>
            <p class="tutorial-group-title" data-i18n="tutorial.group">从这里开始</p>
            ${chapters.map(chapter => `<a class="tutorial-chapter-link" href="./${chapter.slug}.html"${current === chapter.slug ? ' aria-current="page"' : ''} data-tutorial-chapter="${chapter.slug}"><span class="tutorial-chapter-number">Chapter ${chapter.number}</span>${text(chapter.titleKey)}${chapter.status === 'content-pending' ? text('tutorial.pending.label', 'small') : ''}</a>`).join('\n')}
          </nav>
        </details>
        <a class="tutorial-back-home" href="../index.html"><span aria-hidden="true">←</span> ${text('tutorial.home')}</a>
      </aside>`;
  function documentPage(file, titleKey, descriptionKey, content, sections) {
    const self = './' + path.posix.basename(file);
    return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="theme-color" content="#101e2c" />
  <meta name="description" content="${esc(zh[descriptionKey])}" data-i18n-content="${descriptionKey}" />
  <title data-i18n="${titleKey}">${esc(zh[titleKey])}</title>
  <link rel="icon" type="image/svg+xml" href="../assets/favicon.svg" />
  <link rel="stylesheet" href="../css/styles.css" />
  <link rel="stylesheet" href="../css/tutorials.css" />
  <link rel="alternate" hreflang="zh-CN" href="${self}?lang=zh-CN" />
  <link rel="alternate" hreflang="en" href="${self}?lang=en" />
  <script src="../js/translations.js" defer></script>
  <script src="../js/i18n.js" defer></script>
  <script src="../js/clipboard.js" defer></script>
  <script src="../js/script.js" defer></script>
  <script src="../js/tutorials.js" defer></script>
</head>
<body class="tutorial-page" data-page="tutorial" id="top">
  <a class="skip-link" href="#tutorial-main" data-i18n="tutorial.skip">跳转到正文</a>
  ${header}
  <main class="tutorial-layout">
    ${side(path.posix.basename(file, '.html'))}
    <article class="tutorial-article" id="tutorial-main" tabindex="-1">
      <nav class="tutorial-breadcrumbs" aria-label="当前位置" data-i18n-aria-label="nav.breadcrumb"><a href="../index.html" data-i18n="nav.home">首页</a><span aria-hidden="true">/</span><a href="./index.html" data-i18n="nav.tutorials">教程</a>${file.endsWith('chapter-00.html') ? '<span aria-hidden="true">/</span><span aria-current="page">Chapter 00</span>' : ''}</nav>
      ${content}
    </article>
    <aside class="tutorial-toc" aria-labelledby="tutorial-toc-title">
      ${text('tutorial.onPage', 'h2', ' id="tutorial-toc-title"')}
      <nav aria-labelledby="tutorial-toc-title">${sections.map(section => `<a href="#${section.id}" data-tutorial-toc>${text(section.titleKey)}</a>`).join('')}</nav>
    </aside>
  </main>
  ${footer}
</body>
</html>
`;
  }
  const intro = `<header class="tutorial-heading" id="course">
        <p class="eyebrow">MINECRAFT / FABRIC</p>
        ${text('tutorial.title', 'h1')}
        ${text('tutorial.lead', 'p', ' class="tutorial-lead"')}
      </header>
      <section class="tutorial-section" id="about-course" aria-labelledby="about-course-title">
        ${text('tutorial.welcome.title', 'h2', ' id="about-course-title"')}
        ${text('tutorial.welcome.description', 'p')}
        <div class="tutorial-note">${text('tutorial.scope.title', 'strong')}${text('tutorial.scope.description', 'p')}</div>
      </section>
      <section class="tutorial-section" id="chapters" aria-labelledby="tutorial-chapters-title">
        <div class="tutorial-section-heading">${text('tutorial.chapters', 'h2', ' id="tutorial-chapters-title"')}<span class="tutorial-series-label">FABRIC</span></div>
        ${chapters.map(chapter => `<a class="tutorial-lesson-card" href="./${chapter.slug}.html" data-tutorial-card="${chapter.slug}"><span class="tutorial-lesson-number">${chapter.number}</span><div><p class="tutorial-chapter-number">Chapter ${chapter.number}</p>${text(chapter.titleKey, 'h3')}${text(chapter.descriptionKey, 'p')}${chapter.status === 'content-pending' ? text('tutorial.pending.label', 'small', ' class="tutorial-status"') : ''}</div><span class="tutorial-lesson-arrow" aria-hidden="true">→</span></a>`).join('\n')}
      </section>`;
  await write('tutorials/index.html', documentPage('tutorials/index.html', 'tutorial.pageTitle', 'tutorial.description', intro, [
    { id: 'about-course', titleKey: 'tutorial.welcome.title' }, { id: 'chapters', titleKey: 'tutorial.chapters' }
  ]));
  for (const chapter of chapters) {
    let body = await readFile(path.join(root, chapter.template), 'utf8');
    const references = chapter.referenceFile ? JSON.parse(await readFile(path.join(root, chapter.referenceFile), 'utf8')) : [];
    const rendered = renderTutorialReferences(body, references, zh);
    body = rendered.html;
    const sections = rendered.referenceCount ? [...chapter.sections, { id: 'references', titleKey: 'tutorial.bibliography' }] : chapter.sections;
    const metadata = chapter.metadata?.length ? `<div class="tutorial-reading-meta">${chapter.metadata.map(value => `<span>${esc(value)}</span>`).join('')}</div>` : '';
    // Keep the author's Java example in an editable source file, not in JSON escapes.
    for (const match of [...body.matchAll(/<code\b[^>]*data-tutorial-source="([^"]+)"[^>]*>[\s\S]*?<\/code>/g)]) {
      assert(/^examples\/tutorials\/[\w-]+\.java$/.test(match[1]), 'Unexpected tutorial code source.');
      const source = await readFile(path.join(root, match[1]), 'utf8');
      body = body.replace(match[0], () => match[0].replace(/>[\s\S]*<\/code>$/, () => '>' + esc(source) + '</code>'));
    }
    const content = `<header class="tutorial-heading"><p class="eyebrow">CHAPTER ${chapter.number} <span aria-hidden="true">/</span> FABRIC</p>${text(chapter.titleKey, 'h1')}${text(chapter.descriptionKey, 'p', ' class="tutorial-lead"')}${metadata}<div class="tutorial-byline"><span>PiscesCup</span>${chapter.status === 'content-pending' ? text('tutorial.pending.label', 'span', ' class="tutorial-status"') : ''}</div></header>
      <details class="tutorial-inline-toc"><summary data-i18n="tutorial.onPage">${esc(zh['tutorial.onPage'])}</summary><nav>${sections.map(section => `<a href="#${section.id}">${text(section.titleKey)}</a>`).join('')}</nav></details>
      ${body}
      <nav class="tutorial-pagination" aria-label="章节翻页" data-i18n-aria-label="tutorial.pagination"><a href="./index.html"><span aria-hidden="true">←</span><span>${text('tutorial.back', 'small')}${text('tutorial.title', 'strong')}</span></a></nav>`;
    await write(`tutorials/${chapter.slug}.html`, documentPage(`tutorials/${chapter.slug}.html`, `tutorial.${chapter.slug}.pageTitle`, chapter.descriptionKey, content, sections));
  }
}
