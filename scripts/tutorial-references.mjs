import assert from 'node:assert/strict';
import { escapeHtml as esc } from './locales.mjs';

// Citation markers sit outside the translated span, so language changes keep them.
export function renderTutorialReferences(body, sources, dictionary) {
  const catalog = new Map();
  for (const source of sources) {
    assert(/^[a-z][a-z0-9-]*$/.test(source.id), 'Invalid reference ID.');
    assert(!catalog.has(source.id), 'Duplicate reference ID: ' + source.id);
    assert(['https:', 'http:'].includes(new URL(source.url).protocol), 'Invalid reference URL.');
    assert(source.publisher && dictionary[source.titleKey], 'Incomplete reference: ' + source.id);
    catalog.set(source.id, source);
  }
  const used = [];
  const byUrl = new Map();
  let citationCount = 0;
  const html = body.replace(/<(p|h[2-4]|td|dd)\b([^>]*\bdata-cite="([^"]+)"[^>]*)>([\s\S]*?)<\/\1>/g, (_, tag, attributes, ids, inner) => {
    const records = [];
    for (const id of ids.trim().split(/\s+/)) {
      const source = catalog.get(id);
      assert(source, 'Unknown reference: ' + id);
      const url = new URL(source.url);
      url.hash = '';
      let record = byUrl.get(url.href);
      if (!record) {
        record = { ...source, number: used.length + 1, occurrences: [] };
        used.push(record);
        byUrl.set(url.href, record);
      }
      if (!records.includes(record)) records.push(record);
    }
    const links = records.map(record => {
      const id = `cite-${record.id}-${record.occurrences.length + 1}`;
      record.occurrences.push(id);
      citationCount++;
      return `<sup class="tutorial-citation" id="${id}" tabindex="-1"><a href="#ref-${record.id}" role="doc-noteref" data-citation="${record.number}" aria-describedby="tutorial-citation-label">[${record.number}]</a></sup>`;
    }).join('');
    const translation = attributes.match(/\bdata-i18n="([^"]+)"/);
    attributes = attributes.replace(/\s*data-cite="[^"]+"/, '').replace(/\s*data-i18n="[^"]+"/, '');
    const text = translation ? `<span data-i18n="${translation[1]}">${inner}</span>` : inner;
    return `<${tag}${attributes}>${text}${links}</${tag}>`;
  });
  assert(!/\bdata-cite=/.test(html), 'Citation is attached to an unsupported element.');
  if (!used.length) return { html, referenceCount: 0, citationCount: 0 };
  const translated = (key, tag = 'span', attributes = '') => {
    assert(dictionary[key], 'Missing reference translation: ' + key);
    return `<${tag} data-i18n="${key}"${attributes}>${esc(dictionary[key])}</${tag}>`;
  };
  const entries = used.map(record => `<li class="tutorial-reference-entry" id="ref-${record.id}" tabindex="-1" data-reference="${record.number}">
      <span class="tutorial-reference-number">[${record.number}]</span>
      <div class="tutorial-reference-body"><span class="tutorial-reference-publisher">${esc(record.publisher)}.</span> <a href="${esc(record.url)}" target="_blank" rel="noopener noreferrer">${translated(record.titleKey)}</a><span class="tutorial-reference-type"> [EB/OL].</span>
        <div class="tutorial-reference-meta"><span>${esc(new URL(record.url).hostname)}</span><nav class="tutorial-reference-backlinks" aria-describedby="tutorial-backlink-label">${record.occurrences.map((id, index) => `<a href="#${id}" role="doc-backlink" aria-describedby="tutorial-backlink-label">↩${record.occurrences.length > 1 ? index + 1 : ''}</a>`).join('')}</nav></div>
      </div>
    </li>`).join('\n');
  const bibliography = `<section class="tutorial-section tutorial-bibliography" id="references" role="doc-bibliography" aria-labelledby="references-title">
    ${translated('tutorial.bibliography', 'h2', ' id="references-title" data-section="REF"')}
    ${translated('tutorial.citation.open', 'span', ' id="tutorial-citation-label" class="tutorial-visually-hidden"')}
    ${translated('tutorial.citation.back', 'span', ' id="tutorial-backlink-label" class="tutorial-visually-hidden"')}
    <ol class="tutorial-reference-list">${entries}</ol>
  </section>`;
  return { html: html + '\n' + bibliography, referenceCount: used.length, citationCount };
}
