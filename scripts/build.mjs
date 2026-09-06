import { cp, lstat, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { root, publicFiles } from './site-files.mjs';

const output = path.resolve(root, 'dist');
const files = await publicFiles();
// Verify the exact output before clearing it, and never follow a replaced symlink.
if (path.dirname(output) !== path.resolve(root) || path.basename(output) !== 'dist') {
  throw new Error('The build output must be the project dist directory.');
}
const previous = await lstat(output).catch((error) => {
  if (error.code !== 'ENOENT') throw error;
});
if (previous?.isSymbolicLink()) throw new Error('Refusing to replace a linked build directory.');
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
for (const entry of files) {
  const target = path.join(output, entry);
  await mkdir(path.dirname(target), { recursive: true });
  await cp(path.join(root, entry), target);
}
console.log(`Built ${files.filter((file) => file.endsWith('.html')).length} HTML pages and shared assets in dist.`);
