import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { root } from './site-files.mjs';
import { escapeHtml as esc } from './locales.mjs';

export async function loadExamples() {
  const groups = JSON.parse(await readFile(path.join(root, 'data/examples.json'), 'utf8'));
  for (const [slug, group] of Object.entries(groups)) {
    assert(/^[a-z0-9-]+$/.test(slug), 'Invalid example project.');
    assert.equal(new URL(group.readmeUrl).origin, 'https://github.com', 'Examples must link to their source README.');
    assert(group.items.length && new Set(group.items.map(item => item.id)).size === group.items.length, 'Missing or duplicate examples.');
    for (const item of group.items) {
      assert(/^[a-z0-9-]+$/.test(item.id) && /^[a-z0-9-]+$/.test(item.anchor), 'Invalid example anchor.');
      assert(/^[A-Z][a-zA-Z0-9]*$/.test(item.className), 'Invalid example class.');
      assert(typeof item.output === 'string' && item.output.trim(), 'Missing example output.');
      item.file = `examples/${slug}/${item.className}.java`;
      item.code = (await readFile(path.join(root, item.file), 'utf8')).replaceAll('\r\n', '\n').trimEnd();
      assert(item.code.includes(`public class ${item.className} {`) && item.code.includes('public static void main(String[] args)'), 'Examples must be standalone Java classes.');
    }
  }
  return groups;
}

export function renderExamples(group, dict) {
  const text = key => { assert(Object.hasOwn(dict, key), `Missing example translation: ${key}`); return esc(dict[key]); };
  const t = key => `<span data-i18n="${key}">${text(key)}</span>`;
  return `<p data-i18n="${group.introKey}">${text(group.introKey)}</p>
    <p class="examples-intro" data-i18n="examples.runHint">${text('examples.runHint')}</p>
    <p class="examples-checked">${t('examples.checked')} <time datetime="${group.checkedAt}">${group.checkedAt}</time></p>
    <div class="readme-examples">${group.items.map((item, index) => `<details class="readme-example" data-example="${item.id}"${index === 0 ? ' open' : ''}>
      <summary id="example-${item.id}"><span class="example-number" aria-hidden="true">${String(index + 1).padStart(2, '0')}</span>${t(item.titleKey)}<span class="example-toggle" aria-hidden="true">+</span></summary>
      <div class="example-body"><p data-i18n="${item.descriptionKey}">${text(item.descriptionKey)}</p>
        <div class="example-toolbar"><span translate="no" class="notranslate">${item.className}.java</span><button class="dependency-copy" type="button" data-example-copy hidden>${t('examples.copy')}<span aria-hidden="true"> ⧉</span></button></div>
        <pre class="code-example" tabindex="0" aria-labelledby="example-${item.id}"><code translate="no" class="notranslate" data-example-code>${esc(item.code)}</code></pre>
        <p class="example-feedback" role="status" aria-live="polite" aria-atomic="true" data-example-feedback></p>
        <h3 class="example-output-label" id="example-${item.id}-output" data-i18n="examples.output">${text('examples.output')}</h3>
        <pre class="example-output" tabindex="0" aria-labelledby="example-${item.id}-output"><code translate="no" class="notranslate">${esc(item.output)}</code></pre>
        <a class="example-source" href="${esc(group.readmeUrl)}#${item.anchor}" target="_blank" rel="noopener noreferrer">${t('examples.source')} <span aria-hidden="true">↗</span></a>
      </div>
    </details>`).join('\n')}</div>`;
}
