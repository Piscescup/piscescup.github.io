// Optional execution check. No downloads: supply existing dependencies and LINQ source/classes.
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readdir, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { loadExamples } from './examples.mjs';
import { root } from './site-files.mjs';

const commonsClasspath = process.env.EXAMPLE_COMMONS_CLASSPATH;
const linqClasspath = process.env.EXAMPLE_LINQ_CLASSPATH;
const linqSource = process.env.EXAMPLE_LINQ_SOURCE;
assert(commonsClasspath, 'Set EXAMPLE_COMMONS_CLASSPATH to existing Commons Lib and required dependency JARs.');
assert(linqClasspath || linqSource, 'Set EXAMPLE_LINQ_SOURCE (src/main/java) or EXAMPLE_LINQ_CLASSPATH.');
const output = await mkdtemp(path.join(os.tmpdir(), 'piscescup-readme-examples-'));
const groups = await loadExamples();
function run(command, args) {
  const result = spawnSync(command, args, { encoding: 'utf8', windowsHide: true });
  assert.ifError(result.error);
  assert.equal(result.status, 0, result.stdout + result.stderr);
  return result.stdout.replaceAll('\r\n', '\n').trim();
}
async function compile(name, files, classpath, release) {
  const destination = path.join(output, name);
  await mkdir(destination);
  const argFile = path.join(output, name + '.args');
  const args = ['--release', release, '-encoding', 'UTF-8', '-proc:none', '-classpath', classpath, '-d', destination, ...files];
  await writeFile(argFile, args.map(arg => '"' + arg.replaceAll('\\', '/') + '"').join('\n'));
  run('javac', ['@' + argFile]);
  return destination;
}
let linqClasses = linqClasspath || '';
if (linqSource) {
  async function sources(directory) {
    const results = [];
    for (const item of await readdir(directory, { withFileTypes: true })) {
      if (item.isSymbolicLink()) continue;
      const file = path.join(directory, item.name);
      if (item.isDirectory()) results.push(...await sources(file));
      else if (item.name.endsWith('.java') && item.name !== 'module-info.java') results.push(file);
    }
    return results;
  }
  linqClasses = await compile('linq-library', await sources(linqSource), commonsClasspath, '25');
}
for (const [slug, group] of Object.entries(groups)) {
  const classpath = slug === 'commons-lib' ? commonsClasspath : [linqClasses, commonsClasspath].join(path.delimiter);
  const classes = await compile(slug, group.items.map(item => path.join(root, item.file)), classpath, slug === 'commons-lib' ? '21' : '25');
  for (const item of group.items) {
    const actual = run('java', ['-classpath', [classes, classpath].join(path.delimiter), item.className]);
    assert.equal(actual, item.output, slug + '/' + item.className + ': output differs from the page.');
    console.log('PASS ' + slug + '/' + item.className);
  }
}
console.log('All README examples compiled and produced the documented output. Temporary classes: ' + output);
