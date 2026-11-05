import test from 'node:test';
import assert from 'node:assert/strict';
import { renderTutorialReferences } from './tutorial-references.mjs';
import { translateHtml } from './locales.mjs';

const dictionary = {
  'tutorial.bibliography': '参考文献',
  'tutorial.citation.open': '查看参考文献',
  'tutorial.citation.back': '返回正文',
  'a.title': '文档 A',
  'b.title': '文档 B',
  paragraph: '正文'
};
const sources = [
  { id: 'a', publisher: 'Publisher A', url: 'https://example.org/a', titleKey: 'a.title' },
  { id: 'b', publisher: 'Publisher B', url: 'https://example.org/b', titleKey: 'b.title' }
];

test('numbers follow first appearance and translated paragraphs keep the superscripts', () => {
  const { html, referenceCount } = renderTutorialReferences('<p data-i18n="paragraph" data-cite="b a">正文</p>', sources, dictionary);
  assert.equal(referenceCount, 2);
  assert.match(html, /href="#ref-b"[^>]*>\[1\]/);
  assert.match(html, /href="#ref-a"[^>]*>\[2\]/);
  const translated = translateHtml(html, { ...dictionary, paragraph: 'Translated text' });
  assert.match(translated, /<p><span data-i18n="paragraph">Translated text<\/span><sup/);
  assert.match(translated, /href="#ref-b"/);
});

test('repeat sources and URL aliases share an entry with a return link for every occurrence', () => {
  const aliases = [...sources, { ...sources[0], id: 'a-alias', url: sources[0].url + '#section' }];
  const { html, referenceCount, citationCount } = renderTutorialReferences('<p data-cite="a">One</p><p data-cite="a-alias a">Two</p>', aliases, dictionary);
  assert.equal(referenceCount, 1);
  assert.equal(citationCount, 2);
  assert.equal([...html.matchAll(/data-reference="1"/g)].length, 1);
  for (const id of ['cite-a-1', 'cite-a-2']) {
    assert(html.includes(`id="${id}"`));
    assert(html.includes(`href="#${id}"`));
  }
});

test('table cells and untranslated menu paths can carry precise citations', () => {
  const body = '<td data-i18n="paragraph" data-cite="a">正文</td><dd lang="en" translate="no" data-cite="b">Settings → Updates</dd>';
  const { html, citationCount } = renderTutorialReferences(body, sources, dictionary);
  assert.equal(citationCount, 2);
  assert.match(html, /<dd lang="en" translate="no">Settings → Updates<sup/);
  assert(!html.includes('data-cite='));
});

test('missing or unsafe references stop generation instead of publishing broken citations', () => {
  assert.throws(() => renderTutorialReferences('<p data-cite="missing">Text</p>', sources, dictionary), /Unknown reference/);
  assert.throws(() => renderTutorialReferences('<div data-cite="a">Text</div>', sources, dictionary), /unsupported/);
  assert.throws(() => renderTutorialReferences('', [{ ...sources[0], url: 'javascript:alert(1)' }], dictionary), /Invalid reference URL/);
});
