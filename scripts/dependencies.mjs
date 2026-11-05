import assert from 'node:assert/strict';
import '../js/dependency-formats.js';
import { escapeHtml as esc } from './locales.mjs';

export const { formats, snippet, downloadUrl } = globalThis.SiteDependencyFormats;

export function validateDependency(dependency) {
  for (const key of ['groupId', 'artifactId']) assert(typeof dependency[key] === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/.test(dependency[key]), `Invalid dependency ${key}.`);
  assert(['published', 'source'].includes(dependency.status), 'Unknown dependency publication status.');
  assert(Array.isArray(dependency.versions) && dependency.versions.length, 'Dependency versions are required.');
  assert.equal(new Set(dependency.versions).size, dependency.versions.length, 'Duplicate dependency versions.');
  assert(dependency.versions.every(v => typeof v === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/.test(v)), 'Invalid dependency version.');
  assert(dependency.versions.includes(dependency.defaultVersion), 'Default dependency version is missing.');
  assert(/^\d{4}-\d{2}-\d{2}$/.test(dependency.checkedAt), 'Missing dependency verification date.');
  assert.equal(new URL(dependency.sourceUrl).protocol, 'https:', 'Dependency evidence must use HTTPS.');
}

export function dependencyWidget(project, dict) {
  const d = project.dependency;
  validateDependency(d);
  const id = `${project.slug}-dependency`;
  const text = key => { assert(Object.hasOwn(dict, key), `Missing translation ${key}`); return esc(dict[key]); };
  const t = key => `<span data-i18n="${key}">${text(key)}</span>`;
  const external = (url, content, attrs = '') => `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer"${attrs}>${content} <span aria-hidden="true">↗</span></a>`;
  const published = d.status === 'published';
  const tabs = [...formats, { id: 'download', label: 'Download' }];
  return `<div class="dependency-widget" data-dependency data-group-id="${esc(d.groupId)}" data-artifact-id="${esc(d.artifactId)}" data-release-status="${d.status}">
    <div class="dependency-heading"><div><p class="dependency-kicker">INSTALL / ${esc(project.name)}</p><h3 data-i18n="dependency.heading">${text('dependency.heading')}</h3></div><label class="dependency-version" hidden>${t('dependency.version')}<select data-dependency-version translate="no" class="notranslate"${d.versions.length === 1 ? ' disabled' : ''}>${d.versions.map(v => `<option value="${esc(v)}"${v === d.defaultVersion ? ' selected' : ''}>${esc(v)}</option>`).join('')}</select></label></div>
    <p class="dependency-notice${published ? '' : ' dependency-notice-source'}" id="${id}-notice">${t(published ? 'dependency.published' : 'dependency.source')} <span class="dependency-checked">${t('dependency.checked')} <time datetime="${d.checkedAt}">${d.checkedAt}</time></span></p>
    <div class="dependency-tabs" role="tablist" aria-label="${text('dependency.formats')}" data-i18n-aria-label="dependency.formats" hidden>${tabs.map(f => `<button type="button" role="tab" id="${id}-tab-${f.id}" aria-controls="${id}-panel-${f.id}" aria-selected="${f.id === 'maven'}" tabindex="${f.id === 'maven' ? '0' : '-1'}" data-dependency-tab="${f.id}" translate="no" class="notranslate">${f.label}</button>`).join('')}</div>
    ${formats.map(f => `<section class="dependency-panel" id="${id}-panel-${f.id}" data-dependency-panel="${f.id}">
      <div class="dependency-toolbar"><h4 translate="no" class="notranslate">${f.label} <span>· ${f.file}</span></h4><button type="button" class="dependency-copy" data-dependency-copy hidden>${t('dependency.copy')}<span aria-hidden="true"> ⧉</span></button></div>
      <pre class="code-example" tabindex="0" aria-label="${f.label}" aria-describedby="${id}-notice"><code translate="no" class="notranslate">${esc(snippet(f.id, d.groupId, d.artifactId, d.defaultVersion))}</code></pre>
      <p class="dependency-help" data-i18n="dependency.${f.id}Help">${text(`dependency.${f.id}Help`)}</p>
    </section>`).join('\n')}
    <section class="dependency-panel dependency-download" id="${id}-panel-download" data-dependency-panel="download"><h4 translate="no">Download</h4><p data-i18n="${published ? 'dependency.downloadHelp' : 'dependency.noDownload'}">${text(published ? 'dependency.downloadHelp' : 'dependency.noDownload')}</p><div class="dependency-download-links">${published ? ['jar', 'pom'].map(ext => external(downloadUrl(d.groupId, d.artifactId, d.defaultVersion, ext), `<span translate="no" class="notranslate">${esc(d.artifactId)}-${esc(d.defaultVersion)}.${ext}</span>`, ` data-dependency-download="${ext}"`)).join('') : external(project.repository + '#readme', t('dependency.readme'))}</div></section>
    <div class="dependency-footer"><p class="dependency-feedback" role="status" aria-live="polite" aria-atomic="true" data-dependency-feedback></p>${external(d.sourceUrl, t(published ? 'dependency.versionsSource' : 'dependency.pomSource'))}</div>
    <noscript><p class="dependency-help" data-i18n="dependency.noScript">${text('dependency.noScript')}</p></noscript>
  </div>`;
}
