import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { formats, snippet, downloadUrl, validateDependency, dependencyWidget } from './dependencies.mjs';
import { loadLocales } from './locales.mjs';

const projects = JSON.parse(await readFile(new URL('../data/projects.json', import.meta.url), 'utf8'));
const dictionaries = await loadLocales();
const example = { groupId: 'io.github.example', artifactId: 'sample', defaultVersion: '1.2.3', versions: ['1.2.3'], status: 'published', checkedAt: '2026-09-07', sourceUrl: 'https://example.com/versions' };

test('build-tool syntax and coordinates are exact', () => {
  assert.deepEqual(formats.map(f => f.id), ['maven', 'gradle', 'kotlin', 'ivy']);
  assert.equal(snippet('maven', example.groupId, example.artifactId, example.defaultVersion), '<dependency>\n    <groupId>io.github.example</groupId>\n    <artifactId>sample</artifactId>\n    <version>1.2.3</version>\n</dependency>');
  assert.equal(snippet('gradle', example.groupId, example.artifactId, example.defaultVersion), "repositories {\n    mavenCentral()\n}\n\ndependencies {\n    implementation 'io.github.example:sample:1.2.3'\n}");
  assert.equal(snippet('kotlin', example.groupId, example.artifactId, example.defaultVersion), 'repositories {\n    mavenCentral()\n}\n\ndependencies {\n    implementation("io.github.example:sample:1.2.3")\n}');
  assert.equal(snippet('ivy', example.groupId, example.artifactId, example.defaultVersion), '<dependency org="io.github.example" name="sample" rev="1.2.3" conf="default->default" />');
  assert.throws(() => snippet('unknown', 'group', 'artifact', '1'));
});

test('invalid or unsafe dependency metadata is rejected', () => {
  validateDependency(example);
  for (const change of [
    { groupId: 'bad/<group>' }, { artifactId: '../artifact' }, { artifactId: '..' }, { groupId: undefined },
    { versions: [] }, { versions: ['1.2.3', '1.2.3'] }, { versions: ['1.2.3"'] }, { versions: ['..'] },
    { defaultVersion: '9.9.9' }, { status: 'unknown' }, { sourceUrl: 'javascript:alert(1)' }
  ]) assert.throws(() => validateDependency({ ...example, ...change }), JSON.stringify(change));
});

test('every configured version renders in every format and uses protected code', () => {
  for (const project of projects.filter(p => p.dependency)) {
    const d = project.dependency;
    validateDependency(d);
    for (const version of d.versions) for (const format of formats) {
      assert(snippet(format.id, d.groupId, d.artifactId, version).includes(version));
    }
    for (const dict of Object.values(dictionaries)) {
      const html = dependencyWidget(project, dict);
      assert.equal([...html.matchAll(/<code translate="no" class="notranslate">/g)].length, 4);
      assert.equal([...html.matchAll(/data-dependency-download=/g)].length, d.status === 'published' ? 2 : 0);
      assert(html.includes('<noscript>'));
    }
  }
});

test('downloads follow the Maven Central layout', () => {
  assert.equal(downloadUrl('io.github.piscescup', 'commons-lib', '1.1.6', 'jar'), 'https://repo.maven.apache.org/maven2/io/github/piscescup/commons-lib/1.1.6/commons-lib-1.1.6.jar');
});
